from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models import Lead
from app.services import email_service

router = APIRouter()


class LeadCaptureRequest(BaseModel):
    email: EmailStr
    source: str = "buyer_agreement_template"


class LeadQualifyRequest(BaseModel):
    email: EmailStr
    litters_per_year: str | None = None
    biggest_headache: str | None = None


TEMPLATE_DOWNLOAD_URL = "https://litterdesk.vercel.app/downloads/puppy-buyer-agreement-deposit-terms-template.docx"

WELCOME_EMAIL_HTML = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: inline-block;">
    <span style="color: #15803d; font-weight: 600;">🐾 LitterDesk</span>
  </div>
  <p>Hey there,</p>
  <p>Here's the Puppy Buyer Agreement & Deposit Terms template — a fill-in-the-blank starting point covering deposits, health guarantees, registration, and pickup terms.</p>
  <p style="margin: 28px 0;">
    <a href="{TEMPLATE_DOWNLOAD_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Download the template →</a>
  </p>
  <p>It's a Word doc, so feel free to edit it however fits your kennel. And it's worth having a local attorney glance over your final version — laws around pet sales vary by state.</p>
  <p>I'll send a couple more emails over the next week or so with things breeders in your position usually run into — screening buyers, tracking deposits, that kind of thing. No spam, just useful stuff.</p>
  <p>— The LitterDesk team</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">
    LitterDesk · Breeder Operations Platform<br>
    <a href="https://litterdesk.com/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
  </p>
</body>
</html>
"""


@router.post("/capture")
def capture_lead(req: LeadCaptureRequest, db: Session = Depends(get_db)):
    """Public endpoint: landing page lead magnet email capture. No auth required."""
    existing = db.query(Lead).filter(Lead.email == req.email).first()
    if not existing:
        lead = Lead(email=req.email, source=req.source)
        db.add(lead)
        db.commit()

    sent = email_service.send_email(
        to=req.email,
        subject="Your Puppy Buyer Agreement template",
        body="",
        html=WELCOME_EMAIL_HTML,
    )
    if not sent:
        raise HTTPException(500, "Could not send the template email — please try again.")

    return {"status": "sent"}


ALLOWED_LITTERS = {"1-2", "3-4", "5+"}
ALLOWED_HEADACHES = {"buyers", "contracts", "deposits", "records"}


@router.post("/qualify")
def qualify_lead(req: LeadQualifyRequest, db: Session = Depends(get_db)):
    """Public endpoint: optional step-2 qualification answers after email capture.
    Silently no-ops on unknown email — this is best-effort enrichment, not auth."""
    lead = db.query(Lead).filter(Lead.email == req.email).first()
    if lead:
        if req.litters_per_year in ALLOWED_LITTERS:
            lead.litters_per_year = req.litters_per_year
        if req.biggest_headache in ALLOWED_HEADACHES:
            lead.biggest_headache = req.biggest_headache
        db.commit()
    return {"status": "ok"}
