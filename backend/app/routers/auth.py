from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
import time

from app.database import get_db
from app.models import User
from app.schemas import UserRegister, UserLogin, Token, UserOut, UserUpdate, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.config import settings

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Simple in-memory rate limiting for login attempts.
# Note: resets on server restart/redeploy since it's not backed by Redis —
# this is a baseline deterrent against casual brute-forcing, not a hardened
# defense against a sustained distributed attack.
_login_attempts: dict[str, list[float]] = {}
_LOGIN_MAX_ATTEMPTS = 8
_LOGIN_WINDOW_SECONDS = 300  # 5 minutes


def _check_login_rate_limit(key: str):
    now = time.time()
    attempts = [t for t in _login_attempts.get(key, []) if now - t < _LOGIN_WINDOW_SECONDS]
    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please wait a few minutes and try again.",
        )
    attempts.append(now)
    _login_attempts[key] = attempts


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=Token)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        # An account exists, but if it never actually completed checkout
        # (no active subscription, no trial ever granted), it's not a real
        # account someone is using — it's a burned email from an abandoned
        # signup. Treat this as a restart rather than a hard conflict:
        # update it with the new details and let them try again.
        if not existing.subscription_active and not existing.trial_ends_at:
            existing.hashed_password = hash_password(data.password)
            existing.full_name = data.full_name
            existing.kennel_name = data.kennel_name
            existing.breeds = data.breeds or []
            db.commit()
            db.refresh(existing)
            token = create_access_token({"sub": existing.id})
            return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(existing)}

        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        kennel_name=data.kennel_name,
        breeds=data.breeds or [],
        subscription_plan="free",
        subscription_active=False,
    )
    # No trial is granted here anymore. Registration just creates the
    # account; the frontend immediately sends the user to Stripe Checkout
    # to pick Starter or Pro and start their 7-day trial with a card on
    # file. trial_ends_at gets set from the real Stripe subscription once
    # checkout completes (see the webhook handler in payments.py) — that
    # way Stripe's trial date is always the source of truth, not ours.

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@router.post("/login", response_model=Token)
def login(data: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    _check_login_rate_limit(f"{client_ip}:{data.email.lower()}")

    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", status_code=204)
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    if len(data.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()


@router.post("/forgot-password", status_code=204)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        from app.services import email_service
        reset_token = str(uuid.uuid4())
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        reset_url = f"https://litterdesk.vercel.app/reset-password/{reset_token}"
        email_service.send_email(
            to=user.email,
            subject="Reset your LitterDesk password",
            body=f"Click the link below to reset your password. This link expires in 1 hour.\n\n{reset_url}\n\nIf you didn't request this, you can safely ignore this email.",
        )
    return


@router.post("/reset-password", status_code=204)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == data.token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(400, "Invalid or expired reset link")
    if len(data.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()


@router.put("/me", response_model=UserOut)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    update_data = data.model_dump(exclude_none=True)
    if "email" in update_data and update_data["email"] != current_user.email:
        existing = db.query(User).filter(User.email == update_data["email"]).first()
        if existing:
            raise HTTPException(400, "That email is already in use.")
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
