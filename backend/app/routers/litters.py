from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import Buyer, Litter, Puppy, BuyerLitterMatch, Dog, DepositPayment, Contract
from app.schemas import LitterCreate, LitterUpdate, LitterOut, PuppyCreate, PuppyOut
from app.routers.auth import get_active_user as get_current_user
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
            detail="Free plan limited to 1 active litter. Start a Starter or Pro trial for unlimited litters."
        )

    for dog_id, sex in [(data.dam_id, "female"), (data.sire_id, "male")]:
        if dog_id:
            dog = db.query(Dog).filter(Dog.id == dog_id, Dog.owner_id == current_user.id, Dog.is_active == True).first()
            if not dog or dog.sex != sex:
                raise HTTPException(404, f"{sex.title()} parent not found")
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
    values = data.model_dump(exclude_unset=True)
    for required in ("breed", "status", "num_males", "num_females", "waitlist_open"):
        if required in values and values[required] is None:
            raise HTTPException(422, f"{required} cannot be empty")
    for field, sex in [("dam_id", "female"), ("sire_id", "male")]:
        if values.get(field) and not db.query(Dog).filter(Dog.id == values[field], Dog.owner_id == current_user.id, Dog.sex == sex, Dog.is_active == True).first():
            raise HTTPException(404, f"{sex.title()} parent not found")
    for field, value in values.items():
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
    if db.query(DepositPayment).filter(DepositPayment.litter_id == litter_id).first():
        raise HTTPException(400, "Litters with deposit records must be retained")
    if db.query(Contract).filter(Contract.litter_id == litter_id).first():
        raise HTTPException(400, "Litters with contracts must be retained. Remove the contracts first.")
    db.query(BuyerLitterMatch).filter(BuyerLitterMatch.litter_id == litter_id).delete(synchronize_session=False)
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

    online_buyers = {buyer_id for (buyer_id,) in db.query(DepositPayment.buyer_id).filter(
        DepositPayment.litter_id == litter_id,
        DepositPayment.status.in_(("pending", "paid")),
    )}

    online_buyers.update(m.buyer_id for m in matches if m.stripe_payment_intent_id)

    return [
        {
            "position": m.position,
            "buyer_id": m.buyer_id,
            "buyer_name": m.buyer.full_name if m.buyer else None,
            "buyer_email": m.buyer.email if m.buyer else None,
            "deposit_paid": m.deposit_paid,
            "online_deposit": m.buyer_id in online_buyers,
            "match_score": m.match_score,
            "puppy_id": m.puppy_id,
        }
        for m in matches
    ]


@router.put("/{litter_id}/waitlist/{buyer_id}/deposit", status_code=204)
def record_waitlist_deposit(
    litter_id: str,
    buyer_id: str,
    deposit_paid: bool = Body(embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    litter = db.query(Litter).filter(
        Litter.id == litter_id, Litter.breeder_id == current_user.id
    ).with_for_update().first()
    if not litter:
        raise HTTPException(404, "Litter not found")
    buyer = db.query(Buyer.id).filter_by(id=buyer_id, breeder_id=current_user.id).first()
    if not buyer:
        raise HTTPException(404, "Buyer not found")
    matches = db.query(BuyerLitterMatch).filter_by(
        litter_id=litter_id, buyer_id=buyer_id
    ).with_for_update().all()
    if not matches:
        raise HTTPException(404, "Buyer is not on this litter's waitlist")

    online_payment = db.query(DepositPayment.id).filter(
        DepositPayment.litter_id == litter_id,
        DepositPayment.buyer_id == buyer_id,
        DepositPayment.status.in_(("pending", "paid")),
    ).first()
    if online_payment or any(match.stripe_payment_intent_id for match in matches):
        raise HTTPException(409, "This deposit is tracked through Stripe.")

    for match in matches:
        match.deposit_paid = deposit_paid
    db.commit()
