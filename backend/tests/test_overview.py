"""Dashboard overview: setup checklist, numbers, pipeline and next best actions."""
import unittest
from datetime import date, datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import Buyer, BuyerLitterMatch, Contract, Dog, Litter, User
from app.routers import dashboard
from app.routers.auth import get_active_user

NOW = datetime.now(timezone.utc)


class OverviewTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.me = User(id="me", email="me@kennel.com", hashed_password="x", full_name="Me Breeder")
        self.other = User(id="other", email="o@kennel.com", hashed_password="x", full_name="Other")
        self.db.add_all([self.me, self.other]); self.db.commit()
        app = FastAPI(); app.include_router(dashboard.router, prefix="/api/dashboard")
        def _db():
            yield self.db
        app.dependency_overrides[get_db] = _db
        app.dependency_overrides[get_active_user] = lambda: self.me
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close(); self.engine.dispose()

    def get(self):
        r = self.client.get("/api/dashboard/overview"); self.assertEqual(r.status_code, 200, r.text); return r.json()

    def test_brand_new_account_is_all_zero_with_empty_checklist(self):
        d = self.get()
        self.assertEqual((d["setup"]["done"], d["setup"]["total"]), (0, 5))
        self.assertTrue(all(not i["done"] for i in d["setup"]["items"]))
        self.assertEqual(d["litters"], []); self.assertEqual(d["actions"], []); self.assertEqual(d["upcoming"], [])
        self.assertEqual(d["kpis"]["expected_revenue"], 0)
        self.assertEqual([p["count"] for p in d["pipeline"]], [0] * 6)

    def test_populated_account(self):
        db = self.db
        db.add(Dog(id="d1", owner_id="me", name="Bella", breed="Golden Retriever", sex="female"))
        l1 = Litter(id="l1", breeder_id="me", breed="Golden Retriever", name="Spring litter", status="pregnant",
                    num_males=2, num_females=3, puppy_price=2000, deposit_amount=300,
                    due_date=date.today() - timedelta(days=2), go_home_date=date.today() + timedelta(days=60))
        l2 = Litter(id="l2", breeder_id="me", breed="Labrador", status="planned", num_males=0, num_females=0, waitlist_open=True)
        l3 = Litter(id="l3", breeder_id="me", breed="Golden Retriever", status="complete", num_males=4, num_females=4, puppy_price=9999)
        lo = Litter(id="lo", breeder_id="other", breed="Poodle", status="ready", num_males=9, num_females=9, puppy_price=5000)
        db.add_all([l1, l2, l3, lo])
        b1 = Buyer(id="b1", breeder_id="me", full_name="Ann Lee", email="ann@x.com", status="waitlisted",
                   follow_up_date=NOW - timedelta(days=2))
        b2 = Buyer(id="b2", breeder_id="me", full_name="Bo Chan", email="bo@x.com", status="deposit_paid")
        b3 = Buyer(id="b3", breeder_id="me", full_name="Cy Dunn", email="cy@x.com", status="inquiry", created_at=NOW - timedelta(days=2))
        bo = Buyer(id="bo", breeder_id="other", full_name="Not Mine", email="n@x.com", status="inquiry")
        db.add_all([b1, b2, b3, bo]); db.commit()
        db.add_all([
            BuyerLitterMatch(buyer_id="b1", litter_id="l1", position=1, deposit_paid=False),
            BuyerLitterMatch(buyer_id="b2", litter_id="l1", position=2, deposit_paid=True),  # falls back to litter deposit
            BuyerLitterMatch(buyer_id="bo", litter_id="lo", position=1, deposit_paid=True, deposit_amount=500),
            Contract(id="c1", breeder_id="me", buyer_id="b2", litter_id="l1", status="sent", sent_at=NOW - timedelta(days=5)),
            Contract(id="c2", breeder_id="me", buyer_id="b1", litter_id="l1", status="draft"),
            Contract(id="c3", breeder_id="me", buyer_id="b3", status="voided"),
        ]); db.commit()

        d = self.get()
        k = d["kpis"]
        self.assertEqual(k["expected_revenue"], 10000)            # 5 pups x 2000, finished and other breeders excluded
        self.assertEqual((k["deposits_held"], k["deposits_count"]), (300, 1))
        self.assertEqual((k["puppies_expected"], k["buyers_waiting"], k["open_spots"]), (5, 2, 3))
        self.assertEqual((k["active_litters"], k["total_buyers"]), (2, 3))
        self.assertEqual({p["status"]: p["count"] for p in d["pipeline"]},
                         {"inquiry": 1, "waitlisted": 1, "deposit_paid": 1, "matched": 0, "contract_sent": 0, "complete": 0})
        self.assertEqual([x["id"] for x in d["litters"]], ["l1", "l2"])   # soonest go-home first
        self.assertEqual(d["litters"][0]["waitlist"], 2); self.assertEqual(d["litters"][0]["deposits"], 1)
        self.assertEqual(d["litters"][0]["stage"], 1)
        done = {i["key"]: i["done"] for i in d["setup"]["items"]}
        self.assertEqual(done, {"dog": True, "litter": True, "buyer": True, "waitlist": True, "contract": True, "payouts": False})
        self.assertEqual(d["setup"]["done"], 5)

        keys = [a["key"] for a in d["actions"]]
        self.assertIn("follow-b1", keys)                       # overdue follow-up
        self.assertIn("status-l1", keys)                       # past due date, still "pregnant"
        self.assertIn("reply-b3", keys)                        # inquiry sitting for 2 days
        self.assertIn("unsigned-c1", keys)                     # sent 5 days ago
        self.assertIn("drafts", keys); self.assertIn("deposits", keys)
        self.assertEqual(len(d["actions"]), 6)                 # 7 candidates, lowest priority ("empty-l2") dropped
        self.assertNotIn("not-mine", " ".join(keys))
        tones = [a["tone"] for a in d["actions"]]
        self.assertEqual(tones, sorted(tones, key=lambda t: {"urgent": 0}.get(t, 1)))   # urgent first
        self.assertLessEqual(len(d["actions"]), 6)
        self.assertTrue(any(e["kind"] == "go_home" for e in d["upcoming"]))
        self.assertEqual([e["date"] for e in d["upcoming"]], sorted(e["date"] for e in d["upcoming"]))

    def test_empty_waitlist_nudge_when_nothing_more_urgent(self):
        self.db.add(Litter(id="l2", breeder_id="me", breed="Labrador", name="Fall litter", status="planned", waitlist_open=True))
        self.db.commit()
        a = self.get()["actions"]
        self.assertEqual([x["key"] for x in a], ["empty-l2"]); self.assertIn("Fall litter", a[0]["title"])

    def test_other_breeders_data_never_leaks(self):
        self.db.add(Litter(id="lo", breeder_id="other", breed="Poodle", status="ready", num_males=9, num_females=9, puppy_price=5000))
        self.db.add(Buyer(id="bo", breeder_id="other", full_name="Not Mine", email="n@x.com", status="inquiry",
                          follow_up_date=NOW - timedelta(days=9)))
        self.db.commit()
        d = self.get()
        self.assertEqual(d["kpis"]["expected_revenue"], 0); self.assertEqual(d["litters"], [])
        self.assertEqual(d["actions"], []); self.assertEqual(d["setup"]["done"], 0)


if __name__ == "__main__":
    unittest.main()
