from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import Litter, Puppy, BuyerLitterMatch
from app.schemas import LitterCreate, LitterUpdate, LitterOut, PuppyCreate, PuppyOut
from app.routers.auth import get_current_user
from app.models import User

router = APIRouter()


def check_litter_access(litter_id: str, user: User, db: Session) -> Litter:
    litter = db.query(Litter).filter(
        Litter.id == litter_id,
        Litter.breeder_id == user.id
    ).first()
    if not litter:
        raise HTTPException(status_code=404, detail="Litter not found")
    return litter


@router.get("/", response_model=List[LitterOut])
def list_litters(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Litter).filter(Litter.breeder_id == current_user.id)
    if status:
        query = query.filter(Litter.status == status)
    return query.order_by(Litter.created_at.desc()).all()


@router.post("/", response_model=LitterOut, status_code=201)
def create_litter(
    data: LitterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check plan limits
    active_count = db.query(Litter).filter(
        Litter.breeder_id == current_user.id,
        Litter.status.in_(["planned", "pregnant", "born", "weaning", "ready"])
    ).count()

    if current_user.subscription_plan == "free" and active_count >= 1:
        raise HTTPException(
            status_code=403,
            detail="Free plan limited to 1 active litter. Upgrade to Pro for unlimited litters."
        )
    if current_user.subscription_plan == "starter" and active_count >= 2:
        raise HTTPException(
            status_code=403,
            detail="Starter plan limited to 2 active litters. Upgrade to Pro for unlimited."
        )

    litter = Litter(id=str(uuid.uuid4()), breeder_id=current_user.id, **data.model_dump())
    db.add(litter)
    db.commit()
    db.refresh(litter)
    return litter


@router.get("/{litter_id}", response_model=LitterOut)
def get_litter(
    litter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return check_litter_access(litter_id, current_user, db)


@router.put("/{litter_id}", response_model=LitterOut)
def update_litter(
    litter_id: str,
    data: LitterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    litter = check_litter_access(litter_id, current_user, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(litter, field, value)
    db.commit()
    db.refresh(litter)
    return litter


@router.delete("/{litter_id}", status_code=204)
def delete_litter(
    litter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    litter = check_litter_access(litter_id, current_user, db)
    db.delete(litter)
    db.commit()


# ─── Puppies within a Litter ──────────────────────────────────────────────────

@router.get("/{litter_id}/puppies", response_model=List[PuppyOut])
def list_puppies(
    litter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_litter_access(litter_id, current_user, db)
    return db.query(Puppy).filter(Puppy.litter_id == litter_id).all()


@router.post("/{litter_id}/puppies", response_model=PuppyOut, status_code=201)
def add_puppy(
    litter_id: str,
    data: PuppyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    litter = check_litter_access(litter_id, current_user, db)
    puppy = Puppy(id=str(uuid.uuid4()), litter_id=litter_id, **data.model_dump())
    db.add(puppy)
    db.commit()
    db.refresh(puppy)
    return puppy


@router.get("/{litter_id}/waitlist")
def get_waitlist(
    litter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_litter_access(litter_id, current_user, db)
    matches = db.query(BuyerLitterMatch).filter(
        BuyerLitterMatch.litter_id == litter_id
    ).order_by(BuyerLitterMatch.position).all()

    return [
        {
            "position": m.position,
            "buyer_id": m.buyer_id,
            "buyer_name": m.buyer.full_name if m.buyer else None,
            "buyer_email": m.buyer.email if m.buyer else None,
            "deposit_paid": m.deposit_paid,
            "match_score": m.match_score,
            "puppy_id": m.puppy_id,
        }
        for m in matches
    ]
