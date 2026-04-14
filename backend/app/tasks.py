"""
Automated background tasks for LitterDesk.

These run on schedule via Celery Beat and handle:
- Go-home date reminders to buyers
- Breeder follow-up nudges
- Trial expiration warnings
- Weekly business digest
"""
from app.worker import celery_app
from app.database import SessionLocal
from app.models import User, Buyer, Litter, BuyerLitterMatch
from app.services import ai_service
from app.services.email_service import send_email
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def send_go_home_reminders(self):
    """
    7 days before a litter's go_home_date, email all matched buyers
    with a warm reminder. AI drafts the message.
    """
    db = SessionLocal()
    try:
        target_date = datetime.utcnow().date() + timedelta(days=7)
        litters = db.query(Litter).filter(
            Litter.go_home_date == target_date,
            Litter.status.in_(["born", "weaning", "ready"])
        ).all()

        for litter in litters:
            breeder = litter.breeder
            matched_buyers = [
                m for m in litter.buyer_litter_matches
                if m.deposit_paid and m.buyer
            ]

            for match in matched_buyers:
                buyer = match.buyer
                try:
                    draft = ai_service.draft_followup_email(
                        buyer_name=buyer.full_name,
                        breeder_name=breeder.full_name,
                        kennel_name=breeder.kennel_name or "our kennel",
                        context=f"Puppy go-home date is {litter.go_home_date}. "
                                f"Litter: {litter.breed}, {litter.num_males}M/{litter.num_females}F.",
                        email_type="go_home_reminder",
                    )
                    send_email(
                        to=buyer.email,
                        subject=draft["subject"],
                        body=draft["body"],
                        reply_to=breeder.email,
                    )
                    logger.info(f"Go-home reminder sent to {buyer.email} for litter {litter.id}")
                except Exception as e:
                    logger.error(f"Failed to send reminder to {buyer.email}: {e}")

        db.commit()
    finally:
        db.close()


@celery_app.task(bind=True)
def send_followup_reminders(self):
    """
    Each morning, find buyers whose follow_up_date is today
    and send the breeder an in-app notification + email nudge.
    """
    db = SessionLocal()
    try:
        today = datetime.utcnow().date()
        buyers_due = db.query(Buyer).filter(
            Buyer.follow_up_date >= today,
            Buyer.follow_up_date < today + timedelta(days=1),
            Buyer.status.notin_(["complete", "declined"])
        ).all()

        # Group by breeder
        by_breeder: dict[str, list] = {}
        for buyer in buyers_due:
            breeder_id = buyer.breeder_id
            if breeder_id not in by_breeder:
                by_breeder[breeder_id] = []
            by_breeder[breeder_id].append(buyer)

        for breeder_id, buyers in by_breeder.items():
            breeder = db.query(User).filter(User.id == breeder_id).first()
            if not breeder:
                continue

            buyer_list = "\n".join([
                f"  • {b.full_name} ({b.email}) — {b.breed_preference or 'any breed'}, status: {b.status}"
                for b in buyers
            ])

            send_email(
                to=breeder.email,
                subject=f"LitterDesk: {len(buyers)} buyer follow-up{'' if len(buyers) == 1 else 's'} due today",
                body=f"Hi {breeder.full_name},\n\n"
                     f"You have {len(buyers)} buyer{'s' if len(buyers) > 1 else ''} to follow up with today:\n\n"
                     f"{buyer_list}\n\n"
                     f"Log in to LitterDesk to draft AI follow-up emails and update statuses.\n\n"
                     f"https://litterdesk.com/dashboard/buyers\n\n"
                     f"— LitterDesk"
            )
            logger.info(f"Follow-up reminder sent to {breeder.email} for {len(buyers)} buyers")

    finally:
        db.close()


