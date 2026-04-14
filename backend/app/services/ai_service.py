"""
LitterDesk AI Agent Service
Powered by Claude (Anthropic) for contract generation,
buyer scoring, follow-up drafting, and match recommendations.
"""
import anthropic
from app.config import settings
from typing import Optional

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are an expert dog breeding business assistant for LitterDesk.
You help professional dog breeders manage their operations. You understand:
- AKC and other kennel club regulations
- Breed-specific health testing requirements (OFA, CAER, EMBARK, etc.)
- Puppy sale contracts and what makes them legally sound
- Buyer qualification and waitlist management
- The emotional and business dynamics of dog breeding

Always be professional, warm, and precise. When generating contracts, be thorough.
When scoring buyers, be fair and based on stated criteria."""


def generate_contract(
    breeder_name: str,
    kennel_name: str,
    buyer_name: str,
    buyer_address: str,
    breed: str,
    puppy_name: Optional[str],
    puppy_sex: str,
    dob: str,
    sire_name: str,
    dam_name: str,
    sale_price: float,
    deposit_amount: float,
    balance_due_date: str,
    go_home_date: str,
    health_guarantee_months: int = 24,
    spay_neuter_required: bool = True,
) -> str:
    """Generate a complete, legally-informed puppy sale contract."""

    prompt = f"""Generate a complete puppy sale contract for the following transaction.
The contract must be professional, thorough, and protect both parties.

BREEDER: {breeder_name} ({kennel_name})
BUYER: {buyer_name}, {buyer_address}
BREED: {breed}
PUPPY: {puppy_name or "TBD"}, {puppy_sex}, DOB: {dob}
PARENTS: Sire: {sire_name} | Dam: {dam_name}
SALE PRICE: ${sale_price:,.2f}
DEPOSIT PAID: ${deposit_amount:,.2f}
BALANCE DUE: ${sale_price - deposit_amount:,.2f} by {balance_due_date}
GO HOME DATE: {go_home_date}
HEALTH GUARANTEE: {health_guarantee_months} months
SPAY/NEUTER REQUIRED: {"Yes" if spay_neuter_required else "No (breeding rights included)"}

Generate a complete contract including:
1. Parties and puppy identification
2. Purchase price and payment terms
3. Health guarantee (specify what's covered and exclusions)
4. Veterinary examination requirement (within 72 hours)
5. Return policy (breeder right of first refusal)
6. {"Spay/neuter requirement with timeline" if spay_neuter_required else "Breeding rights and AKC registration transfer"}
7. Buyer responsibilities (care standards, prohibited activities)
8. Breeder representations (vaccinations, deworming schedule)
9. Liability limitations
10. Governing law and signatures section

Format as a proper legal document with clear section headings. Include signature lines at the end."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text


def score_buyer(
    breed: str,
    buyer_name: str,
    lifestyle_notes: str,
    experience_level: str,
    sex_preference: str,
    color_preference: str,
    city: str,
    state: str,
) -> dict:
    """Score a buyer 0-100 and generate AI notes about their fit."""

    prompt = f"""Evaluate this puppy buyer for a {breed} puppy and provide a score from 0-100.

BUYER: {buyer_name}
LOCATION: {city}, {state}
EXPERIENCE: {experience_level}
SEX PREFERENCE: {sex_preference}
COLOR PREFERENCE: {color_preference or 'No preference'}
LIFESTYLE/HOME NOTES: {lifestyle_notes}

Scoring criteria (respond in JSON):
- Experience with the breed
- Appropriate home environment for this breed
- Realistic expectations
- Commitment signals
- Red flags (if any)

Respond ONLY with valid JSON in this exact format:
{{
  "score": 75,
  "summary": "Two-sentence summary of buyer fit",
  "strengths": ["strength 1", "strength 2"],
  "concerns": ["concern 1"],
  "recommended_questions": ["What question to ask them?"]
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=600,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    text = message.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def draft_followup_email(
    buyer_name: str,
    breeder_name: str,
    kennel_name: str,
    context: str,
    email_type: str,  # "inquiry_response", "waitlist_update", "deposit_request", "go_home_reminder"
    litter_details: Optional[str] = None,
) -> dict:
    """Draft a professional follow-up email from breeder to buyer."""

    templates = {
        "inquiry_response": "responding to an initial inquiry about a puppy",
        "waitlist_update": "updating a waitlisted buyer on litter progress",
        "deposit_request": "requesting a deposit to hold a puppy spot",
        "go_home_reminder": "reminding a buyer their puppy is almost ready to go home",
        "contract_followup": "following up on an unsigned contract",
    }

    action = templates.get(email_type, "following up with a buyer")

    prompt = f"""Draft a professional, warm email from a dog breeder to a buyer.

SCENARIO: {action}
FROM: {breeder_name}, {kennel_name}
TO: {buyer_name}
CONTEXT: {context}
{f"LITTER DETAILS: {litter_details}" if litter_details else ""}

Write a genuine, personable email that:
- Sounds like a real breeder, not a corporate email
- Is appropriately warm but professional
- Gets to the point without being abrupt
- Is 100-200 words

Respond in JSON:
{{
  "subject": "Email subject line",
  "body": "Full email body"
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def match_buyers_to_litter(
    breed: str,
    litter_details: str,
    available_puppies: list,
    buyers: list,
) -> list:
    """Rank buyers against available puppies in a litter."""

    buyers_str = "\n".join([
        f"- {b['name']} (score:{b['score']}, pref:{b['sex_pref']}, {b['experience']})"
        for b in buyers
    ])
    puppies_str = "\n".join([
        f"- {p['collar']}: {p['sex']}, {p['color']}"
        for p in available_puppies
    ])

    prompt = f"""Match buyers to available puppies in this {breed} litter.

LITTER: {litter_details}
AVAILABLE PUPPIES:
{puppies_str}

BUYERS ON WAITLIST (in order):
{buyers_str}

Create optimal matches considering buyer preferences, waitlist order, and puppy characteristics.
Respond in JSON as a list of matches:
[
  {{
    "buyer_name": "Name",
    "puppy_collar": "Green collar",
    "match_reason": "Why this is a good match",
    "match_score": 88
  }}
]"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def generate_litter_update(
    breed: str,
    litter_name: str,
    whelp_date: str,
    num_males: int,
    num_females: int,
    notes: str,
    photos_count: int,
) -> str:
    """Generate a shareable litter announcement for social media or email."""

    prompt = f"""Write an exciting, warm litter announcement for a dog breeder to share.

BREED: {breed}
LITTER: {litter_name}
WHELPED: {whelp_date}
COUNT: {num_males} males, {num_females} females
NOTES: {notes}
PHOTOS: {photos_count} photos available

Write two versions:
1. An email version (2-3 paragraphs, warm and personal)
2. A social media caption (energetic, with relevant hashtags)

Format as JSON:
{{
  "email": "...",
  "social": "..."
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
