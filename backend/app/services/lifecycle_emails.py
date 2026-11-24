"""Customer lifecycle emails: welcome, trial ending, trial ended, lead nurture.

A no-card trial only converts if people are reminded it is running, so these
are sent from a daily job (see app/routers/internal.py). Every send is recorded
so nobody is emailed twice, and reserved test domains (example.com etc.) are
skipped so test accounts can't cause bounces that hurt our sender reputation.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Lead, User
from app.services import email_service
from app.services.nurture_emails import NURTURE_EMAILS, NURTURE_SCHEDULE, render_for
from app.services.subscriptions import trial_deadline

logger = logging.getLogger(__name__)

WARN_WINDOW = timedelta(days=2)       # reminder goes out when <= 2 days remain
ENDED_WINDOW = timedelta(days=14)     # don't email people about trials that ended long ago
_RESERVED_DOMAINS = ("example.com", "example.org", "example.net")


def _deliverable(email: str) -> bool:
    domain = (email or "").rsplit("@", 1)[-1].lower()
    return bool(domain) and not domain.endswith(_RESERVED_DOMAINS) and not domain.endswith((".test", ".invalid", ".localhost"))


def _first_name(user) -> str:
    return (user.full_name or "").strip().split(" ")[0] or "there"


def _send(user, subject: str, body: str) -> bool:
    return email_service.send_email(to=user.email, subject=subject, body=body, reply_to=settings.SUPPORT_EMAIL)


def send_welcome_email(user) -> bool:
    """Day-0 email. Best-effort: never raises, so signup can't fail because of it."""
    try:
        if not settings.RESEND_API_KEY or not _deliverable(user.email):
            return False
        app = settings.APP_URL.rstrip("/")
        return _send(user, "You're in — here's a 5-minute start", (
            f"Hi {_first_name(user)},\n\n"
            "Your 7-day LitterDesk trial is running. No card was needed, and nothing is charged unless you choose a plan.\n\n"
            "The quickest way to see if it fits (about 5 minutes):\n"
            "1. Add your litter: parents, due date, expected puppies.\n"
            "2. Add the buyers on your waitlist.\n"
            "3. Write your puppy sales agreement and send it for online signing.\n\n"
            f"Open LitterDesk: {app}/dashboard\n\n"
            "If anything is confusing or missing, just reply to this email. It goes straight to me and I read every one.\n\n"
            "— LitterDesk"
        ))
    except Exception:
        logger.exception("welcome email failed")
        return False


def _plans_text() -> str:
    return (
        "• Starter — $39/month: litters, buyer waitlists, dog health records, contracts with online signing, deposit tracking\n"
        "• Pro — $89/month: everything in Starter, plus AI contract drafting, buyer emails and buyer matching\n"
        "Both are month-to-month. Cancel anytime."
    )


def run_trial_lifecycle(db: Session, now: datetime | None = None) -> dict:
    """Send the 'ending soon' and 'ended' reminders. Safe to run as often as you like."""
    now = now or datetime.now(timezone.utc)
    app = settings.APP_URL.rstrip("/")
    upgrade = f"{app}/dashboard/upgrade"
    sent = {"warning": 0, "ended": 0}

    # Local (no-card) trials only: anyone with a Stripe subscription is a customer, not a trial.
    candidates = db.query(User).filter(User.stripe_subscription_id.is_(None), User.trial_ends_at.isnot(None)).all()
    for user in candidates:
        end = trial_deadline(user)
        if not end or not _deliverable(user.email):
            continue
        remaining = end - now

        if timedelta(0) < remaining <= WARN_WINDOW and not user.trial_warning_sent_at:
            days = max(1, -(-int(remaining.total_seconds()) // 86400))  # round up
            ok = _send(user, f"Your LitterDesk trial ends in {days} day{'s' if days != 1 else ''}", (
                f"Hi {_first_name(user)},\n\n"
                f"Your free trial ends in {days} day{'s' if days != 1 else ''}. After that, access pauses unless you choose a plan. "
                "Nothing is charged automatically, and your litters, buyers and contracts stay saved in your account.\n\n"
                f"{_plans_text()}\n\n"
                f"Keep going: {upgrade}\n\n"
                "Not sure it's right for you? Reply and tell me what's missing. I'm happy to help.\n\n— LitterDesk"
            ))
            if ok:
                user.trial_warning_sent_at = now
                sent["warning"] += 1

        elif timedelta(0) >= remaining > -ENDED_WINDOW and not user.trial_ended_email_sent_at:
            ok = _send(user, "Your LitterDesk trial has ended — your records are safe", (
                f"Hi {_first_name(user)},\n\n"
                "Your 7-day trial has ended. Your litters, buyers and contracts are still saved. "
                "Pick a plan whenever you're ready and everything will be right where you left it.\n\n"
                f"{_plans_text()}\n\n"
                f"Choose a plan: {upgrade}\n\n"
                "If LitterDesk wasn't the right fit, I'd really like to know why. Just reply with a line or two. "
                "It helps me make it better for breeders like you.\n\n— LitterDesk"
            ))
            if ok:
                user.trial_ended_email_sent_at = now
                sent["ended"] += 1

    db.commit()
    return sent


def run_lead_nurture(db: Session, now: datetime | None = None) -> int:
    """Send each lead their next nurture email once enough days have passed."""
    now = now or datetime.now(timezone.utc)
    count = 0
    leads = db.query(Lead).filter(
        Lead.converted_to_signup == False,  # noqa: E712
        Lead.unsubscribed == False,  # noqa: E712
        Lead.nurture_step < len(NURTURE_SCHEDULE),
    ).all()
    for lead in leads:
        if db.query(User).filter(User.email == lead.email).first():
            lead.converted_to_signup = True
            continue
        if not _deliverable(lead.email):
            continue
        created = lead.created_at if lead.created_at.tzinfo else lead.created_at.replace(tzinfo=timezone.utc)
        threshold_days, step_key = NURTURE_SCHEDULE[lead.nurture_step]
        if (now - created).days >= threshold_days:
            content = NURTURE_EMAILS[step_key]
            if email_service.send_email(to=lead.email, subject=content["subject"], body="",
                                        html=render_for(content["html"], lead.email), reply_to=settings.SUPPORT_EMAIL):
                lead.nurture_step += 1
                count += 1
            else:
                logger.error("Failed to send nurture step %s to lead %s", step_key, lead.id)
    db.commit()
    return count
