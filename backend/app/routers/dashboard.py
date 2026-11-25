import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta, timezone

from app.database import get_db
from app.models import User, Dog, Litter, Buyer, Contract, BuyerLitterMatch
from app.routers.auth import get_active_user as get_current_user
from app.schemas import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_statuses = ["planned", "pregnant", "born", "weaning", "ready"]

    active_litters = db.query(Litter).filter(
        Litter.breeder_id == current_user.id,
        Litter.status.in_(active_statuses)
    ).count()

    total_buyers = db.query(Buyer).filter(
        Buyer.breeder_id == current_user.id
    ).count()

    buyers_with_deposit = db.query(BuyerLitterMatch).join(
        Litter, BuyerLitterMatch.litter_id == Litter.id
    ).filter(
        Litter.breeder_id == current_user.id,
        BuyerLitterMatch.deposit_paid == True
    ).count()

    available_puppies = db.query(Litter).filter(
        Litter.breeder_id == current_user.id,
        Litter.status.in_(["born", "weaning", "ready"])
    ).with_entities(
        func.sum(Litter.num_males + Litter.num_females)
    ).scalar() or 0

    contracts_pending = db.query(Contract).filter(
        Contract.breeder_id == current_user.id,
        Contract.status.in_(["sent", "draft"])
    ).count()

    follow_ups_due = db.query(Buyer).filter(
        Buyer.breeder_id == current_user.id,
        Buyer.follow_up_date <= datetime.now(timezone.utc) + timedelta(days=1),
        ~Buyer.status.in_(["complete", "declined"]),
    ).count()

    return DashboardStats(
        active_litters=active_litters,
        total_buyers=total_buyers,
        buyers_with_deposit=buyers_with_deposit,
        available_puppies=int(available_puppies),
        contracts_pending=contracts_pending,
        revenue_this_month=0.0,  # Would compute from Stripe in production
        follow_ups_due=follow_ups_due,
    )


@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recent_buyers = db.query(Buyer).filter(
        Buyer.breeder_id == current_user.id,
    ).order_by(Buyer.created_at.desc()).limit(5).all()

    recent_litters = db.query(Litter).filter(
        Litter.breeder_id == current_user.id
    ).order_by(Litter.updated_at.desc()).limit(3).all()

    activity = []
    for buyer in recent_buyers:
        activity.append({
            "type": "buyer_added",
            "description": f"New inquiry from {buyer.full_name}",
            "timestamp": buyer.created_at,
        })
    for litter in recent_litters:
        activity.append({
            "type": "litter_updated",
            "description": f"{litter.name or litter.breed + ' litter'} — {litter.status.replace('_', ' ').title() if litter.status else ''}",
            "timestamp": litter.updated_at,
        })

    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    return activity[:10]


# ─── Overview ────────────────────────────────────────────────────────────────

ACTIVE_LITTER_STATUSES = ["planned", "pregnant", "born", "weaning", "ready"]
STAGE_INDEX = {"planned": 0, "pregnant": 1, "born": 2, "weaning": 3, "ready": 4}
PIPELINE = [
    ("inquiry", "Inquiry"),
    ("waitlisted", "Waitlisted"),
    ("deposit_paid", "Deposit paid"),
    ("matched", "Matched"),
    ("contract_sent", "Contract sent"),
    ("complete", "Complete"),
]


def _val(x):
    return x.value if hasattr(x, "value") else x


def _aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _fmt(d):
    return f"{d.strftime('%b')} {d.day}"


