from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import User, Buyer, Litter, Contract
from app.routers.auth import get_current_user
from app.services import ai_service
import uuid
from datetime import datetime

router = APIRouter()


class ContractGenerateRequest(BaseModel):
    buyer_id: str
    litter_id: Optional[str] = None
    puppy_name: Optional[str] = None
    puppy_sex: str
    dob: str
    go_home_date: str
    sale_price: float
    deposit_amount: float
    balance_due_date: str
    spay_neuter_required: bool = True
    health_guarantee_months: int = 24


class FollowupRequest(BaseModel):
    buyer_id: str
    email_type: str
    context: str


class BuyerScoreRequest(BaseModel):
    buyer_id: str


class MatchRequest(BaseModel):
    litter_id: str


@router.post("/generate-contract")
def generate_contract(
    req: ContractGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an AI-written puppy sale contract."""
    if not current_user.subscription_active and current_user.subscription_plan not in ["pro", "kennel"]:
        raise HTTPException(403, "Contract generation requires Pro plan")

    buyer = db.query(Buyer).filter(
        Buyer.id == req.buyer_id,
        Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(404, "Buyer not found")

    litter = None
    if req.litter_id:
        litter = db.query(Litter).filter(
            Litter.id == req.litter_id,
            Litter.breeder_id == current_user.id
        ).first()

    # Generate contract via Claude
    contract_text = ai_service.generate_contract(
        breeder_name=current_user.full_name,
        kennel_name=current_user.kennel_name or f"{current_user.full_name}'s Kennel",
        buyer_name=buyer.full_name,
        buyer_address=f"{buyer.city}, {buyer.state}" if buyer.city else "Address TBD",
        breed=litter.breed if litter else buyer.breed_preference or "Mixed",
        puppy_name=req.puppy_name,
        puppy_sex=req.puppy_sex,
        dob=req.dob,
        sire_name=litter.sire.name if litter and litter.sire else "TBD",
        dam_name=litter.dam.name if litter and litter.dam else "TBD",
        sale_price=req.sale_price,
        deposit_amount=req.deposit_amount,
        balance_due_date=req.balance_due_date,
        go_home_date=req.go_home_date,
        health_guarantee_months=req.health_guarantee_months,
        spay_neuter_required=req.spay_neuter_required,
    )

    # Save contract
    sign_token = str(uuid.uuid4())
    contract = Contract(
        id=str(uuid.uuid4()),
        breeder_id=current_user.id,
        buyer_id=buyer.id,
        litter_id=req.litter_id,
        status="draft",
        title=f"Puppy Sale Contract — {buyer.full_name}",
        content=contract_text,
        sale_price=req.sale_price,
        deposit_amount=req.deposit_amount,
        balance_due=req.sale_price - req.deposit_amount,
        sign_token=sign_token,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    return {
        "contract_id": contract.id,
        "content": contract_text,
        "sign_token": sign_token,
        "message": "Contract generated successfully"
    }


@router.post("/score-buyer")
def score_buyer(
    req: BuyerScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI-score a buyer's fit and generate qualification notes."""
    buyer = db.query(Buyer).filter(
        Buyer.id == req.buyer_id,
        Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(404, "Buyer not found")

    result = ai_service.score_buyer(
        breed=buyer.breed_preference or "any breed",
        buyer_name=buyer.full_name,
        lifestyle_notes=buyer.lifestyle_notes or "No details provided",
        experience_level=buyer.experience_level or "unknown",
        sex_preference=buyer.sex_preference or "no preference",
        color_preference=buyer.color_preference,
        city=buyer.city or "Unknown",
        state=buyer.state or "Unknown",
    )

    # Update buyer record with AI score and notes
    buyer.priority_score = result["score"]
    buyer.ai_notes = result["summary"]
    db.commit()

    return result


@router.post("/draft-email")
def draft_email(
    req: FollowupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Draft a follow-up email to a buyer."""
    if not current_user.subscription_active and current_user.subscription_plan not in ["pro", "kennel"]:
        raise HTTPException(403, "Email drafting requires Pro plan")

    buyer = db.query(Buyer).filter(
        Buyer.id == req.buyer_id,
        Buyer.breeder_id == current_user.id
    ).first()
    if not buyer:
        raise HTTPException(404, "Buyer not found")

    result = ai_service.draft_followup_email(
        buyer_name=buyer.full_name,
        breeder_name=current_user.full_name,
        kennel_name=current_user.kennel_name or "our kennel",
        context=req.context,
        email_type=req.email_type,
    )
    return result


@router.post("/match-litter/{litter_id}")
def match_litter(
    litter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI-match buyers on waitlist to available puppies."""
    if not current_user.subscription_active:
        raise HTTPException(403, "AI matching requires active subscription")

    litter = db.query(Litter).filter(
        Litter.id == litter_id,
        Litter.breeder_id == current_user.id
    ).first()
    if not litter:
        raise HTTPException(404, "Litter not found")

    available_puppies = [
        {"collar": p.collar_color or p.id[:6], "sex": p.sex, "color": p.color or "unknown"}
        for p in litter.puppies if p.is_available and not p.is_keeper
    ]

    waitlisted_buyers = [
        {
            "name": m.buyer.full_name,
            "score": m.buyer.priority_score,
            "sex_pref": m.buyer.sex_preference or "any",
            "experience": m.buyer.experience_level or "unknown",
        }
        for m in sorted(litter.buyer_litter_matches, key=lambda x: x.position or 99)
        if m.buyer
    ]

    if not available_puppies or not waitlisted_buyers:
        return {"matches": [], "message": "No puppies or buyers to match"}

    matches = ai_service.match_buyers_to_litter(
        breed=litter.breed,
        litter_details=f"{litter.num_males} males, {litter.num_females} females, born {litter.whelp_date}",
        available_puppies=available_puppies,
        buyers=waitlisted_buyers,
    )
    return {"matches": matches}


@router.post("/litter-announcement/{litter_id}")
def litter_announcement(
    litter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a litter announcement for email/social media."""
    litter = db.query(Litter).filter(
        Litter.id == litter_id,
        Litter.breeder_id == current_user.id
    ).first()
    if not litter:
        raise HTTPException(404, "Litter not found")

    result = ai_service.generate_litter_update(
        breed=litter.breed,
        litter_name=litter.name or f"{litter.breed} Litter",
        whelp_date=str(litter.whelp_date) if litter.whelp_date else "recently",
        num_males=litter.num_males,
        num_females=litter.num_females,
        notes=litter.notes or "healthy, well-socialized puppies",
        photos_count=len(litter.photos or []),
    )
    return result
