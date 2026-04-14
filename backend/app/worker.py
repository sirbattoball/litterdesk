"""
LitterDesk Background Workers
Handles automated: follow-up emails, go-home reminders,
trial expiry notices, and buyer re-engagement.
"""
from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "litterdesk",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"]
)

celery_app.conf.beat_schedule = {
    # Every morning at 8am — send go-home reminders
    "go-home-reminders": {
        "task": "app.tasks.send_go_home_reminders",
        "schedule": crontab(hour=8, minute=0),
    },
    # Every day at 9am — send follow-up reminders to breeder
    "follow-up-reminders": {
        "task": "app.tasks.send_followup_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    # Every Sunday — send weekly digest to breeder
    "weekly-digest": {
        "task": "app.tasks.send_weekly_digest",
        "schedule": crontab(day_of_week=0, hour=7, minute=0),
    },
    # Check trial expirations daily
    "trial-expiry": {
        "task": "app.tasks.check_trial_expiry",
        "schedule": crontab(hour=10, minute=0),
    },
}

celery_app.conf.timezone = "America/New_York"
