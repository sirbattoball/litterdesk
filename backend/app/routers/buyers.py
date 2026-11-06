from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone

from app.database import get_db
from app.models import Buyer, Communication, BuyerLitterMatch, Litter
from app.schemas import BuyerCreate, BuyerUpdate, BuyerOut
from app.routers.auth import get_active_user as get_current_user
from app.models import User

router = APIRouter()


@router.get("/", response_model=List[BuyerOut])
def list_buyers(
    status: Optional[str] = None,
    breed: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Buyer).filter(Buyer.breeder_id == current_user.id)
    if status:
        query = query.filter(Buyer.status == status)
    if breed:
        query = query.filter(Buyer.breed_preference == breed)
    if search:
        query = query.filter(
            Buyer.full_name.ilike(f"%{search}%") |
            Buyer.email.ilike(f"%{search}%")
        )
    return query.order_by(Buyer.priority_score.desc(), Buyer.created_at.desc()).all()


@router.post("/", response_model=BuyerOut, status_code=201)
def create_buyer(
    data: BuyerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check for duplicate
    existing = db.query(Buyer).filter(
        Buyer.breeder_id == current_user.id,
        func.lower(Buyer.email) == data.email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Buyer with this email already exists")

    buyer = Buyer(
        id=str(uuid.uuid4()),
        breeder_id=current_user.id,
        **data.model_dump()
    )
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer


@router.get("/{buyer_id}", response_model=BuyerOut)
def get_buyer(
    buyer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buyer = db.query(Buyer).filter(
        Buyer.id == buyer_id,
        Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    return buyer


@router.put("/{buyer_id}", response_model=BuyerOut)
def update_buyer(
    buyer_id: str,
    data: BuyerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buyer = db.query(Buyer).filter(
        Buyer.id == buyer_id, Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    values = data.model_dump(exclude_unset=True)
    if "email" in values and db.query(Buyer).filter(Buyer.breeder_id == current_user.id, Buyer.id != buyer_id, func.lower(Buyer.email) == values["email"]).first():
        raise HTTPException(400, "Buyer with this email already exists")
    if values.get("sex_preference") not in (None, "", "male", "female", "either", "any"):
        raise HTTPException(422, "Choose male, female, or leave sex preference blank")
    for required in ("email", "full_name", "status", "priority_score"):
        if required in values and values[required] is None:
            raise HTTPException(422, f"{required} cannot be empty")
    low = values.get("budget_min", buyer.budget_min)
    high = values.get("budget_max", buyer.budget_max)
    if low is not None and high is not None and low > high:
        raise HTTPException(422, "Minimum budget cannot exceed maximum budget")
    for field, value in values.items():
        setattr(buyer, field, value)
    db.commit()
    db.refresh(buyer)
    return buyer


@router.post("/{buyer_id}/add-to-waitlist")
def add_to_waitlist(
    buyer_id: str,
    litter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buyer = db.query(Buyer).filter(
        Buyer.id == buyer_id, Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    litter = db.query(Litter).filter(
        Litter.id == litter_id, Litter.breeder_id == current_user.id
    ).with_for_update().first()
    if not litter:
        raise HTTPException(status_code=404, detail="Litter not found")

    if not litter.waitlist_open:
        raise HTTPException(400, "This litter waitlist is closed")

    # Serialize additions on the litter row and make retries idempotent.
    existing = db.query(BuyerLitterMatch).filter(
        BuyerLitterMatch.buyer_id == buyer_id,
        BuyerLitterMatch.litter_id == litter_id,
    ).first()
    if existing:
        return {"message": "Already on waitlist", "position": existing.position}

    # Get next position
    current_count = db.query(BuyerLitterMatch).filter(
        BuyerLitterMatch.litter_id == litter_id
    ).count()

    match = BuyerLitterMatch(
        id=str(uuid.uuid4()),
        buyer_id=buyer_id,
        litter_id=litter_id,
        position=current_count + 1,
    )
    if buyer.status in ("inquiry", "declined"):
        buyer.status = "waitlisted"
    db.add(match)
    db.commit()
    return {"message": "Added to waitlist", "position": current_count + 1}


@router.get("/{buyer_id}/communications")
def get_communications(
    buyer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buyer = db.query(Buyer).filter(
        Buyer.id == buyer_id, Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    comms = db.query(Communication).filter(
        Communication.buyer_id == buyer_id
    ).order_by(Communication.sent_at.desc()).all()

    return [
        {
            "id": c.id,
            "channel": c.channel,
            "direction": c.direction,
            "subject": c.subject,
            "body": c.body,
            "sent_at": c.sent_at,
            "ai_generated": c.ai_generated,
        }
        for c in comms
    ]


class ContactLog(BaseModel):
    channel: Literal["email", "sms", "note", "phone"]
    direction: Literal["inbound", "outbound"]
    body: str = Field(min_length=1, max_length=10000)
    subject: Optional[str] = None


@router.post("/{buyer_id}/log-contact")
def log_contact(
    buyer_id: str,
    data: ContactLog,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buyer = db.query(Buyer).filter(
        Buyer.id == buyer_id, Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    if not data.body.strip():
        raise HTTPException(422, "Contact note cannot be blank")
    comm = Communication(
        id=str(uuid.uuid4()),
        buyer_id=buyer_id,
        channel=data.channel,
        direction=data.direction,
        subject=data.subject,
        body=data.body.strip(),
    )
    buyer.last_contacted = datetime.now(timezone.utc)
    db.add(comm)
    db.commit()
    return {"message": "Contact logged"}

@router.delete("/{buyer_id}", status_code=204)
def delete_buyer(
    buyer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buyer = db.query(Buyer).filter(
        Buyer.id == buyer_id,
        Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(404, "Buyer not found")
    from app.models import Contract, DepositPayment
    if db.query(DepositPayment).filter(DepositPayment.buyer_id == buyer_id).first():
        raise HTTPException(400, "Buyers with deposit records must be retained")
    contract_count = db.query(Contract).filter(Contract.buyer_id == buyer_id).count()
    if contract_count > 0:
        raise HTTPException(
            400,
            f"Cannot delete buyer with {contract_count} contract(s) on file. "
            "Void or delete the associated contract(s) first."
        )
    db.query(BuyerLitterMatch).filter(BuyerLitterMatch.buyer_id == buyer_id).delete(synchronize_session=False)
    db.delete(buyer)
    db.commit()


@router.get("/{buyer_id}/waitlists")
def buyer_waitlists(buyer_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Buyer).filter(Buyer.id == buyer_id, Buyer.breeder_id == current_user.id).first():
        raise HTTPException(404, "Buyer not found")
    rows = db.query(BuyerLitterMatch, Litter).join(Litter, Litter.id == BuyerLitterMatch.litter_id).filter(BuyerLitterMatch.buyer_id == buyer_id, Litter.breeder_id == current_user.id).all()
    return [{"litter_id": litter.id, "litter_name": litter.name or litter.breed, "position": match.position, "deposit_paid": match.deposit_paid} for match, litter in rows]
