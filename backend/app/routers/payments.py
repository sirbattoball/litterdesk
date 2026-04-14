from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import stripe
from app.config import settings
from app.database import get_db
from app.models import User, BuyerLitterMatch, Litter
from app.routers.auth import get_current_user
from datetime import datetime

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter()

PLAN_PRICES = {
    "starter": settings.STRIPE_PRICE_STARTER,
    "pro": settings.STRIPE_PRICE_PRO,
    "kennel": settings.STRIPE_PRICE_KENNEL,
}


@router.post("/create-subscription/{plan}")
def create_subscription(
    plan: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe subscription for the breeder."""
    if plan not in PLAN_PRICES:
        raise HTTPException(400, f"Invalid plan. Choose from: {list(PLAN_PRICES.keys())}")

    # Create or get Stripe customer
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name,
            metadata={"user_id": current_user.id}
        )
        current_user.stripe_customer_id = customer.id
        db.commit()

    # Create Stripe Checkout session
    session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": PLAN_PRICES[plan], "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.APP_URL}/dashboard?subscribed=true",
        cancel_url=f"{settings.APP_URL}/pricing",
        metadata={"user_id": current_user.id, "plan": plan},
    )
    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/create-portal")
def create_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe billing portal session for managing subscription."""
    if not current_user.stripe_customer_id:
        raise HTTPException(400, "No active subscription")

    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.APP_URL}/settings",
    )
    return {"portal_url": session.url}


@router.post("/collect-deposit")
def collect_deposit(
    buyer_id: str,
    litter_id: str,
    amount_cents: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Collect a deposit from a buyer via Stripe (breeder gets funds via Connect)."""
    if not current_user.stripe_onboarded:
        raise HTTPException(400, "Complete Stripe Connect setup to collect payments")

    litter = db.query(Litter).filter(
        Litter.id == litter_id, Litter.breeder_id == current_user.id
    ).first()
    if not litter:
        raise HTTPException(404, "Litter not found")

    # Create payment intent with application fee
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        transfer_data={"destination": current_user.stripe_account_id},
        application_fee_amount=int(amount_cents * 0.015),  # 1.5% platform fee
        metadata={
            "buyer_id": buyer_id,
            "litter_id": litter_id,
            "breeder_id": current_user.id,
        }
    )

    # Record the match
    match = db.query(BuyerLitterMatch).filter(
        BuyerLitterMatch.buyer_id == buyer_id,
        BuyerLitterMatch.litter_id == litter_id,
    ).first()
    if match:
        match.stripe_payment_intent_id = intent.id
        match.deposit_amount = amount_cents / 100
        db.commit()

    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
    }


@router.post("/stripe-connect/onboard")
def stripe_connect_onboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Onboard breeder to Stripe Connect for receiving payments."""
    if not current_user.stripe_account_id:
        account = stripe.Account.create(
            type="express",
            email=current_user.email,
            metadata={"user_id": current_user.id}
        )
        current_user.stripe_account_id = account.id
        db.commit()

    link = stripe.AccountLink.create(
        account=current_user.stripe_account_id,
        refresh_url=f"{settings.APP_URL}/settings/payments?refresh=true",
        return_url=f"{settings.APP_URL}/settings/payments?onboarded=true",
        type="account_onboarding",
    )
    return {"onboard_url": link.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks for subscription lifecycle events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception:
        raise HTTPException(400, "Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        plan = session["metadata"].get("plan")

        if user_id and plan:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.subscription_plan = plan
                user.subscription_active = True
                user.stripe_subscription_id = session.get("subscription")
                db.commit()

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        user = db.query(User).filter(
            User.stripe_subscription_id == sub["id"]
        ).first()
        if user:
            user.subscription_active = False
            user.subscription_plan = "free"
            db.commit()

    elif event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        buyer_id = intent["metadata"].get("buyer_id")
        if buyer_id:
            match = db.query(BuyerLitterMatch).filter(
                BuyerLitterMatch.stripe_payment_intent_id == intent["id"]
            ).first()
            if match:
                match.deposit_paid = True
                match.buyer.status = "deposit_paid"
                db.commit()

    return {"received": True}
