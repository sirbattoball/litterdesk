"""Welcome, trial-ending, trial-ended and nurture emails, plus the daily trigger."""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.models import Lead, User
from app.routers import internal
from app.services import lifecycle_emails as lc

NOW = datetime(2026, 12, 1, 12, 0, tzinfo=timezone.utc)


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close(); self.engine.dispose()

    def user(self, email, ends_in, **kw):
        u = User(id=email, email=email, hashed_password="x", full_name="Jane Breeder", trial_ends_at=NOW + ends_in, **kw)
        self.db.add(u); self.db.commit(); return u

    def run_job(self, now=NOW):
        with patch("app.services.email_service.send_email", return_value=True) as send:
            result = lc.run_trial_lifecycle(self.db, now=now)
        return result, send

    def test_warning_goes_out_once_with_correct_prices(self):
        u = self.user("jane@kennel.com", timedelta(days=1, hours=6))
        result, send = self.run_job()
        self.assertEqual(result, {"warning": 1, "ended": 0})
        kw = send.call_args.kwargs
        self.assertEqual(kw["to"], "jane@kennel.com"); self.assertIn("2 days", kw["subject"])
        self.assertIn("$39", kw["body"]); self.assertIn("$89", kw["body"])
        for stale in ("$29", "$79", "$149", "Kennel"): self.assertNotIn(stale, kw["body"])
        self.assertEqual(kw["reply_to"], settings.SUPPORT_EMAIL)
        self.db.refresh(u); self.assertIsNotNone(u.trial_warning_sent_at)
        _, again = self.run_job(NOW + timedelta(hours=3)); again.assert_not_called()  # never twice

    def test_no_warning_early_and_ended_email_after_expiry(self):
        u = self.user("early@kennel.com", timedelta(days=5))
        _, send = self.run_job(); send.assert_not_called()
        result, send = self.run_job(NOW + timedelta(days=5, hours=1))
        self.assertEqual(result["ended"], 1); self.assertIn("has ended", send.call_args.kwargs["subject"])
        self.assertIn("still saved", send.call_args.kwargs["body"])
        _, again = self.run_job(NOW + timedelta(days=6)); again.assert_not_called()

    def test_failed_send_is_retried_not_marked(self):
        u = self.user("retry@kennel.com", timedelta(days=1))
        with patch("app.services.email_service.send_email", return_value=False):
            self.assertEqual(lc.run_trial_lifecycle(self.db, now=NOW), {"warning": 0, "ended": 0})
        self.db.refresh(u); self.assertIsNone(u.trial_warning_sent_at)
        result, _ = self.run_job(); self.assertEqual(result["warning"], 1)

    def test_customers_old_expiries_and_test_domains_are_skipped(self):
        self.user("paid@kennel.com", timedelta(days=1), stripe_subscription_id="sub_1")          # a real customer
        self.user("stale@kennel.com", timedelta(days=-60))                                        # ended long ago
        self.user("qa@example.com", timedelta(days=1))                                            # test account
        result, send = self.run_job()
        self.assertEqual(result, {"warning": 0, "ended": 0}); send.assert_not_called()

    def test_welcome_email_needs_provider_and_real_address(self):
        u = User(id="1", email="new@kennel.com", hashed_password="x", full_name="Sam Smith")
        with patch.object(settings, "RESEND_API_KEY", ""), patch("app.services.email_service.send_email") as send:
            self.assertFalse(lc.send_welcome_email(u)); send.assert_not_called()
        with patch.object(settings, "RESEND_API_KEY", "key"), patch("app.services.email_service.send_email", return_value=True) as send:
            self.assertTrue(lc.send_welcome_email(u))
            self.assertTrue(send.call_args.kwargs["body"].startswith("Hi Sam,")); self.assertIn("/dashboard", send.call_args.kwargs["body"])
            send.reset_mock(); u.email = "qa@example.com"; self.assertFalse(lc.send_welcome_email(u)); send.assert_not_called()
        with patch.object(settings, "RESEND_API_KEY", "key"), patch("app.services.email_service.send_email", side_effect=RuntimeError("boom")):
            u.email = "new@kennel.com"; self.assertFalse(lc.send_welcome_email(u))  # never breaks signup

    def test_nurture_sends_next_step_once_and_skips_unsubscribed(self):
        old = NOW - timedelta(days=3)
        for email, unsub in (("lead@kennel.com", False), ("gone@kennel.com", True), ("qa@example.com", False)):
            self.db.add(Lead(email=email, source="t", created_at=old, unsubscribed=unsub))
        self.db.commit()
        with patch("app.services.email_service.send_email", return_value=True) as send:
            self.assertEqual(lc.run_lead_nurture(self.db, now=NOW), 1)
        self.assertEqual(send.call_args.kwargs["to"], "lead@kennel.com")
        self.assertNotIn("__UNSUBSCRIBE_URL__", send.call_args.kwargs["html"])
        with patch("app.services.email_service.send_email", return_value=True) as send:
            self.assertEqual(lc.run_lead_nurture(self.db, now=NOW), 0)  # next step isn't due yet

    def test_daily_endpoint_is_locked_down(self):
        app = FastAPI(); app.include_router(internal.router, prefix="/api/internal")
        app.dependency_overrides[get_db] = lambda: self.db
        c = TestClient(app)
        with patch.object(settings, "CRON_SECRET", ""):
            self.assertEqual(c.post("/api/internal/run-daily", headers={"X-Cron-Secret": ""}).status_code, 404)  # disabled by default
        with patch.object(settings, "CRON_SECRET", "s3cret"):
            self.assertEqual(c.post("/api/internal/run-daily").status_code, 401)
            self.assertEqual(c.post("/api/internal/run-daily", headers={"X-Cron-Secret": "wrong"}).status_code, 401)
            self.user("jane@kennel.com", timedelta(days=1))
            with patch("app.services.email_service.send_email", return_value=True), patch("app.services.lifecycle_emails.datetime") as dt:
                dt.now.return_value = NOW
                r = c.post("/api/internal/run-daily", headers={"X-Cron-Secret": "s3cret"})
            self.assertEqual(r.status_code, 200, r.text); self.assertEqual(r.json()["trial"]["warning"], 1)


if __name__ == "__main__":
    unittest.main()