def _days(d, today):
    return (d - today).days if d else None


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Everything the dashboard needs in one request."""
    uid = current_user.id
    now = datetime.now(timezone.utc)
    today = now.date()

    litters = db.query(Litter).filter(Litter.breeder_id == uid).all()
    litter_by_id = {l.id: l for l in litters}
    active = [l for l in litters if _val(l.status) in ACTIVE_LITTER_STATUSES]
    buyers = db.query(Buyer).filter(Buyer.breeder_id == uid).all()
    buyer_by_id = {b.id: b for b in buyers}
    matches = (
        db.query(BuyerLitterMatch)
        .join(Litter, BuyerLitterMatch.litter_id == Litter.id)
        .filter(Litter.breeder_id == uid)
        .all()
    )
    contracts = db.query(Contract).filter(
        Contract.breeder_id == uid, Contract.status != "voided"
    ).all()
    dog_count = db.query(Dog).filter(Dog.owner_id == uid, Dog.is_active == True).count()  # noqa: E712

    # ── Setup checklist ──
    sent_or_signed = [c for c in contracts if _val(c.status) in ("sent", "signed")]
    items = [
        {"key": "dog", "label": "Add a dog", "hint": "Dam, sire, or a stud you use", "done": dog_count > 0, "href": "/dashboard/dogs/new", "cta": "Add dog"},
        {"key": "litter", "label": "Create a litter", "hint": "Planned or current, either works", "done": len(litters) > 0, "href": "/dashboard/litters/new", "cta": "New litter"},
        {"key": "buyer", "label": "Add a buyer", "hint": "Anyone who has asked about a puppy", "done": len(buyers) > 0, "href": "/dashboard/buyers/new", "cta": "Add buyer"},
        {"key": "waitlist", "label": "Put a buyer on a waitlist", "hint": "Their place in line is saved for you", "done": len(matches) > 0, "href": "/dashboard/buyers" if buyers else "/dashboard/buyers/new", "cta": "Open buyers"},
        {"key": "contract", "label": "Send a contract for signing", "hint": "The buyer signs from a link, no account", "done": len(sent_or_signed) > 0, "href": "/dashboard/contracts/new", "cta": "New contract"},
    ]
    setup = {
        "items": items,
        "done": sum(1 for i in items if i["done"]),
        "total": len(items),
    }

    # ── Litter cards ──
    waitlist_by_litter, deposits_by_litter, deposit_sum_by_litter = {}, {}, {}
    for m in matches:
        waitlist_by_litter[m.litter_id] = waitlist_by_litter.get(m.litter_id, 0) + 1
        if m.deposit_paid:
            deposits_by_litter[m.litter_id] = deposits_by_litter.get(m.litter_id, 0) + 1
            amt = m.deposit_amount or (litter_by_id[m.litter_id].deposit_amount if m.litter_id in litter_by_id else 0) or 0
            deposit_sum_by_litter[m.litter_id] = deposit_sum_by_litter.get(m.litter_id, 0) + amt

    def sort_key(l):
        return (l.go_home_date or date.max, l.created_at.timestamp() if l.created_at else 0)

    litter_cards = []
    for l in sorted(active, key=sort_key)[:6]:
        puppies = (l.num_males or 0) + (l.num_females or 0)
        wl = waitlist_by_litter.get(l.id, 0)
        litter_cards.append({
            "id": l.id,
            "name": l.name or f"{l.breed} litter",
            "breed": l.breed,
            "status": _val(l.status),
            "stage": STAGE_INDEX.get(_val(l.status), 0),
            "due_date": l.due_date.isoformat() if l.due_date else None,
            "go_home_date": l.go_home_date.isoformat() if l.go_home_date else None,
            "days_to_go_home": _days(l.go_home_date, today),
            "puppies": puppies,
            "waitlist": wl,
            "deposits": deposits_by_litter.get(l.id, 0),
            "open_spots": max(puppies - wl, 0) if puppies else None,
            "puppy_price": l.puppy_price,
            "waitlist_open": bool(l.waitlist_open),
        })

    # ── Numbers ──
    expected_revenue = sum((l.puppy_price or 0) * ((l.num_males or 0) + (l.num_females or 0)) for l in active)
    active_ids = {l.id for l in active}
    deposits_held = sum(v for k, v in deposit_sum_by_litter.items() if k in active_ids)
    deposits_count = sum(v for k, v in deposits_by_litter.items() if k in active_ids)
    puppies_expected = sum((l.num_males or 0) + (l.num_females or 0) for l in active)
    waiting = sum(v for k, v in waitlist_by_litter.items() if k in active_ids)
    kpis = {
        "expected_revenue": float(expected_revenue),
        "deposits_held": float(deposits_held),
        "deposits_count": deposits_count,
        "puppies_expected": puppies_expected,
        "buyers_waiting": waiting,
        "open_spots": max(puppies_expected - waiting, 0) if puppies_expected else 0,
        "active_litters": len(active),
        "total_buyers": len(buyers),
    }

    # ── Pipeline ──
    counts = {k: 0 for k, _ in PIPELINE}
    for b in buyers:
        k = _val(b.status)
        if k in counts:
            counts[k] += 1
    pipeline = [{"status": k, "label": label, "count": counts[k]} for k, label in PIPELINE]

    # ── Next best actions ──
    actions = []
    soon = now + timedelta(days=1)
    live_buyers = [b for b in buyers if _val(b.status) not in ("complete", "declined")]

    for b in sorted([b for b in live_buyers if b.follow_up_date and _aware(b.follow_up_date) <= soon],
                    key=lambda b: _aware(b.follow_up_date))[:3]:
        overdue = _aware(b.follow_up_date) < now - timedelta(hours=12)
        actions.append({
            "key": f"follow-{b.id}", "tone": "urgent" if overdue else "normal",
            "title": f"Follow up with {b.full_name}",
            "detail": ("Overdue since " if overdue else "Due ") + _fmt(_aware(b.follow_up_date)),
            "href": f"/dashboard/buyers/{b.id}", "cta": "Open buyer",
        })

    fresh = [b for b in live_buyers if _val(b.status) == "inquiry" and not b.last_contacted
             and b.created_at and _aware(b.created_at) < now - timedelta(hours=12)]
    for b in sorted(fresh, key=lambda b: _aware(b.created_at))[:2]:
        actions.append({
            "key": f"reply-{b.id}", "tone": "normal",
            "title": f"Reply to {b.full_name}",
            "detail": "New inquiry with no reply logged yet",
            "href": f"/dashboard/buyers/{b.id}", "cta": "Reply",
        })

    for c in sorted([c for c in contracts if _val(c.status) == "sent" and c.sent_at and _aware(c.sent_at) < now - timedelta(days=3)],
                    key=lambda c: _aware(c.sent_at))[:2]:
        who = buyer_by_id[c.buyer_id].full_name if c.buyer_id in buyer_by_id else "Your buyer"
        actions.append({
            "key": f"unsigned-{c.id}", "tone": "normal",
            "title": f"{who} has not signed yet",
            "detail": f"Sent {_fmt(_aware(c.sent_at))}",
            "href": f"/dashboard/contracts/{c.id}", "cta": "View contract",
        })

    drafts = [c for c in contracts if _val(c.status) == "draft"]
    if drafts:
        actions.append({
            "key": "drafts", "tone": "normal",
            "title": f"{len(drafts)} contract draft{'s' if len(drafts) != 1 else ''} not sent",
            "detail": "Review and send for signing",
            "href": "/dashboard/contracts", "cta": "Open contracts",
        })

    paid_buyers = {m.buyer_id for m in matches if m.deposit_paid}
    waiting_buyers = {m.buyer_id for m in matches if m.litter_id in active_ids}
    no_deposit = [b for b in live_buyers if b.id in waiting_buyers and b.id not in paid_buyers]
    if no_deposit:
        actions.append({
            "key": "deposits", "tone": "normal",
            "title": f"{len(no_deposit)} waitlisted buyer{'s' if len(no_deposit) != 1 else ''} without a deposit",
            "detail": "A deposit is what turns interest into a sale",
            "href": "/dashboard/buyers", "cta": "Review buyers",
        })

    for l in active:
        if l.due_date and l.due_date < today and _val(l.status) in ("planned", "pregnant"):
            actions.append({
                "key": f"status-{l.id}", "tone": "urgent",
                "title": f"Update {l.name or l.breed + ' litter'}",
                "detail": f"Due date was {_fmt(l.due_date)}. Has the litter arrived?",
                "href": f"/dashboard/litters/{l.id}", "cta": "Update status",
            })
        elif waitlist_by_litter.get(l.id, 0) == 0 and l.waitlist_open:
            actions.append({
                "key": f"empty-{l.id}", "tone": "normal",
                "title": f"No buyers yet for {l.name or l.breed + ' litter'}",
                "detail": "Add the people who already asked about this litter",
                "href": "/dashboard/buyers/new", "cta": "Add buyer",
            })

    order = {"urgent": 0, "normal": 1}
    actions.sort(key=lambda a: order[a["tone"]])
    actions = actions[:6]

    # ── Upcoming ──
    horizon = today + timedelta(days=120)
    upcoming = []
    for l in active:
        nm = l.name or f"{l.breed} litter"
        if l.due_date and today <= l.due_date <= horizon and _val(l.status) in ("planned", "pregnant"):
            upcoming.append({"date": l.due_date.isoformat(), "kind": "due", "title": f"{nm} due", "href": f"/dashboard/litters/{l.id}"})
        if l.go_home_date and today <= l.go_home_date <= horizon:
            upcoming.append({"date": l.go_home_date.isoformat(), "kind": "go_home", "title": f"{nm} go-home day", "href": f"/dashboard/litters/{l.id}"})
    for b in live_buyers:
        if b.follow_up_date and today <= _aware(b.follow_up_date).date() <= horizon:
            upcoming.append({"date": _aware(b.follow_up_date).date().isoformat(), "kind": "follow_up", "title": f"Follow up with {b.full_name}", "href": f"/dashboard/buyers/{b.id}"})
    for c in contracts:
        if c.balance_due_date and today <= c.balance_due_date <= horizon and _val(c.status) != "draft":
            who = buyer_by_id[c.buyer_id].full_name if c.buyer_id in buyer_by_id else "buyer"
            upcoming.append({"date": c.balance_due_date.isoformat(), "kind": "balance", "title": f"Balance due from {who}", "href": f"/dashboard/contracts/{c.id}"})
    upcoming.sort(key=lambda e: e["date"])

    sample_loaded = any(
        (l.notes == SAMPLE_TAG) for l in litters
    ) or any((b.referral_source == SAMPLE_TAG) for b in buyers)

    return {
        "sample": sample_loaded,
        "setup": setup,
        "kpis": kpis,
        "pipeline": pipeline,
        "litters": litter_cards,
        "actions": actions,
        "upcoming": upcoming[:6],
    }


# ─── Sample kennel ────────────────────────────────────────────────────────────
# Lets a new account see a full dashboard in one click. Every row carries
# SAMPLE_TAG so it can be removed without touching real data.

SAMPLE_TAG = "[sample]"


def _sample_rows(db, uid):
    dogs = db.query(Dog).filter(Dog.owner_id == uid, Dog.health_notes == SAMPLE_TAG).all()
    litters = db.query(Litter).filter(Litter.breeder_id == uid, Litter.notes == SAMPLE_TAG).all()
    buyers = db.query(Buyer).filter(Buyer.breeder_id == uid, Buyer.referral_source == SAMPLE_TAG).all()
    return dogs, litters, buyers


@router.post("/sample")
def load_sample(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id
    dogs, litters, buyers = _sample_rows(db, uid)
    if dogs or litters or buyers:
        raise HTTPException(status_code=409, detail="The sample kennel is already loaded.")
    real_buyers = db.query(Buyer).filter(Buyer.breeder_id == uid).count()
    if real_buyers:
        raise HTTPException(status_code=409, detail="The sample kennel is only for accounts with no buyers yet.")

    now = datetime.now(timezone.utc)
    today = now.date()
    d = lambda n: today + timedelta(days=n)  # noqa: E731
    t = lambda n: now + timedelta(days=n)  # noqa: E731

    honey = Dog(id=str(uuid.uuid4()), owner_id=uid, name="Honey", breed="Golden Retriever", sex="female",
                dob=d(-1100), color="Golden", health_notes=SAMPLE_TAG, registration_org="AKC")
    cooper = Dog(id=str(uuid.uuid4()), owner_id=uid, name="Cooper", breed="Golden Retriever", sex="male",
                 dob=d(-1300), color="Dark golden", health_notes=SAMPLE_TAG, registration_org="AKC")
    db.add_all([honey, cooper])
    db.flush()

    spring = Litter(id=str(uuid.uuid4()), breeder_id=uid, name="Spring Litter (sample)", breed="Golden Retriever",
                    status="born", sire_id=cooper.id, dam_id=honey.id, breeding_date=d(-84),
                    due_date=d(-21), whelp_date=d(-21), go_home_date=d(35), num_males=4, num_females=4,
                    puppy_price=2200, deposit_amount=300, notes=SAMPLE_TAG, waitlist_open=True)
    summer = Litter(id=str(uuid.uuid4()), breeder_id=uid, name="Summer Litter (sample)", breed="Golden Retriever",
                    status="pregnant", sire_id=cooper.id, dam_id=honey.id, breeding_date=d(45),
                    due_date=d(18), go_home_date=d(90), num_males=3, num_females=3,
                    puppy_price=2400, deposit_amount=300, notes=SAMPLE_TAG, waitlist_open=True)
    db.add_all([spring, summer])
    db.flush()

    def buyer(name, city, state, status, created_days_ago, follow=None, contacted=True):
        b = Buyer(id=str(uuid.uuid4()), breeder_id=uid, full_name=name,
                  email=f"sample-{uuid.uuid4().hex[:8]}@example.com", city=city, state=state,
                  breed_preference="Golden Retriever", status=status, referral_source=SAMPLE_TAG,
                  follow_up_date=follow, last_contacted=(t(-created_days_ago + 1) if contacted else None),
                  created_at=t(-created_days_ago))
        db.add(b)
        db.flush()
        return b

    def match(b, litter, pos, paid):
        m = BuyerLitterMatch(id=str(uuid.uuid4()), buyer_id=b.id, litter_id=litter.id, position=pos,
                             deposit_paid=paid, deposit_amount=300 if paid else None)
        db.add(m)
        return m

    sarah = buyer("Sarah Mitchell", "Austin", "TX", "deposit_paid", 40)
    marcus = buyer("Marcus Johnson", "Dallas", "TX", "contract_sent", 38)
    emily = buyer("Emily Carter", "Tulsa", "OK", "complete", 60)
    daniel = buyer("Daniel Reyes", "Plano", "TX", "waitlisted", 20, follow=t(-2))
    priya = buyer("Priya Patel", "Houston", "TX", "waitlisted", 14)
    walsh = buyer("Tom & Jenna Walsh", "Waco", "TX", "deposit_paid", 30)
    lauren = buyer("Lauren Kim", "Denver", "CO", "matched", 25)
    chris = buyer("Chris Alvarez", "Fort Worth", "TX", "inquiry", 2, contacted=False)
    hannah = buyer("Hannah Brooks", "Norman", "OK", "waitlisted", 9, follow=t(1))
    greg = buyer("Greg Foster", "Katy", "TX", "waitlisted", 6)
    natalie = buyer("Natalie Ford", "Irving", "TX", "deposit_paid", 12)

    for pos, (b, paid) in enumerate([(emily, True), (sarah, True), (marcus, True), (walsh, True),
                                     (lauren, True), (daniel, False), (priya, False)], start=1):
        match(b, spring, pos, paid)
    for pos, (b, paid) in enumerate([(natalie, True), (hannah, False), (greg, False)], start=1):
        match(b, summer, pos, paid)

    db.add(Contract(id=str(uuid.uuid4()), breeder_id=uid, buyer_id=marcus.id, litter_id=spring.id, status="sent",
                    title="Puppy Sales Agreement", content="Sample contract.", template_vars={"sample": True},
                    sale_price=2200, deposit_amount=300, balance_due=1900, balance_due_date=d(35),
                    sent_at=t(-5), sign_token=uuid.uuid4().hex))
    db.add(Contract(id=str(uuid.uuid4()), breeder_id=uid, buyer_id=emily.id, litter_id=spring.id, status="signed",
                    title="Puppy Sales Agreement", content="Sample contract.", template_vars={"sample": True},
                    sale_price=2200, deposit_amount=300, balance_due=1900, balance_due_date=d(35),
                    sent_at=t(-30), signed_at=t(-28), buyer_signature="Emily Carter", sign_token=uuid.uuid4().hex))
    db.commit()
    return {"loaded": True, "dogs": 2, "litters": 2, "buyers": 11}


@router.delete("/sample")
def remove_sample(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id
    dogs, litters, buyers = _sample_rows(db, uid)
    buyer_ids = [b.id for b in buyers]
    litter_ids = [l.id for l in litters]
    if buyer_ids:
        db.query(Contract).filter(Contract.buyer_id.in_(buyer_ids)).delete(synchronize_session=False)
        db.query(BuyerLitterMatch).filter(BuyerLitterMatch.buyer_id.in_(buyer_ids)).delete(synchronize_session=False)
    if litter_ids:
        db.query(BuyerLitterMatch).filter(BuyerLitterMatch.litter_id.in_(litter_ids)).delete(synchronize_session=False)
        db.query(Contract).filter(Contract.litter_id.in_(litter_ids)).delete(synchronize_session=False)
    for b in buyers:
        db.delete(b)
    for l in litters:
        db.delete(l)
    db.flush()
    for g in dogs:
        db.delete(g)
    db.commit()
    return {"removed": True}
