from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, Litter, Buyer, Contract, BuyerLitterMatch
from app.routers.auth import get_current_user
from app.schemas import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_statuses = ["planned", "pregnant", "born", "weaning", "ready"]

    active_litters = db.query(Litter).filter(
        Litter.breeder_id == current_user.id,
        Litter.status.in_(active_statuses)
    ).count()

    total_buyers = db.query(Buyer).filter(
        Buyer.breeder_id == current_user.id
    ).count()

    buyers_with_deposit = db.query(BuyerLitterMatch).join(
        Litter, BuyerLitterMatch.litter_id == Litter.id
    ).filter(
        Litter.breeder_id == current_user.id,
        BuyerLitterMatch.deposit_paid == True
    ).count()

    available_puppies = db.query(Litter).filter(
        Litter.breeder_id == current_user.id,
        Litter.status.in_(["born", "weaning", "ready"])
    ).with_entities(
        func.sum(Litter.num_males + Litter.num_females)
    ).scalar() or 0

    contracts_pending = db.query(Contract).filter(
        Contract.breeder_id == current_user.id,
        Contract.status.in_(["sent", "draft"])
    ).count()

    follow_ups_due = db.query(Buyer).filter(
        Buyer.breeder_id == current_user.id,
        Buyer.follow_up_date <= datetime.utcnow() + timedelta(days=1),
        Buyer.follow_up_date >= datetime.utcnow() - timedelta(days=7),
    ).count()

    return DashboardStats(
        active_litters=active_litters,
        total_buyers=total_buyers,
        buyers_with_deposit=buyers_with_deposit,
        available_puppies=int(available_puppies),
        contracts_pending=contracts_pending,
        revenue_this_month=0.0,  # Would compute from Stripe in production
        follow_ups_due=follow_ups_due,
    )


@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recent_buyers = db.query(Buyer).filter(
        Buyer.breeder_id == current_user.id,
    ).order_by(Buyer.created_at.desc()).limit(5).all()

    recent_litters = db.query(Litter).filter(
        Litter.breeder_id == current_user.id
    ).order_by(Litter.updated_at.desc()).limit(3).all()

    activity = []
    for buyer in recent_buyers:
        activity.append({
            "type": "buyer_added",
            "description": f"New inquiry from {buyer.full_name}",
            "timestamp": buyer.created_at,
        })
    for litter in recent_litters:
        activity.append({
            "type": "litter_updated",
            "description": f"{litter.name or litter.breed + ' litter'} — {litter.status}",
            "timestamp": litter.updated_at,
        })

    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    return activity[:10]
