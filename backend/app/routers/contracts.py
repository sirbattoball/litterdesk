from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

from app.database import get_db
from app.models import User, Contract, Buyer
from app.schemas import ContractOut, ContractCreate
from app.routers.auth import get_current_user
from app.config import settings
from app.services import email_service

router = APIRouter()

FRONTEND_URL = "https://litterdesk.vercel.app"


@router.get("/", response_model=List[ContractOut])
def list_contracts(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Contract).filter(Contract.breeder_id == current_user.id)
    if status:
        query = query.filter(Contract.status == status)
    return query.order_by(Contract.created_at.desc()).all()


# PUBLIC signing routes MUST come before /{contract_id} to avoid collision

@router.get("/sign/{token}")
def get_contract_for_signing(token: str, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.sign_token == token).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    if contract.status in ["signed", "voided"]:
        raise HTTPException(400, f"Contract is already {contract.status}")
    return {
        "contract_id": contract.id,
        "title": contract.title,
        "content": contract.content,
        "buyer_name": contract.buyer.full_name if contract.buyer else None,
        "kennel_name": contract.breeder.kennel_name if contract.breeder else "Your Breeder",
        "breeder_name": contract.breeder.full_name if contract.breeder else "",
        "sale_price": contract.sale_price,
        "deposit_amount": contract.deposit_amount,
        "status": contract.status,
    }


@router.post("/sign/{token}")
def sign_contract(token: str, buyer_name: str, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.sign_token == token).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    if contract.status != "sent":
        raise HTTPException(400, "Contract cannot be signed in its current state")
    contract.status = "signed"
    contract.signed_at = datetime.utcnow()
    contract.buyer_signature = buyer_name
    if contract.buyer:
        contract.buyer.status = "contract_sent"
    db.commit()
    return {"message": "Contract signed successfully", "signed_at": contract.signed_at}


@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.breeder_id == current_user.id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    return contract


@router.post("/{contract_id}/send")
def send_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.breeder_id == current_user.id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    if not contract.buyer:
        raise HTTPException(400, "Contract has no buyer attached")
    if not contract.sign_token:
        contract.sign_token = str(uuid.uuid4())
    contract.status = "sent"
    contract.sent_at = datetime.utcnow()
    db.commit()
    sign_url = f"{FRONTEND_URL}/sign/{contract.sign_token}"
    if settings.RESEND_API_KEY:
        kennel = current_user.kennel_name or f"{current_user.full_name}'s Kennel"
        email_service.send_contract_email(
            buyer_email=contract.buyer.email,
            buyer_name=contract.buyer.full_name,
            breeder_name=current_user.full_name,
            kennel_name=kennel,
            sign_url=sign_url,
            puppy_details=contract.title or "your puppy",
        )
    return {"message": "Contract sent to buyer", "sign_url": sign_url}


@router.delete("/{contract_id}", status_code=204)
def void_contract(contract_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == contract_id, Contract.breeder_id == current_user.id).first()
    if not contract:
        raise HTTPException(404, "Contract not found")
    contract.status = "voided"
    db.commit()


@router.post("/", response_model=ContractOut)
def create_contract(data: ContractCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    buyer = db.query(Buyer).filter(Buyer.id == data.buyer_id, Buyer.breeder_id == current_user.id).first()
    if not buyer:
        raise HTTPException(404, "Buyer not found")
    contract = Contract(
        id=str(uuid.uuid4()),
        breeder_id=current_user.id,
        buyer_id=data.buyer_id,
        litter_id=data.litter_id,
        sale_price=data.sale_price,
        deposit_amount=data.deposit_amount,
        content=data.content,
        status="draft",
        title=f"Puppy Sale Agreement — {buyer.full_name}",
        sign_token=str(uuid.uuid4()),
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract
