"""Reconcile paid access from current Stripe subscription state."""
from datetime import datetime, timezone

from fastapi import HTTPException
from app.config import settings


def trial_deadline(user):
    value = user.trial_ends_at
    if value and value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def expire_local_trial(user):
    """Enforce the no-card deadline on requests, without a scheduled worker."""
    end = trial_deadline(user)
    if not user.stripe_subscription_id and end and end <= datetime.now(timezone.utc) and (user.subscription_active or user.subscription_plan != "free"):
        user.subscription_active = False
        user.subscription_plan = "free"
        return True
    return False


def start_local_trial(user, plan):
    user.subscription_plan = plan
    user.subscription_active = True
    from datetime import timedelta
    user.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=7)


def plan_prices():
    return {"starter": settings.STRIPE_PRICE_STARTER, "pro": settings.STRIPE_PRICE_PRO,
            "kennel": settings.STRIPE_PRICE_KENNEL}


def sync_subscription(user, subscription):
    if subscription.get("customer") != user.stripe_customer_id:
        raise HTTPException(400, "Subscription customer does not match account")
    prices = {value: key for key, value in plan_prices().items() if value}
    items = subscription.get("items", {}).get("data", [])
    price_id = items[0].get("price", {}).get("id") if items else None
    plan = prices.get(price_id)
    user.stripe_subscription_id = subscription["id"]
    # Keep trial history after cancellation or resubscription.
    if subscription.get("trial_end"):
        user.trial_ends_at = datetime.fromtimestamp(subscription["trial_end"], tz=timezone.utc)
    user.subscription_active = bool(plan and subscription.get("status") in ("active", "trialing")
                                    and not subscription.get("pause_collection"))
    user.subscription_plan = plan if user.subscription_active else "free"
