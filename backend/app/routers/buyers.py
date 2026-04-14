from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from app.database import get_db
from app.models import Buyer, Communication, BuyerLitterMatch, Litter
from app.schemas import BuyerCreate, BuyerUpdate, BuyerOut
from app.routers.auth import get_current_user
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
        Buyer.email == data.email
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

    for field, value in data.model_dump(exclude_none=True).items():
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
    ).first()
    if not litter:
        raise HTTPException(status_code=404, detail="Litter not found")

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


@router.post("/{buyer_id}/log-contact")
def log_contact(
    buyer_id: str,
    channel: str,
    direction: str,
    body: str,
    subject: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    buyer = db.query(Buyer).filter(
        Buyer.id == buyer_id, Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    comm = Communication(
        id=str(uuid.uuid4()),
        buyer_id=buyer_id,
        channel=channel,
        direction=direction,
        subject=subject,
        body=body,
    )
    buyer.last_contacted = datetime.utcnow()
    db.add(comm)
    db.commit()
    return {"message": "Contact logged"}
