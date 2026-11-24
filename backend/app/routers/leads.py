import hmac
from html import escape
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models import Lead, ContactMessage
from app.config import settings
from app.services import email_service
from app.services.nurture_emails import unsubscribe_signature
from app.services.ratelimit import check_rate_limit

router = APIRouter()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


class LeadCaptureRequest(BaseModel):
    email: EmailStr
    source: str = "buyer_agreement_template"


class LeadQualifyRequest(BaseModel):
    email: EmailStr
    litters_per_year: str | None = None
    biggest_headache: str | None = None


TEMPLATE_DOWNLOAD_URL = f"{settings.APP_URL.rstrip('/')}/downloads/puppy-buyer-agreement-deposit-terms-template.docx"

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
  <p>This requested template email does not subscribe you to marketing messages.</p>
  <p>— The LitterDesk team</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">
    LitterDesk · Breeder Operations Platform<br>
    Requested template delivery.
  </p>
</body>
</html>
"""


@router.post("/capture")
def capture_lead(req: LeadCaptureRequest, request: Request, db: Session = Depends(get_db)):
    """Public endpoint: landing page lead magnet email capture. No auth required."""
    # This endpoint sends an email to whatever address is submitted, so cap it
    # per visitor and per recipient to stop it being used to email-bomb someone.
    check_rate_limit(f"capture-ip:{_client_ip(request)}", 10, 3600)
    check_rate_limit(f"capture-email:{req.email.lower()}", 3, 3600, "We already sent that template. Please check your inbox and spam folder.")
    existing = db.query(Lead).filter(Lead.email == req.email).first()
    if not existing:
        lead = Lead(email=req.email, source=(req.source or "")[:100] or "buyer_agreement_template")
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


class ContactRequest(BaseModel):
    name: str | None = None
    email: EmailStr
    message: str


@router.post("/contact")
def submit_contact(req: ContactRequest, request: Request, db: Session = Depends(get_db)):
    """Public endpoint: standalone 'get in touch' form. No auth required."""
    check_rate_limit(f"contact-ip:{_client_ip(request)}", 5, 3600)
    message = req.message.strip()[:5000]
    if not message:
        raise HTTPException(400, "Message can't be empty")
    name = (req.name or "").strip()[:200] or None

    entry = ContactMessage(name=name, email=req.email, message=message)
    db.add(entry)
    db.commit()

    # The message is retained even if notification delivery is unavailable.
    email_service.send_email(
        to=settings.CONTACT_NOTIFY_EMAIL,
        subject=f"LitterDesk contact form — {name or req.email}",
        body="",
        html=(
            "<p><strong>New contact form submission:</strong></p>"
            f"<p>From: {escape(name + ' — ' if name else '')}{escape(str(req.email))}</p>"
            f"<p style='white-space:pre-wrap'>{escape(message)}</p>"
            "<p>Reply to them directly at their email above.</p>"
        ),
    )

    return {"status": "received"}


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(email: str, sig: str, db: Session = Depends(get_db)):
    """One-click unsubscribe from the follow-up emails. The link is signed, so it
    can only be used for the address it was sent to."""
    email = email.strip().lower()
    if not hmac.compare_digest(sig, unsubscribe_signature(email)):
        return HTMLResponse(_unsub_page("That unsubscribe link isn't valid. Email litterdesk.hello@gmail.com and we'll remove you by hand."), status_code=400)
    db.query(Lead).filter(Lead.email == email).update({"unsubscribed": True})
    db.commit()
    return HTMLResponse(_unsub_page("You're unsubscribed. We won't email you again."))


def _unsub_page(message: str) -> str:
    return (
        "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>LitterDesk</title></head><body style=\"font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:0 20px;color:#1a1a1a\">"
        f"<h2 style='margin-bottom:8px'>LitterDesk</h2><p style='line-height:1.6'>{escape(message)}</p></body></html>"
    )
