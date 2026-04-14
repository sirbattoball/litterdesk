"""
Email service via Resend (https://resend.com)
Clean transactional emails for LitterDesk.
"""
import resend
from app.config import settings
import logging

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY


def send_email(
    to: str,
    subject: str,
    body: str,
    reply_to: str = None,
    html: str = None,
) -> bool:
    """Send a plain-text or HTML email via Resend."""
    try:
        params = {
            "from": f"LitterDesk <{settings.FROM_EMAIL}>",
            "to": [to],
            "subject": subject,
        }

        if html:
            params["html"] = html
        else:
            # Wrap plain text in minimal HTML
            params["html"] = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: inline-block;">
    <span style="color: #15803d; font-weight: 600;">🐾 LitterDesk</span>
  </div>
  <div style="white-space: pre-wrap; line-height: 1.6;">{body}</div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">
    LitterDesk · Breeder Operations Platform<br>
    <a href="https://litterdesk.com/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
  </p>
</body>
</html>"""

        if reply_to:
            params["reply_to"] = reply_to

        resend.Emails.send(params)
        logger.info(f"Email sent to {to}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False


def send_contract_email(
    buyer_email: str,
    buyer_name: str,
    breeder_name: str,
    kennel_name: str,
    sign_url: str,
    puppy_details: str,
) -> bool:
    """Send a contract signing invitation to a buyer."""
    html = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: inline-block;">
    <span style="color: #15803d; font-weight: 600;">🐾 LitterDesk</span>
  </div>

  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Your Puppy Contract is Ready</h2>
  <p style="color: #6b7280; margin-bottom: 24px;">From {kennel_name} ({breeder_name})</p>

  <p>Hi {buyer_name},</p>
  <p>Your sale contract for <strong>{puppy_details}</strong> is ready to review and sign.</p>
  <p>Please click the button below to review the contract. Signing takes less than 2 minutes.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{sign_url}"
       style="background: #15803d; color: white; text-decoration: none; padding: 14px 32px;
              border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
      Review & Sign Contract →
    </a>
  </div>

  <p style="font-size: 14px; color: #6b7280;">
    This link is unique to you. If you have questions, reply directly to this email
    and {breeder_name} will get back to you.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">
    Powered by LitterDesk · <a href="{sign_url}" style="color: #9ca3af;">View contract</a>
  </p>
</body>
</html>"""

    return send_email(
        to=buyer_email,
        subject=f"Action required: Sign your puppy contract from {kennel_name}",
        body="",
        html=html,
    )


def send_deposit_receipt(
    buyer_email: str,
    buyer_name: str,
    kennel_name: str,
    amount: float,
    breed: str,
    go_home_date: str = None,
) -> bool:
    """Send deposit confirmation to buyer."""
    return send_email(
        to=buyer_email,
        subject=f"Deposit received — {breed} puppy from {kennel_name}",
        body=f"Hi {buyer_name},\n\n"
             f"We've received your deposit of ${amount:,.2f} for a {breed} puppy from {kennel_name}.\n\n"
             f"{'Go-home date: ' + go_home_date if go_home_date else 'We will be in touch with your go-home date.'}\n\n"
             f"Thank you — we can't wait for you to meet your new puppy!\n\n"
             f"— {kennel_name} via LitterDesk"
    )
