"""Machine-to-machine endpoints. Not for browsers."""
import hmac
import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.lifecycle_emails import run_lead_nurture, run_trial_lifecycle

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/run-daily")
def run_daily(x_cron_secret: str = Header(default=""), db: Session = Depends(get_db)):
    """Daily job trigger (called by a scheduler such as GitHub Actions).

    Disabled (404) until CRON_SECRET is set, and compares in constant time.
    Runs trial reminders and the lead nurture sequence; each is idempotent.
    """
    if not settings.CRON_SECRET:
        raise HTTPException(404, "Not found")
    if not hmac.compare_digest(x_cron_secret, settings.CRON_SECRET):
        raise HTTPException(401, "Invalid secret")
    result = {}
    for name, job in (("trial", run_trial_lifecycle), ("nurture", run_lead_nurture)):
        try:
            result[name] = job(db)
        except Exception:
            logger.exception("daily job %s failed", name)
            db.rollback()
            result[name] = "error"
    return result
