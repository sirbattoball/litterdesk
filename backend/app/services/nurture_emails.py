"""
Lead nurture sequence — sent to landing-page email captures who haven't signed up yet.

Sequence runs off Lead.nurture_step (0-indexed) and days since Lead.created_at.
Step 0 (the welcome email + template delivery) is sent immediately at capture,
in app/routers/leads.py. This file covers steps 1-4, the follow-up sequence.

Each email teaches one real, usable thing before ever mentioning LitterDesk —
not a pain-point-then-pitch structure. The product only shows up as "here's
the systematized version of what you just read," which is the whole point:
the free value has to stand on its own even for someone who never signs up.
"""

REGISTER_URL = "https://litterdesk.vercel.app/register"
BLOG_URL = "https://litterdesk.vercel.app/blog"

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
        "subject": "The 3-question filter for a new inquiry",
        "html": _wrap(f"""
  <p>Hey,</p>
  <p>Quick, usable thing before anything else: when a new inquiry comes in, three questions tell you more than a whole paragraph of enthusiasm will —</p>
  <ul style="padding-left:20px;line-height:1.8;">
    <li>Who's home during the day, and what does a normal day actually look like?</li>
    <li>Have they owned this breed before — what did they love, what surprised them?</li>
    <li>What's their plan for the first two weeks?</li>
  </ul>
  <p>Specific, thought-through answers are a real signal. Vague or rehearsed-sounding ones aren't disqualifying, but they're a reason to slow down instead of speeding up. (Full breakdown, including how to read a deposit-first hesitation, is on <a href="{BLOG_URL}/how-to-vet-a-buyer" style="color:#1a4730;">the blog</a> if you want the rest of it.)</p>
  <p>The part that's harder to fix with a checklist: doing this consistently once you've got 40 inquiries live across three different apps. That's the actual problem LitterDesk's buyer pipeline exists for — every inquiry becomes one profile, moving through one visible pipeline, so the vetting habit doesn't fall apart the moment you get busy.</p>
  <p style="margin: 28px 0;">
    <a href="{REGISTER_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">See the buyer pipeline →</a>
  </p>
  <p>7 days free, no card required if you just want to poke around.</p>
  <p>— The LitterDesk team</p>
"""),
    },

    "contract_pain": {
        "subject": "The contract clause almost everyone writes wrong",
        "html": _wrap(f"""
  <p>Hey,</p>
  <p>Real thing to check in whatever contract you're using right now: the return clause — what happens if the buyer can't keep the dog, in six months or six years.</p>
  <p>Most contracts either skip this entirely or leave it vague. A clause that explicitly says "buyer agrees to return the dog to breeder rather than rehome or surrender to a shelter" is doing real work — it's the difference between one of your dogs ending up back with you, or ending up in a shelter with no way for you to even find out. (The other clauses worth checking — health guarantee specifics, deposit terms, spay/neuter deadlines — are in <a href="{BLOG_URL}/what-belongs-in-a-puppy-contract" style="color:#1a4730;">the full breakdown</a>.)</p>
  <p>Once you know what a contract needs, the tedious part is just filling in the same fields by hand every time a puppy sells, then chasing a scanned signature. That's what LitterDesk's contract tool removes — one short form per litter, it drafts the specific contract, and the buyer signs from their phone. No printing, no "did you get my email."</p>
  <p style="margin: 28px 0;">
    <a href="{REGISTER_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Try the contract tool →</a>
  </p>
  <p>— The LitterDesk team</p>
"""),
    },

    "deposit_chase": {
        "subject": "A rule for deposits that costs nothing to start using",
        "html": _wrap(f"""
  <p>Hey,</p>
  <p>Free rule, works with or without any software: no name moves off "inquiry" and onto your actual waitlist until a deposit lands. Not a promise to pay, not "I'll send it Friday" — landed.</p>
  <p>It sounds obvious written down, but it's the rule almost every breeder we talk to has broken at least once — usually for someone who seemed serious. It's also the fastest way to tell a real buyer from someone still deciding: a buyer who balks at a deposit before meeting a puppy is telling you something worth knowing before you've held a spot for them for six weeks.</p>
  <p>Where this gets genuinely hard without a system: tracking who's actually paid across six waitlisted buyers when the proof is a Venmo screenshot buried in a text thread. LitterDesk collects deposits straight through Stripe and logs them against the buyer's profile automatically — no more "wait, did they actually pay?"</p>
  <p style="margin: 28px 0;">
    <a href="{REGISTER_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">See how deposits work →</a>
  </p>
  <p>— The LitterDesk team</p>
"""),
    },

    "trial_push": {
        "subject": "The two honest reasons people don't try it",
        "html": _wrap(f"""
  <p>Hey,</p>
  <p>This is the last one from me for a while, so let me just be direct about the two things people usually hesitate on:</p>
  <p><strong>"I don't have time to learn new software."</strong> Fair — but the setup is genuinely three steps: add a litter, add a dog, you're in. Most of what you'd "learn" is just clicking the same buttons you already use for texting and spreadsheets, in one place instead of six.</p>
  <p><strong>"My current system mostly works."</strong> Also fair, until the one time it doesn't — a deposit that never got confirmed, a contract clause that was assumed instead of written down, a serious buyer who got buried under twenty "is this still available" messages. LitterDesk doesn't fix a broken business. It just removes the specific moments where a working one quietly costs you money.</p>
  <p>It's a 7-day free trial. If it's not for you, you keep the buyer agreement template either way — no hard feelings.</p>
  <p style="margin: 28px 0;">
    <a href="{REGISTER_URL}" style="background:#1a4730;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Start your free trial →</a>
  </p>
  <p>— The LitterDesk team</p>
"""),
    },

}
