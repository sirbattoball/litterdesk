from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
import stripe

from app.config import settings
from app.database import get_db
from app.models import User, Buyer, BuyerLitterMatch, Litter, DepositPayment
from app.routers.auth import get_current_user
from app.services.subscriptions import plan_prices, sync_subscription

stripe.api_key = settings.STRIPE_SECRET_KEY
router = APIRouter()


def frontend_url():
    return settings.APP_URL.rstrip("/")


def require_pro(user):
    if not (user.subscription_active and user.subscription_plan in ["pro", "kennel"]):
        raise HTTPException(403, "Deposit collection requires Pro plan")


def stripe_failure(error):
    return HTTPException(502, "Could not contact the payment provider. Please try again.")


@router.post("/create-subscription/{plan}")
def create_subscription(plan: str, new_signup: bool = False, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    prices = plan_prices()
    if plan not in prices:
        raise HTTPException(400, "Choose Starter or Pro")
    if not prices[plan] or not settings.STRIPE_SECRET_KEY:
        raise HTTPException(503, "Subscription checkout is not configured")
    user = db.query(User).filter(User.id == current_user.id).with_for_update().one()
    try:
        previous_customer_id = user.stripe_customer_id or "new"
        if user.stripe_customer_id:
            try:
                customer = stripe.Customer.retrieve(user.stripe_customer_id)
                if customer.get("deleted"):
                    user.stripe_customer_id = None
            except stripe.error.InvalidRequestError as exc:
                if exc.code != "resource_missing":
                    raise
                user.stripe_customer_id = None
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(email=user.email, name=user.full_name,
                metadata={"user_id": user.id}, idempotency_key=f"customer-{user.id}-{previous_customer_id}")
            user.stripe_customer_id = customer.id
            db.flush()

        # Check Stripe itself, so webhook delays/retries cannot create two subscriptions.
        history = list(stripe.Subscription.list(customer=user.stripe_customer_id, status="all", limit=100).auto_paging_iter())
        ongoing = [sub for sub in history if sub["status"] not in ("canceled", "incomplete_expired")]
        if ongoing:
            sub = ongoing[0]
            if sub["status"] in ("active", "trialing") and not sub.get("pause_collection"):
                if sub["items"]["data"][0]["price"]["id"] != prices[plan]:
                    sub = stripe.Subscription.modify(sub["id"],
                        items=[{"id": sub["items"]["data"][0]["id"], "price": prices[plan]}],
                        proration_behavior="create_prorations", payment_behavior="error_if_incomplete")
                sync_subscription(user, sub)
                db.commit()
                return {"switched": True, "plan": user.subscription_plan}
            # Resolve failed/paused/incomplete subscriptions through billing, not a second checkout.
            portal = stripe.billing_portal.Session.create(customer=user.stripe_customer_id,
                return_url=f"{frontend_url()}/dashboard/upgrade?billing_return=true")
            sync_subscription(user, sub)
            db.commit()
            return {"checkout_url": portal.url}

        used_trial = bool(user.trial_ends_at or user.stripe_subscription_id or history)
        subscription_data = {"metadata": {"user_id": user.id}}
        if not used_trial:
            subscription_data["trial_period_days"] = 7
        # Reuse an open session instead of creating duplicate checkout tabs.
        sessions = stripe.checkout.Session.list(customer=user.stripe_customer_id, status="open", limit=100)
        for existing in sessions.auto_paging_iter():
            if existing.get("mode") == "subscription":
                if existing.get("metadata", {}).get("plan") == plan:
                    db.commit()
                    return {"checkout_url": existing.url, "session_id": existing.id}
                stripe.checkout.Session.expire(existing.id)
        destination = "/dashboard/onboarding" if new_signup else "/dashboard"
        session = stripe.checkout.Session.create(customer=user.stripe_customer_id,
            payment_method_types=["card"], payment_method_collection="always",
            line_items=[{"price": prices[plan], "quantity": 1}], mode="subscription",
            subscription_data=subscription_data,
            success_url=f"{frontend_url()}{destination}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url()}/dashboard/upgrade?checkout_cancelled=true",
            metadata={"user_id": user.id, "plan": plan})
        db.commit()
        return {"checkout_url": session.url, "session_id": session.id}
    except stripe.error.StripeError as exc:
        db.rollback()
        raise stripe_failure(exc)


@router.post("/sync-subscription")
def sync_checkout(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if not current_user.stripe_customer_id or session.get("customer") != current_user.stripe_customer_id or session.get("mode") != "subscription":
            raise HTTPException(404, "Checkout not found")
        if session.get("status") != "complete" or not session.get("subscription"):
            raise HTTPException(409, "Checkout has not completed")
        sub = stripe.Subscription.retrieve(session["subscription"])
        user = db.query(User).filter(User.id == current_user.id).with_for_update().one()
        if user.stripe_subscription_id and user.stripe_subscription_id != sub["id"]:
            current = stripe.Subscription.retrieve(user.stripe_subscription_id)
            if current.get("status") not in ("canceled", "incomplete_expired"):
                raise HTTPException(409, "A different subscription is already linked")
        sync_subscription(user, sub)
        db.commit()
        return {"subscription_active": user.subscription_active}
    except stripe.error.StripeError as exc:
        raise stripe_failure(exc)


@router.post("/create-portal")
def create_portal(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.stripe_customer_id:
        raise HTTPException(400, "No billing account found")
    try:
        session = stripe.billing_portal.Session.create(customer=current_user.stripe_customer_id,
            return_url=f"{frontend_url()}/dashboard/upgrade?billing_return=true")
        return {"portal_url": session.url}
    except stripe.error.StripeError as exc:
        raise stripe_failure(exc)


def reconcile_deposit(payment, session, db):
    if session.get("id") != payment.stripe_session_id:
        raise HTTPException(400, "Payment session does not match")
    if session.get("amount_total") != payment.amount_cents or session.get("currency") != "usd":
        raise HTTPException(400, "Payment amount does not match")
    if session.get("payment_status") == "paid":
        payment.status = "paid"
        payment.stripe_payment_intent_id = session.get("payment_intent")
        matches = db.query(BuyerLitterMatch).filter(BuyerLitterMatch.buyer_id == payment.buyer_id,
            BuyerLitterMatch.litter_id == payment.litter_id).all()
        for match in matches:
            match.deposit_paid = True
            match.deposit_amount = payment.amount_cents / 100
            match.stripe_payment_intent_id = payment.stripe_payment_intent_id
        buyer = db.get(Buyer, payment.buyer_id)
        if buyer and buyer.status in ("inquiry", "waitlisted"):
            buyer.status = "deposit_paid"
    elif session.get("status") == "expired" and payment.status != "paid":
        payment.status = "expired"


@router.post("/collect-deposit")
def collect_deposit(buyer_id: str, litter_id: str, amount_cents: int = Query(ge=50, le=99999999),
                    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_pro(current_user)
    if not current_user.stripe_onboarded or not current_user.stripe_account_id:
        raise HTTPException(400, "Complete Stripe Connect setup first")
    litter = db.query(Litter).filter(Litter.id == litter_id, Litter.breeder_id == current_user.id).with_for_update().first()
    buyer = db.query(Buyer).filter(Buyer.id == buyer_id, Buyer.breeder_id == current_user.id).first()
    if not litter or not buyer:
        raise HTTPException(404, "Buyer or litter not found")
    match = db.query(BuyerLitterMatch).filter(BuyerLitterMatch.buyer_id == buyer_id, BuyerLitterMatch.litter_id == litter_id).first()
    if not match:
        raise HTTPException(400, "Add this buyer to the litter waitlist first")
    if match.deposit_paid:
        raise HTTPException(409, "Deposit has already been paid")
    try:
        pending = db.query(DepositPayment).filter(DepositPayment.buyer_id == buyer_id,
            DepositPayment.litter_id == litter_id, DepositPayment.status == "pending").first()
        if pending and not pending.stripe_session_id and pending.amount_cents != amount_cents:
            raise HTTPException(409, "Retry the original deposit amount to recover the existing payment link")
        if pending and pending.stripe_session_id:
            session = stripe.checkout.Session.retrieve(pending.stripe_session_id)
            reconcile_deposit(pending, session, db)
            if pending.status == "paid":
                db.commit()
                raise HTTPException(409, "Deposit has already been paid")
            if session.get("status") == "open":
                if pending.amount_cents != amount_cents:
                    raise HTTPException(409, "An unpaid link already exists with a different amount. Let it expire before creating another.")
                db.commit()
                return {"checkout_url": session.url}
            if pending.status == "pending":
                raise HTTPException(409, "Payment is still processing. Please check the deposit history shortly.")
        # Row creation and Stripe idempotency key survive request retry failures.
        if not pending or pending.status != "pending":
            pending = DepositPayment(id=str(uuid.uuid4()), breeder_id=current_user.id,
                buyer_id=buyer_id, litter_id=litter_id, amount_cents=amount_cents)
            db.add(pending)
            db.flush()
        metadata = {"deposit_id": pending.id}
        session = stripe.checkout.Session.create(mode="payment", payment_method_types=["card"],
            customer_email=buyer.email,
            line_items=[{"price_data": {"currency": "usd", "unit_amount": pending.amount_cents,
                "product_data": {"name": f"Puppy deposit — {litter.name or litter.breed}"}}, "quantity": 1}],
            payment_intent_data={"receipt_email": buyer.email, "transfer_data": {"destination": current_user.stripe_account_id},
                "application_fee_amount": pending.amount_cents * 15 // 1000, "metadata": metadata},
            metadata=metadata,
            success_url=f"{frontend_url()}/deposit-result?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url()}/deposit-result?cancelled=true",
            idempotency_key=f"deposit-{pending.id}")
        pending.stripe_session_id = session.id
        db.commit()
        return {"checkout_url": session.url}
    except stripe.error.StripeError as exc:
        # Retain the row/key if Stripe succeeded but the response was lost.
        if isinstance(exc, stripe.error.InvalidRequestError) and pending:
            pending.status = "failed"
        db.commit()
        raise stripe_failure(exc)


@router.get("/deposits")
def list_deposits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(DepositPayment, Buyer.full_name, Litter.name, Litter.breed).join(
        Buyer, Buyer.id == DepositPayment.buyer_id).join(Litter, Litter.id == DepositPayment.litter_id).filter(
        DepositPayment.breeder_id == current_user.id).order_by(DepositPayment.created_at.desc()).all()
    return [{"id": payment.id, "buyer_name": buyer, "litter_name": name or breed,
             "amount_cents": payment.amount_cents, "status": payment.status,
             "created_at": payment.created_at} for payment, buyer, name, breed in rows]


@router.post("/stripe-connect/onboard")
def stripe_connect_onboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_pro(current_user)
    try:
        if not current_user.stripe_account_id:
            account = stripe.Account.create(type="express", email=current_user.email,
                metadata={"user_id": current_user.id}, idempotency_key=f"connect-{current_user.id}")
            current_user.stripe_account_id = account.id
            db.commit()
        link = stripe.AccountLink.create(account=current_user.stripe_account_id,
            refresh_url=f"{frontend_url()}/dashboard/payments", return_url=f"{frontend_url()}/dashboard/payments?connect_return=true", type="account_onboarding")
        return {"onboard_url": link.url}
    except stripe.error.StripeError as exc:
        raise stripe_failure(exc)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        event = stripe.Webhook.construct_event(await request.body(), request.headers.get("stripe-signature"), settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Invalid webhook signature")
    kind = event["type"]
    obj = event["data"]["object"]
    try:
        if kind.startswith("checkout.session.") and obj.get("mode") == "payment":
            payment = db.query(DepositPayment).filter(DepositPayment.stripe_session_id == obj["id"]).with_for_update().first()
            if payment:
                # Read current status so delayed failure/expiry events cannot undo payment.
                session = stripe.checkout.Session.retrieve(obj["id"])
                reconcile_deposit(payment, session, db)
        elif (kind == "checkout.session.completed" and obj.get("mode") == "subscription") or kind in (
            "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
            "customer.subscription.paused", "customer.subscription.resumed", "invoice.paid", "invoice.payment_failed"):
            subscription_id = obj.get("subscription")
            if kind.startswith("customer.subscription."):
                subscription_id = obj["id"]
            if not subscription_id:
                parent = obj.get("parent") or {}
                subscription_id = (parent.get("subscription_details") or {}).get("subscription")
            if subscription_id:
                sub = stripe.Subscription.retrieve(subscription_id)
                user = db.query(User).filter(User.stripe_customer_id == sub.get("customer")).with_for_update().first()
                if user:
                    # An event from a previous subscription must not overwrite a newer one.
                    if user.stripe_subscription_id and user.stripe_subscription_id != sub["id"]:
                        previous = stripe.Subscription.retrieve(user.stripe_subscription_id)
                        if previous.get("status") not in ("canceled", "incomplete_expired") or previous.get("created", 0) > sub.get("created", 0):
                            return {"received": True}
                    sync_subscription(user, sub)
        elif kind == "account.updated":
            account = stripe.Account.retrieve(obj["id"])
            user = db.query(User).filter(User.stripe_account_id == obj["id"]).first()
            if user:
                user.stripe_onboarded = bool(account.get("charges_enabled") and account.get("payouts_enabled"))
        elif kind in ("payment_intent.succeeded", "payment_intent.payment_failed"):
            # Backward compatibility for intents created before hosted deposit checkout.
            intent = stripe.PaymentIntent.retrieve(obj["id"])
            match = db.query(BuyerLitterMatch).filter(BuyerLitterMatch.stripe_payment_intent_id == obj["id"]).first()
            if match and intent.get("status") == "succeeded":
                match.deposit_paid = True
        db.commit()
    except stripe.error.StripeError as exc:
        db.rollback()
        # Non-2xx makes Stripe retry instead of silently losing billing changes.
        raise stripe_failure(exc)
    return {"received": True}


@router.post("/refresh-subscription")
def refresh_subscription(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.stripe_customer_id:
        return {"subscription_active": False}
    try:
        history = list(stripe.Subscription.list(customer=current_user.stripe_customer_id, status="all", limit=100).auto_paging_iter())
        ongoing = [s for s in history if s["status"] not in ("canceled", "incomplete_expired")]
        chosen = max(ongoing or history, key=lambda s: s.get("created", 0), default=None)
        if chosen:
            sync_subscription(current_user, chosen)
        else:
            current_user.subscription_active = False
            current_user.subscription_plan = "free"
        db.commit()
        return {"subscription_active": current_user.subscription_active}
    except stripe.error.StripeError as exc:
        raise stripe_failure(exc)


@router.post("/stripe-connect/refresh")
def refresh_connect(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_pro(current_user)
    if not current_user.stripe_account_id:
        return {"connected": False}
    try:
        account = stripe.Account.retrieve(current_user.stripe_account_id)
        current_user.stripe_onboarded = bool(account.get("charges_enabled") and account.get("payouts_enabled"))
        db.commit()
        return {"connected": current_user.stripe_onboarded}
    except stripe.error.StripeError as exc:
        raise stripe_failure(exc)


@router.get("/deposit-status")
def public_deposit_status(session_id: str, db: Session = Depends(get_db)):
    payment = db.query(DepositPayment).filter(DepositPayment.stripe_session_id == session_id).first()
    if not payment:
        raise HTTPException(404, "Payment link not found")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        reconcile_deposit(payment, session, db)
        db.commit()
        # The unguessable Checkout session ID is a receipt capability; no buyer data.
        return {"status": payment.status, "amount_cents": payment.amount_cents}
    except stripe.error.StripeError as exc:
        raise stripe_failure(exc)
