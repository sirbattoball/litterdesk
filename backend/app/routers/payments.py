from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import stripe
from app.config import settings
from app.database import get_db
from app.models import User, BuyerLitterMatch, Litter
from app.routers.auth import get_current_user
from datetime import datetime, timezone

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter()

FRONTEND_URL = "https://litterdesk.vercel.app"

PLAN_PRICES = {
    "starter": settings.STRIPE_PRICE_STARTER,
    "pro": settings.STRIPE_PRICE_PRO,
    "kennel": settings.STRIPE_PRICE_KENNEL,
}


@router.post("/create-subscription/{plan}")
def create_subscription(
    plan: str,
    new_signup: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if plan not in PLAN_PRICES:
        raise HTTPException(400, f"Invalid plan. Choose: {list(PLAN_PRICES.keys())}")

    price_id = PLAN_PRICES[plan]
    if not price_id:
        raise HTTPException(400, f"Price ID not configured for '{plan}'. Add STRIPE_PRICE_{plan.upper()} in Render.")

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(400, "Stripe key not configured.")

    # Brand-new registrations land in onboarding after checkout; existing
    # accounts upgrading from the dashboard go straight back to it.
    success_url = (
        f"{FRONTEND_URL}/dashboard/onboarding?subscribed=true" if new_signup
        else f"{FRONTEND_URL}/dashboard?subscribed=true"
    )
    cancel_url = (
        f"{FRONTEND_URL}/register?plan={plan}&checkout_cancelled=true" if new_signup
        else f"{FRONTEND_URL}/dashboard/upgrade"
    )

    try:
        # A stored customer ID can go stale if it was deleted directly in
        # Stripe (manual cleanup, GDPR request, whatever) — reusing a dead
        # ID fails checkout with a raw "No such customer" error. Verify it
        # actually still exists first and self-heal instead of leaving the
        # account permanently unable to subscribe again.
        if current_user.stripe_customer_id:
            try:
                stripe.Customer.retrieve(current_user.stripe_customer_id)
            except stripe.error.InvalidRequestError:
                current_user.stripe_customer_id = None

        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name,
                metadata={"user_id": current_user.id}
            )
            current_user.stripe_customer_id = customer.id
            db.commit()

        # Already has an active subscription — this is an upgrade/downgrade
        # between plans, not a new signup. Modify the existing Stripe
        # subscription's price in place rather than creating a second
        # subscription, which would bill them twice.
        if current_user.subscription_active and current_user.stripe_subscription_id:
            existing_sub = stripe.Subscription.retrieve(current_user.stripe_subscription_id)
            stripe.Subscription.modify(
                current_user.stripe_subscription_id,
                items=[{
                    "id": existing_sub["items"]["data"][0]["id"],
                    "price": price_id,
                }],
                proration_behavior="create_prorations",
            )
            current_user.subscription_plan = plan
            db.commit()
            return {"switched": True, "plan": plan}

        # Only grant a trial for customers who've genuinely never had one.
        # Anyone with a trial_ends_at already set has been through Stripe
        # Checkout before (that field only ever gets set by the webhook
        # below) — re-subscribing them with another trial_period_days is
        # both wrong (they're not "starting a trial") and something Stripe's
        # own anti-abuse protection can reject outright, which is what a
        # generic "couldn't open checkout" error usually means in practice.
        subscription_data = {} if current_user.trial_ends_at else {"trial_period_days": 7}

        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            subscription_data=subscription_data,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": current_user.id, "plan": plan},
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")


@router.post("/create-portal")
def create_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.stripe_customer_id:
        raise HTTPException(400, "No active subscription")

    # Same staleness check as create-subscription — if this customer was
    # deleted directly in Stripe, clear the dead reference so this doesn't
    # keep failing on every future attempt, and tell the person clearly
    # what's actually going on instead of surfacing a raw Stripe error.
    try:
        stripe.Customer.retrieve(current_user.stripe_customer_id)
    except stripe.error.InvalidRequestError:
        current_user.stripe_customer_id = None
        db.commit()
        raise HTTPException(400, "No active subscription found. Please subscribe to a plan first.")

    try:
        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{FRONTEND_URL}/dashboard/settings",
        )
        return {"portal_url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Stripe error: {str(e)}")


@router.post("/collect-deposit")
def collect_deposit(
    buyer_id: str,
    litter_id: str,
    amount_cents: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not (current_user.subscription_active and current_user.subscription_plan in ["pro", "kennel"]):
        raise HTTPException(403, "Deposit collection via Stripe requires Pro plan")

    if not current_user.stripe_onboarded:
        raise HTTPException(400, "Complete Stripe Connect setup first")

    litter = db.query(Litter).filter(
        Litter.id == litter_id, Litter.breeder_id == current_user.id
    ).first()
    if not litter:
        raise HTTPException(404, "Litter not found")

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            transfer_data={"destination": current_user.stripe_account_id},
            application_fee_amount=int(amount_cents * 0.015),
            metadata={"buyer_id": buyer_id, "litter_id": litter_id, "breeder_id": current_user.id}
        )
        match = db.query(BuyerLitterMatch).filter(
            BuyerLitterMatch.buyer_id == buyer_id,
            BuyerLitterMatch.litter_id == litter_id,
        ).first()
        if match:
            match.stripe_payment_intent_id = intent.id
            match.deposit_amount = amount_cents / 100
            db.commit()
        return {"client_secret": intent.client_secret, "payment_intent_id": intent.id}
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Stripe error: {str(e)}")


@router.post("/stripe-connect/onboard")
def stripe_connect_onboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
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
            refresh_url=f"{FRONTEND_URL}/dashboard/payments",
            return_url=f"{FRONTEND_URL}/dashboard/payments",
            type="account_onboarding",
        )
        return {"onboard_url": link.url}
    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Stripe error: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
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
                subscription_id = session.get("subscription")
                user.stripe_subscription_id = subscription_id

                # Pull the real trial end date from Stripe rather than
                # guessing — this is what the trial countdown displays.
                if subscription_id:
                    try:
                        sub = stripe.Subscription.retrieve(subscription_id)
                        if sub.get("trial_end"):
                            user.trial_ends_at = datetime.fromtimestamp(
                                sub["trial_end"], tz=timezone.utc
                            )
                    except stripe.error.StripeError:
                        pass  # non-fatal — subscription is still activated either way

                db.commit()

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        user = db.query(User).filter(User.stripe_subscription_id == sub["id"]).first()
        if user:
            user.subscription_active = False
            user.subscription_plan = "free"
            db.commit()

    elif event["type"] == "account.updated":
        # Fired when a breeder completes Stripe Connect onboarding
        account = event["data"]["object"]
        stripe_account_id = account.get("id")
        charges_enabled = account.get("charges_enabled", False)
        if stripe_account_id and charges_enabled:
            user = db.query(User).filter(User.stripe_account_id == stripe_account_id).first()
            if user and not user.stripe_onboarded:
                user.stripe_onboarded = True
                db.commit()

    elif event["type"] in ("payment_intent.succeeded", "payment_intent.payment_failed"):
        # Update deposit status on buyer-litter match
        pi = event["data"]["object"]
        pi_id = pi.get("id")
        if pi_id:
            match = db.query(BuyerLitterMatch).filter(
                BuyerLitterMatch.stripe_payment_intent_id == pi_id
            ).first()
            if match:
                match.deposit_paid = (event["type"] == "payment_intent.succeeded")
                db.commit()

    return {"received": True}
