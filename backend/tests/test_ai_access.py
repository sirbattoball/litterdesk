import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as U

from app.services.subscriptions import has_ai_access


def user(plan="starter", active=True, stripe=None, trial_days=None):
    end = datetime.now(timezone.utc) + timedelta(days=trial_days) if trial_days is not None else None
    return U(subscription_plan=plan, subscription_active=active, stripe_subscription_id=stripe, trial_ends_at=end)


class AiAccessTests(unittest.TestCase):
    def test_starter_gets_ai_during_the_free_trial(self):
        self.assertTrue(has_ai_access(user(trial_days=5)))

    def test_starter_loses_ai_after_the_trial_ends(self):
        self.assertFalse(has_ai_access(user(trial_days=-1)))

    def test_paying_starter_does_not_get_ai_even_with_an_old_trial_date(self):
        self.assertFalse(has_ai_access(user(stripe="sub_1", trial_days=5)))

    def test_pro_and_kennel_always_have_ai(self):
        self.assertTrue(has_ai_access(user("pro", stripe="sub_1")))
        self.assertTrue(has_ai_access(user("kennel", stripe="sub_1")))

    def test_inactive_never_has_ai(self):
        self.assertFalse(has_ai_access(user("pro", active=False)))
        self.assertFalse(has_ai_access(user(active=False, trial_days=5)))


if __name__ == "__main__":
    unittest.main()
