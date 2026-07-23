"""
Lead nurture sequence — sent to landing-page email captures who haven't signed up yet.

Sequence runs off Lead.nurture_step (0-indexed) and days since Lead.created_at.
Step 0 (the welcome email + template delivery) is sent immediately at capture,
in app/routers/leads.py. This file covers steps 1-4, the follow-up sequence.
"""

REGISTER_URL = "https://litterdesk.vercel.app/register"

# (days_since_capture_required, step_key)
NURTURE_SCHEDULE = [
    (2, "buyer_chaos"),
    (4, "contract_pain"),
    (6, "deposit_chase"),
    (9, "trial_push"),
]


def _wrap(inner_html: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: inline-block;">
    <span style="color: #15803d; font-weight: 600;">🐾 LitterDesk</span>
  </div>
  {inner_html}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">
    LitterDesk · Breeder Operations Platform<br>
    <a href="https://litterdesk.com/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
  </p>
</body>
</html>
"""


NURTURE_EMAILS = {

    "buyer_chaos": {
        "subject": "The $3,500 lead that got lost in a text thread",
        "html": _wrap(f"""
  <p>Hey,</p>
  <p>Quick question — when you get a puppy inquiry right now, where does it actually live? A text? An Instagram DM? An email you meant to reply to?</p>
  <p>Most small-scale breeders we talk to are juggling all three at once, for every litter. It works fine right up until a serious buyer — someone ready to put down a deposit — gets buried under twenty "is this still available" messages and you don't follow up in time.</p>
  <p>That's the one thing LitterDesk was actually built to fix first: every inquiry becomes a profile, and every buyer moves through one visible pipeline — <strong>inquiry → waitlisted → deposit paid → matched → complete</strong>. You always know who's next, and nobody falls through the cracks because they texted instead of emailed.</p>
  <p style="margin: 28px 0;">
    <a href="{REGISTER_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">See the buyer pipeline →</a>
  </p>
  <p>7 days free, no card required if you want to poke around.</p>
  <p>— The LitterDesk team</p>
"""),
    },

    "contract_pain": {
        "subject": "About that template I sent you",
        "html": _wrap(f"""
  <p>Hey,</p>
  <p>Hope the buyer agreement template's been useful. One honest thing about it, though: it's still a static Word doc. You're filling in the same fields by hand every single time a puppy sells, then emailing it, then waiting on a scanned signature (or a phone photo of one, more realistically).</p>
  <p>That's the exact busywork LitterDesk's contract tool exists to remove. You fill out one short form per litter, it drafts the full contract for that specific buyer and puppy, and they sign right from their phone — no printing, no scanning, no "did you get my email" back-and-forth. You get notified the second it's signed.</p>
  <p>Breeders using it are doing contracts in a couple minutes instead of the better part of an hour.</p>
  <p style="margin: 28px 0;">
    <a href="{REGISTER_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Try the contract tool →</a>
  </p>
  <p>— The LitterDesk team</p>
"""),
    },

    "deposit_chase": {
        "subject": "Venmo screenshots aren't a payment system",
        "html": _wrap(f"""
  <p>Hey,</p>
  <p>Here's a pattern almost every breeder we talk to has lived through: a buyer says they sent the deposit, you're digging through Venmo or Zelle trying to confirm it actually landed, and meanwhile you're not 100% sure which of your six waitlisted buyers have actually paid and which are just talking.</p>
  <p>LitterDesk collects deposits straight through Stripe and logs them automatically against the buyer's profile — no more cross-referencing screenshots, no more "wait, did they actually pay?" You see who's paid, who hasn't, and your money moves to your account on a normal payout schedule.</p>
  <p style="margin: 28px 0;">
    <a href="{REGISTER_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">See how deposits work →</a>
  </p>
  <p>— The LitterDesk team</p>
"""),
    },

    "trial_push": {
        "subject": "Should we stop emailing you?",
        "html": _wrap(f"""
  <p>Hey,</p>
  <p>This is the last one from me for a while — didn't want to keep filling your inbox if the timing's not right.</p>
  <p>Quick recap of what LitterDesk actually does, in case the earlier emails got buried (fittingly enough): one pipeline for every buyer inquiry, contracts that get drafted and e-signed in minutes instead of an afternoon, and deposits that track themselves instead of living in a Venmo scroll.</p>
  <p>It's a 7-day free trial, no credit card required, so there's genuinely nothing to lose by looking. If it's not for you, no hard feelings — you keep the buyer agreement template either way.</p>
  <p style="margin: 28px 0;">
    <a href="{REGISTER_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Start your free trial →</a>
  </p>
  <p>— The LitterDesk team</p>
"""),
    },

}
