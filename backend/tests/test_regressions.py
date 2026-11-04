"""Run: cd backend && python -m unittest discover -s tests -v.

Uses isolated SQLite tables and real HTTP routes; no external services.
"""
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import User
from app.routers import auth, litters


class RegressionTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add(User(id="breeder", email="owner@example.com", full_name="Owner",
                        hashed_password=auth.hash_password("original-password"),
                        subscription_plan="starter", subscription_active=True))
            db.commit()

        app = FastAPI()
        self.app = app
        app.include_router(auth.router, prefix="/api/auth")
        app.include_router(litters.router, prefix="/api/litters")

        def test_db():
            with self.Session() as db:
                yield db

        app.dependency_overrides[get_db] = test_db
        self.client = TestClient(app)
        self.headers = {"Authorization": "Bearer " + auth.create_access_token({"sub": "breeder"})}

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def create(self, **fields):
        return self.client.post("/api/litters/", json={"breed": "Golden Retriever", **fields}, headers=self.headers)

    def test_create_and_reload_preserves_status_and_counts(self):
        response = self.create(status="born", num_males=3, num_females=4)
        self.assertEqual(response.status_code, 201, response.text)
        litter_id = response.json()["id"]
        for data in [response.json(), self.client.get(f"/api/litters/{litter_id}", headers=self.headers).json(),
                     self.client.get("/api/litters/", headers=self.headers).json()[0]]:
            self.assertEqual((data["status"], data["num_males"], data["num_females"]), ("born", 3, 4))
        with self.Session() as db:
            from app.models import Litter
            saved = db.get(Litter, litter_id)
            self.assertEqual((saved.status.value, saved.num_males, saved.num_females), ("born", 3, 4))

    def test_defaults_and_partial_update_preserve_zero(self):
        created = self.create().json()
        self.assertEqual((created["status"], created["num_males"], created["num_females"]), ("planned", 0, 0))
        url = f'/api/litters/{created["id"]}'
        self.client.put(url, json={"status": "born", "num_males": 2, "num_females": 3}, headers=self.headers)
        response = self.client.put(url, json={"status": "weaning", "num_males": 0}, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        saved = self.client.get(url, headers=self.headers).json()
        self.assertEqual((saved["status"], saved["num_males"], saved["num_females"]), ("weaning", 0, 3))

    def test_invalid_status_and_counts_rejected_on_create_and_update(self):
        litter_id = self.create().json()["id"]
        for payload in [{"status": "unknown"}, {"num_males": -1}, {"num_females": -2}, {"num_males": 1.5}]:
            with self.subTest(payload=payload):
                self.assertEqual(self.create(**payload).status_code, 422)
                self.assertEqual(self.client.put(f"/api/litters/{litter_id}", json=payload, headers=self.headers).status_code, 422)

    def test_other_breeder_cannot_update_litter(self):
        litter_id = self.create().json()["id"]
        with self.Session() as db:
            db.add(User(id="other", email="other@example.com", full_name="Other", hashed_password="unused", subscription_plan="starter", subscription_active=True))
            db.commit()
        headers = {"Authorization": "Bearer " + auth.create_access_token({"sub": "other"})}
        self.assertEqual(self.client.put(f"/api/litters/{litter_id}", json={"num_males": 8}, headers=headers).status_code, 404)

    def deactivate(self):
        with self.Session() as db:
            owner = db.get(User, "breeder")
            owner.subscription_active = False
            owner.subscription_plan = "free"
            db.commit()

    def test_registration_cannot_replace_existing_password(self):
        self.deactivate()
        response = self.client.post("/api/auth/register", json={
            "email": "owner@example.com", "password": "attacker-password", "full_name": "Attacker"
        })
        self.assertEqual(response.status_code, 400)
        with self.Session() as db:
            owner = db.get(User, "breeder")
            self.assertTrue(auth.verify_password("original-password", owner.hashed_password))
            self.assertEqual(owner.full_name, "Owner")

    def test_abandoned_checkout_can_resume_with_existing_password(self):
        self.deactivate()
        response = self.client.post("/api/auth/register", json={
            "email": "owner@example.com", "password": "original-password", "full_name": "New name"
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["user"]["full_name"], "Owner")
        self.assertIn("access_token", response.json())

    def test_email_uses_intended_recipient(self):
        from app.services import email_service
        with patch.object(email_service.resend.Emails, "send") as send:
            self.assertTrue(email_service.send_email("buyer@example.com", "Contract", "Test content"))
            self.assertEqual(send.call_args.args[0]["to"], ["buyer@example.com"])


if __name__ == "__main__":
    unittest.main()