@celery_app.task(bind=True)
def send_weekly_digest(self):
    """
    Sunday morning: send each breeder a summary of their week —
    new inquiries, deposits received, contracts signed, upcoming dates.
    """
    db = SessionLocal()
    try:
        breeders = db.query(User).filter(
            User.subscription_active == True
        ).all()

        week_ago = datetime.utcnow() - timedelta(days=7)

        for breeder in breeders:
            new_buyers = db.query(Buyer).filter(
                Buyer.breeder_id == breeder.id,
                Buyer.created_at >= week_ago
            ).count()

            new_deposits = db.query(BuyerLitterMatch).join(
                Litter, BuyerLitterMatch.litter_id == Litter.id
            ).filter(
                Litter.breeder_id == breeder.id,
                BuyerLitterMatch.deposit_paid == True,
                BuyerLitterMatch.created_at >= week_ago
            ).count()

            upcoming_go_home = db.query(Litter).filter(
                Litter.breeder_id == breeder.id,
                Litter.go_home_date >= datetime.utcnow().date(),
                Litter.go_home_date <= datetime.utcnow().date() + timedelta(days=14),
            ).all()

            if new_buyers == 0 and new_deposits == 0 and not upcoming_go_home:
                continue  # Nothing to report, skip

            upcoming_str = "\n".join([
                f"  • {l.name or l.breed + ' litter'}: go home {l.go_home_date}"
                for l in upcoming_go_home
            ]) or "  None scheduled"

            send_email(
                to=breeder.email,
                subject=f"LitterDesk Weekly Digest — {datetime.utcnow().strftime('%b %d')}",
                body=f"Hi {breeder.full_name},\n\n"
                     f"Here's your LitterDesk summary for the week:\n\n"
                     f"📬 New buyer inquiries: {new_buyers}\n"
                     f"💰 New deposits received: {new_deposits}\n\n"
                     f"📅 Upcoming go-home dates (next 2 weeks):\n{upcoming_str}\n\n"
                     f"Log in to manage your pipeline:\n"
                     f"https://litterdesk.com/dashboard\n\n"
                     f"— LitterDesk"
            )
            logger.info(f"Weekly digest sent to {breeder.email}")

    finally:
        db.close()


@celery_app.task(bind=True)
def check_trial_expiry(self):
    """
    Daily: warn breeders whose trial ends in 3 days.
    On expiry day, downgrade them to free.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        # 3-day warning
        warn_date = now + timedelta(days=3)
        expiring_soon = db.query(User).filter(
            User.subscription_active == False,
            User.trial_ends_at >= now,
            User.trial_ends_at <= warn_date,
            User.subscription_plan == "free",
        ).all()

        for user in expiring_soon:
            days_left = (user.trial_ends_at - now).days + 1
            send_email(
                to=user.email,
                subject=f"Your LitterDesk trial ends in {days_left} day{'s' if days_left != 1 else ''}",
                body=f"Hi {user.full_name},\n\n"
                     f"Your 14-day free trial of LitterDesk ends in {days_left} day{'s' if days_left != 1 else ''}.\n\n"
                     f"To keep access to all features, upgrade to a paid plan:\n\n"
                     f"• Starter — $29/month (2 litters)\n"
                     f"• Pro — $79/month (unlimited + AI features) ⭐\n"
                     f"• Kennel — $149/month (multi-user)\n\n"
                     f"Upgrade here: https://litterdesk.com/dashboard/upgrade\n\n"
                     f"Questions? Just reply to this email.\n\n"
                     f"— The LitterDesk Team"
            )

        db.commit()
    finally:
        db.close()


@celery_app.task
def score_buyer_async(buyer_id: str):
    """Score a buyer in the background after they're added."""
    from app.models import Buyer
    db = SessionLocal()
    try:
        buyer = db.query(Buyer).filter(Buyer.id == buyer_id).first()
        if not buyer:
            return

        result = ai_service.score_buyer(
            breed=buyer.breed_preference or "any",
            buyer_name=buyer.full_name,
            lifestyle_notes=buyer.lifestyle_notes or "No details provided",
            experience_level=buyer.experience_level or "unknown",
            sex_preference=buyer.sex_preference or "no preference",
            color_preference=buyer.color_preference,
            city=buyer.city or "Unknown",
            state=buyer.state or "Unknown",
        )
        buyer.priority_score = result["score"]
        buyer.ai_notes = result["summary"]
        db.commit()
        logger.info(f"Async scored buyer {buyer_id}: {result['score']}/100")
    except Exception as e:
        logger.error(f"Failed to async score buyer {buyer_id}: {e}")
    finally:
        db.close()
