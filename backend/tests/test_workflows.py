import hashlib
import hmac
import json
import time
import unittest
from unittest.mock import patch, MagicMock

import stripe
from app.config import settings
from app.models import User, Buyer, Litter, Dog, BuyerLitterMatch, Contract, DepositPayment
from app.routers import buyers, contracts, payments, ai_agent
import test_regressions


class Obj(dict):
    def __getattr__(self, key):
        return self[key]


def page(items):
    result = MagicMock()
    result.auto_paging_iter.return_value = iter(items)
    return result


class WorkflowTests(unittest.TestCase):
    setUpBase = test_regressions.RegressionTests.setUp
    tearDown = test_regressions.RegressionTests.tearDown

    def setUp(self):
        self.setUpBase()
        for router, prefix in [(buyers.router, 'buyers'), (contracts.router, 'contracts'),
                               (payments.router, 'payments'), (ai_agent.router, 'ai')]:
            self.app.include_router(router, prefix=f'/api/{prefix}')
        with self.Session() as db:
            user = db.get(User, 'breeder')
            user.stripe_customer_id = 'cus_owner'
            db.add_all([User(id='other', email='other@example.com', full_name='Other', hashed_password='unused', subscription_plan='pro', subscription_active=True),
                        Buyer(id='buyer', breeder_id='breeder', full_name='Buyer', email='buyer@example.com'),
                        Buyer(id='outsider', breeder_id='other', full_name='Other buyer', email='outsider@example.com'),
                        Litter(id='litter', breeder_id='breeder', breed='Poodle'),
                        Litter(id='foreign-litter', breeder_id='other', breed='Poodle'),
                        Dog(id='foreign-dam', owner_id='other', name='Dam', breed='Poodle', sex='female')])
            db.commit()
        for key, value in dict(STRIPE_SECRET_KEY='sk_test_mock', STRIPE_WEBHOOK_SECRET='whsec_test',
                               STRIPE_PRICE_STARTER='price_starter', STRIPE_PRICE_PRO='price_pro', RESEND_API_KEY='mock',
                               STRIPE_DEPOSIT_COLLECTION_ENABLED=True).items():
            self.enterContext(patch.object(settings, key, value))
        # Every Stripe request must be explicitly mocked; never reach the network.
        self.enterContext(patch('stripe._api_requestor._APIRequestor.request', side_effect=AssertionError('Unexpected Stripe network call')))

    def post(self, path, body=None, params=None):
        return self.client.post('/api/' + path, json=body, params=params, headers=self.headers)

    def pro(self):
        with self.Session() as db:
            user = db.get(User, 'breeder')
            user.subscription_plan = 'pro'
            user.stripe_onboarded = True
            user.stripe_account_id = 'acct_owner'
            db.commit()

    def waitlist(self):
        return self.post('buyers/buyer/add-to-waitlist', params={'litter_id': 'litter'})

    def new_contract(self):
        response = self.post('contracts/', {'buyer_id': 'buyer', 'litter_id': 'litter', 'content': 'Original agreement', 'sale_price': 1000, 'deposit_amount': 200})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()['id']

    def sub(self, status='active', **values):
        return Obj(id='sub_owner', customer='cus_owner', status=status, created=100,
                   items={'data': [{'id': 'si_owner', 'price': {'id': 'price_pro'}}]}, **values)

    def webhook(self, kind, obj):
        payload = json.dumps({'id': 'evt_test', 'object': 'event', 'type': kind, 'data': {'object': obj}})
        now = str(int(time.time()))
        signature = hmac.new(b'whsec_test', f'{now}.{payload}'.encode(), hashlib.sha256).hexdigest()
        return self.client.post('/api/payments/webhook', content=payload,
                                headers={'stripe-signature': f't={now},v1={signature}'})

    def test_starter_manual_contract_edit_and_send(self):
        contract_id = self.new_contract()
        url = f'/api/contracts/{contract_id}'
        response = self.client.put(url, json={'content': 'Reviewed agreement'}, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['balance_due'], 800)
        with patch.object(contracts.email_service, 'send_contract_email', return_value=False):
            self.assertEqual(self.post(f'contracts/{contract_id}/send').status_code, 502)
        self.assertEqual(self.client.get(url, headers=self.headers).json()['status'], 'draft')
        with patch.object(contracts.email_service, 'send_contract_email', return_value=True) as deliver:
            self.assertEqual(self.post(f'contracts/{contract_id}/send').status_code, 200)
            self.assertEqual(deliver.call_args.kwargs['buyer_email'], 'buyer@example.com')
        self.assertEqual(self.client.put(url, json={'content': 'Changed after send'}, headers=self.headers).status_code, 400)
        with self.Session() as db:
            token = db.get(Contract, contract_id).sign_token
        self.assertEqual(self.client.post(f'/api/contracts/sign/{token}', params={'buyer_name': 'Buyer'}).status_code, 200)
        with patch.object(contracts.email_service, 'send_contract_email') as deliver:
            self.assertEqual(self.post(f'contracts/{contract_id}/send').status_code, 400)
            deliver.assert_not_called()

    def test_draft_public_link_is_not_available_and_blank_contract_rejected(self):
        contract_id = self.new_contract()
        with self.Session() as db:
            token = db.get(Contract, contract_id).sign_token
        self.assertEqual(self.client.get(f'/api/contracts/sign/{token}').status_code, 400)
        self.assertEqual(self.post('contracts/', {'buyer_id': 'buyer', 'content': ' '}).status_code, 400)
        self.assertEqual(self.post('contracts/', {'buyer_id': 'buyer', 'content': 'Text', 'sale_price': 10, 'deposit_amount': 11}).status_code, 422)

    def test_cross_breeder_contract_and_parents_rejected(self):
        self.assertEqual(self.post('contracts/', {'buyer_id': 'buyer', 'litter_id': 'foreign-litter', 'content': 'Text'}).status_code, 404)
        self.assertEqual(self.post('contracts/', {'buyer_id': 'outsider', 'content': 'Text'}).status_code, 404)
        self.assertEqual(self.post('litters/', {'breed': 'Poodle', 'dam_id': 'foreign-dam'}).status_code, 404)

    def test_waitlist_retry_does_not_duplicate(self):
        self.assertEqual(self.waitlist().status_code, 200)
        self.assertEqual(self.waitlist().json()['position'], 1)
        with self.Session() as db:
            self.assertEqual(db.query(BuyerLitterMatch).count(), 1)
        self.assertEqual(self.post('buyers/outsider/add-to-waitlist', params={'litter_id': 'litter'}).status_code, 404)

    def test_ai_is_pro_only_and_generation_does_not_save_duplicates(self):
        body = {'buyer_id': 'buyer', 'litter_id': 'litter', 'puppy_sex': 'female', 'dob': '2026-09-01', 'go_home_date': '2026-11-01', 'balance_due_date': '2026-11-01', 'sale_price': 1000, 'deposit_amount': 100, 'special_terms': 'Return to breeder'}
        with patch.object(ai_agent.ai_service, 'generate_contract', return_value='AI agreement') as generate:
            self.assertEqual(self.post('ai/generate-contract', body).status_code, 403)
            generate.assert_not_called()
            self.pro()
            response = self.post('ai/generate-contract', body)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(generate.call_args.kwargs['special_terms'], 'Return to breeder')
            self.assertEqual(response.json()['content'], 'AI agreement')
        with self.Session() as db:
            self.assertEqual(db.query(Contract).count(), 0)

    def test_inactive_account_cannot_bypass_subscription_using_query_string(self):
        with self.Session() as db:
            user = db.get(User, 'breeder')
            user.subscription_active = False
            db.commit()
        self.assertEqual(self.post('litters/?subscribed=true', {'breed': 'Poodle'}).status_code, 403)
        self.assertEqual(self.post('contracts/', {'buyer_id': 'buyer', 'content': 'Text'}).status_code, 403)

    def test_online_deposit_routes_are_blocked_when_paused(self):
        self.pro()
        self.waitlist()
        with patch.object(settings, 'STRIPE_DEPOSIT_COLLECTION_ENABLED', False):
            params = {'buyer_id': 'buyer', 'litter_id': 'litter', 'amount_cents': 20000}
            self.assertEqual(self.post('payments/collect-deposit', params=params).status_code, 409)
            self.assertEqual(self.post('payments/stripe-connect/onboard').status_code, 409)
            self.assertEqual(self.client.get('/api/payments/deposits', headers=self.headers).json(), [])

    def test_starter_can_record_and_undo_a_deposit_on_own_litter(self):
        self.waitlist()
        url = '/api/litters/litter/waitlist/buyer/deposit'
        for paid in (True, True, False):
            response = self.client.put(url, json={'deposit_paid': paid}, headers=self.headers)
            self.assertEqual(response.status_code, 204)
            entries = self.client.get('/api/litters/litter/waitlist', headers=self.headers).json()
            self.assertEqual(entries[0]['deposit_paid'], paid)
            self.assertFalse(entries[0]['online_deposit'])
        self.assertEqual(self.client.put(
            url.replace('/litter/', '/foreign-litter/'), json={'deposit_paid': True}, headers=self.headers
        ).status_code, 404)

    def test_manual_edit_cannot_override_a_pending_or_paid_online_deposit(self):
        self.waitlist()
        url = '/api/litters/litter/waitlist/buyer/deposit'
        for status in ('pending', 'paid'):
            with self.Session() as db:
                db.add(DepositPayment(id=status, breeder_id='breeder', buyer_id='buyer',
                                      litter_id='litter', amount_cents=20000, status=status))
                db.commit()
            entries = self.client.get('/api/litters/litter/waitlist', headers=self.headers).json()
            self.assertTrue(entries[0]['online_deposit'])
            self.assertEqual(self.client.put(
                url, json={'deposit_paid': True}, headers=self.headers
            ).status_code, 409)
            with self.Session() as db:
                self.assertFalse(db.query(BuyerLitterMatch).one().deposit_paid)
                db.delete(db.get(DepositPayment, status))
                db.commit()

    def test_deposit_requires_pro_waitlist_ownership_and_positive_amount(self):
        params = {'buyer_id': 'buyer', 'litter_id': 'litter', 'amount_cents': 20000}
        self.assertEqual(self.post('payments/collect-deposit', params=params).status_code, 403)
        self.pro()
        self.assertEqual(self.post('payments/collect-deposit', params=params).status_code, 400)
        self.assertEqual(self.post('payments/collect-deposit', params={**params, 'buyer_id': 'outsider'}).status_code, 404)
        self.assertEqual(self.post('payments/collect-deposit', params={**params, 'amount_cents': -1}).status_code, 422)

    def test_hosted_deposit_checkout_retry_paid_webhook_and_history(self):
        self.pro()
        self.waitlist()
        params = {'buyer_id': 'buyer', 'litter_id': 'litter', 'amount_cents': 20000}
        session = Obj(id='cs_deposit', mode='payment', status='open', payment_status='unpaid', amount_total=20000, currency='usd', url='https://checkout.stripe.com/mock')
        with patch.object(stripe.checkout.Session, 'create', return_value=session) as create:
            response = self.post('payments/collect-deposit', params=params)
            self.assertEqual(response.status_code, 200, response.text)
            args = create.call_args.kwargs
            self.assertEqual(args['payment_intent_data']['transfer_data']['destination'], 'acct_owner')
            self.assertEqual(args['payment_intent_data']['application_fee_amount'], 300)
            self.assertTrue(args['idempotency_key'].startswith('deposit-'))
        with patch.object(stripe.checkout.Session, 'retrieve', return_value=session):
            self.assertEqual(self.post('payments/collect-deposit', params=params).json()['checkout_url'], session.url)
            self.assertEqual(self.post('payments/collect-deposit', params={**params, 'amount_cents': 30000}).status_code, 409)
        paid = Obj(**{**session, 'status': 'complete', 'payment_status': 'paid', 'payment_intent': 'pi_deposit'})
        with patch.object(stripe.checkout.Session, 'retrieve', return_value=paid):
            for event_type in ['checkout.session.completed', 'checkout.session.completed', 'checkout.session.expired']:
                response = self.webhook(event_type, paid)
                self.assertEqual(response.status_code, 200, response.text)
        with self.Session() as db:
            self.assertEqual(db.query(DepositPayment).one().status, 'paid')
            self.assertTrue(db.query(BuyerLitterMatch).one().deposit_paid)
            self.assertEqual(db.get(Buyer, 'buyer').status.value, 'deposit_paid')
        self.assertEqual(self.post('payments/collect-deposit', params=params).status_code, 409)
        history = self.client.get('/api/payments/deposits', headers=self.headers).json()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]['amount_cents'], 20000)
        self.assertEqual(history[0]['status'], 'paid')
        self.assertEqual(self.client.delete('/api/litters/litter', headers=self.headers).status_code, 400)

    def test_deposit_webhook_mismatched_amount_does_not_mark_paid(self):
        self.pro()
        with self.Session() as db:
            db.add(DepositPayment(id='deposit', breeder_id='breeder', buyer_id='buyer', litter_id='litter', amount_cents=20000, stripe_session_id='cs_deposit'))
            db.commit()
        bad = Obj(id='cs_deposit', mode='payment', payment_status='paid', amount_total=10, currency='usd')
        with patch.object(stripe.checkout.Session, 'retrieve', return_value=bad):
            self.assertEqual(self.webhook('checkout.session.completed', bad).status_code, 400)
        with self.Session() as db:
            self.assertEqual(db.get(DepositPayment, 'deposit').status, 'pending')

    def test_subscription_webhooks_reconcile_latest_state_and_keep_trial_history(self):
        trial_end = int(time.time()) + 86400
        for kind, sub, expected in [
            ('checkout.session.completed', self.sub('trialing', trial_end=trial_end), True),
            ('invoice.payment_failed', self.sub('past_due'), False),
            ('invoice.paid', self.sub('active'), True),
            ('customer.subscription.paused', self.sub('paused'), False),
            ('customer.subscription.resumed', self.sub('active'), True),
            ('customer.subscription.deleted', self.sub('canceled'), False),
            # An out-of-order "updated" event still reads canceled from Stripe.
            ('customer.subscription.updated', self.sub('canceled'), False),
        ]:
            obj = {'id': 'cs_sub', 'mode': 'subscription', 'subscription': 'sub_owner'} if kind == 'checkout.session.completed' else {'id': 'sub_owner', 'subscription': 'sub_owner'}
            with self.subTest(kind=kind), patch.object(stripe.Subscription, 'retrieve', return_value=sub):
                response = self.webhook(kind, obj)
                self.assertEqual(response.status_code, 200, response.text)
                with self.Session() as db:
                    user = db.get(User, 'breeder')
                    self.assertEqual(user.subscription_active, expected)
                    self.assertIsNotNone(user.trial_ends_at)

    def test_subscription_webhook_failure_requests_retry_and_signature_is_required(self):
        self.assertEqual(self.client.post('/api/payments/webhook', content='{}').status_code, 400)
        with patch.object(stripe.Subscription, 'retrieve', side_effect=stripe.error.APIConnectionError('offline')):
            self.assertEqual(self.webhook('customer.subscription.updated', {'id': 'sub_owner'}).status_code, 502)

    def test_verified_checkout_return_rejects_other_customer_and_incomplete_checkout(self):
        with patch.object(stripe.checkout.Session, 'retrieve', return_value={'customer': 'cus_other', 'mode': 'subscription'}):
            self.assertEqual(self.post('payments/sync-subscription', params={'session_id': 'cs_other'}).status_code, 404)
        with patch.object(stripe.checkout.Session, 'retrieve', return_value={'customer': 'cus_owner', 'mode': 'subscription', 'status': 'open'}):
            self.assertEqual(self.post('payments/sync-subscription', params={'session_id': 'cs_owner'}).status_code, 409)
        with patch.object(stripe.checkout.Session, 'retrieve', return_value={'customer': 'cus_owner', 'mode': 'subscription', 'status': 'complete', 'subscription': 'sub_owner'}), patch.object(stripe.Subscription, 'retrieve', return_value=self.sub('trialing', trial_end=int(time.time()) + 1000)):
            self.assertTrue(self.post('payments/sync-subscription', params={'session_id': 'cs_owner'}).json()['subscription_active'])

    def test_checkout_grants_only_first_trial_and_collects_card(self):
        for used_trial in [False, True]:
            with self.Session() as db:
                db.get(User, 'breeder').stripe_subscription_id = 'sub_previous' if used_trial else None
                db.commit()
            with patch.object(stripe.Customer, 'retrieve', return_value=Obj(id='cus_owner')), patch.object(stripe.Subscription, 'list', return_value=page([])), patch.object(stripe.checkout.Session, 'list', return_value=page([])), patch.object(stripe.checkout.Session, 'create', return_value=Obj(id='cs_new', url='https://checkout.stripe.com/mock')) as create:
                response = self.post('payments/create-subscription/starter', params={'new_signup': True})
                self.assertEqual(response.status_code, 200, response.text)
                args = create.call_args.kwargs
                self.assertEqual(args['payment_method_collection'], 'always')
                self.assertEqual('trial_period_days' in args['subscription_data'], not used_trial)
                self.assertIn('session_id={CHECKOUT_SESSION_ID}', args['success_url'])

    def test_checkout_reuses_open_session_and_ongoing_subscription(self):
        with patch.object(stripe.Customer, 'retrieve', return_value=Obj(id='cus_owner')), patch.object(stripe.Subscription, 'list', return_value=page([])), patch.object(stripe.checkout.Session, 'list', return_value=page([Obj(id='cs_open', mode='subscription', metadata={'plan': 'pro'}, url='https://checkout.stripe.com/open')])):
            self.assertEqual(self.post('payments/create-subscription/pro').json()['session_id'], 'cs_open')
        with patch.object(stripe.Customer, 'retrieve', return_value=Obj(id='cus_owner')), patch.object(stripe.Subscription, 'list', return_value=page([self.sub()])), patch.object(stripe.checkout.Session, 'create') as create:
            self.assertTrue(self.post('payments/create-subscription/pro').json()['switched'])
            create.assert_not_called()

    def test_deleted_customer_is_replaced_and_history_prevents_repeat_trial(self):
        with patch.object(stripe.Customer, 'retrieve', return_value=Obj(id='cus_owner', deleted=True)), patch.object(stripe.Customer, 'create', return_value=Obj(id='cus_replacement')) as customer, patch.object(stripe.Subscription, 'list', return_value=page([self.sub('canceled')])), patch.object(stripe.checkout.Session, 'list', return_value=page([])), patch.object(stripe.checkout.Session, 'create', return_value=Obj(id='cs_new', url='https://checkout.stripe.com/mock')) as checkout:
            response = self.post('payments/create-subscription/pro')
            self.assertEqual(response.status_code, 200, response.text)
            self.assertTrue(customer.call_args.kwargs['idempotency_key'].endswith('cus_owner'))
            self.assertNotIn('trial_period_days', checkout.call_args.kwargs['subscription_data'])

    def test_old_subscription_event_does_not_replace_current_subscription(self):
        with self.Session() as db:
            db.get(User, 'breeder').stripe_subscription_id = 'sub_new'
            db.commit()
        old = self.sub('canceled')
        new = Obj(**{**self.sub(), 'id': 'sub_new', 'created': 200})
        with patch.object(stripe.Subscription, 'retrieve', side_effect=[old, new]):
            self.assertEqual(self.webhook('customer.subscription.deleted', {'id': 'sub_owner'}).status_code, 200)
        with self.Session() as db:
            self.assertEqual(db.get(User, 'breeder').stripe_subscription_id, 'sub_new')
            self.assertTrue(db.get(User, 'breeder').subscription_active)

    def test_non_subscription_invoice_is_ignored(self):
        self.assertEqual(self.webhook('invoice.paid', {'id': 'in_oneoff', 'subscription': None, 'parent': None}).status_code, 200)

    def test_lost_deposit_response_reuses_same_payment_key(self):
        self.pro()
        self.waitlist()
        params = {'buyer_id': 'buyer', 'litter_id': 'litter', 'amount_cents': 20000}
        with patch.object(stripe.checkout.Session, 'create', side_effect=stripe.error.APIConnectionError('lost response')) as create:
            self.assertEqual(self.post('payments/collect-deposit', params=params).status_code, 502)
            first_key = create.call_args.kwargs['idempotency_key']
        with patch.object(stripe.checkout.Session, 'create', return_value=Obj(id='cs_retried', url='https://checkout.stripe.com/mock')) as create:
            self.assertEqual(self.post('payments/collect-deposit', params=params).status_code, 200)
            self.assertEqual(create.call_args.kwargs['idempotency_key'], first_key)
        with self.Session() as db:
            self.assertEqual(db.query(DepositPayment).count(), 1)

    def test_deposit_migration_is_safe_after_startup_created_table(self):
        import importlib.util
        from pathlib import Path
        from alembic.migration import MigrationContext
        from alembic.operations import Operations
        from sqlalchemy import inspect
        path = Path(__file__).resolve().parents[1] / 'migrations/versions/002_deposit_payments.py'
        spec = importlib.util.spec_from_file_location('deposit_migration', path)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        with self.engine.begin() as connection:
            operations = Operations(MigrationContext.configure(connection))
            with patch.object(migration, 'op', operations):
                migration.upgrade()  # Already created by app startup.
                DepositPayment.__table__.drop(connection)
                migration.upgrade()  # Fresh Alembic installation.
            columns = {column['name'] for column in inspect(connection).get_columns('deposit_payments')}
            self.assertIn('stripe_session_id', columns)
            self.assertIn('amount_cents', columns)


if __name__ == '__main__':
    unittest.main()
