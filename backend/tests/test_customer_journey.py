"""Customer journeys: real HTTP/database operations, mocked external providers."""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from sqlalchemy import create_engine, text, inspect
from app.models import User, Contract, BuyerLitterMatch, DepositPayment
from app.routers import auth, dogs, dashboard
from app.schema_updates import ensure_customer_columns
import test_workflows as workflows
from test_workflows import Obj, page

class CustomerJourneyTests(unittest.TestCase):
    setUpBase=workflows.WorkflowTests.setUpBase
    tearDown=workflows.WorkflowTests.tearDown
    post=workflows.WorkflowTests.post
    pro=workflows.WorkflowTests.pro
    waitlist=workflows.WorkflowTests.waitlist
    new_contract=workflows.WorkflowTests.new_contract
    sub=workflows.WorkflowTests.sub
    def setUp(self):
        auth._login_attempts.clear();workflows.WorkflowTests.setUp(self)
        with self.engine.connect() as conn: conn.execute(text('PRAGMA foreign_keys=ON'))
        self.app.include_router(dogs.router,prefix='/api/dogs')
        self.app.include_router(dashboard.router,prefix='/api/dashboard')
    def get(self,path):return self.client.get('/api/'+path,headers=self.headers)
    def put(self,path,body):return self.client.put('/api/'+path,json=body,headers=self.headers)
    def delete(self,path):return self.client.delete('/api/'+path,headers=self.headers)
    def login(self,password='original-password',email='owner@example.com'):
        return self.client.post('/api/auth/login',json={'email':email,'password':password})

    def test_signup_case_normalization_and_password_validation(self):
        body={'full_name':'New Owner','email':'New@Example.com','password':'new-password'}
        r=self.client.post('/api/auth/register',json=body);self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()['user']['email'],'new@example.com')
        self.assertFalse(r.json()['user']['subscription_active']);self.assertFalse(r.json()['user']['onboarding_completed'])
        self.assertEqual(self.login('new-password','NEW@example.com').status_code,200)
        for field,value in [('password','x'),('password','🙂'*40),('full_name','  ')]:
            self.assertEqual(self.client.post('/api/auth/register',json={**body,field:value}).status_code,422)

    def test_reset_one_time_expiry_new_login_and_session_revocation(self):
        with patch('app.services.email_service.send_email',return_value=True) as mail:
            self.assertEqual(self.post('auth/forgot-password',{'email':'OWNER@example.com'}).status_code,204)
            self.assertIn('/reset-password/',mail.call_args.kwargs['body'])
        with self.Session() as db:token=db.get(User,'breeder').reset_token
        r=self.post('auth/reset-password',{'token':token,'new_password':'changed-password'})
        self.assertEqual(r.status_code,204,r.text);self.assertEqual(self.get('auth/me').status_code,401)
        self.assertEqual(self.login().status_code,401);self.assertEqual(self.login('changed-password').status_code,200)
        self.assertEqual(self.post('auth/reset-password',{'token':token,'new_password':'another-password'}).status_code,400)
        with self.Session() as db:
            u=db.get(User,'breeder');u.reset_token='expired';u.reset_token_expires=datetime.now(timezone.utc)-timedelta(minutes=1);db.commit()
        self.assertEqual(self.post('auth/reset-password',{'token':'expired','new_password':'another-password'}).status_code,400)

    def test_unknown_reset_and_change_password(self):
        with patch('app.services.email_service.send_email') as mail:
            self.assertEqual(self.post('auth/forgot-password',{'email':'missing@example.com'}).status_code,204);mail.assert_not_called()
        self.assertEqual(self.post('auth/change-password',{'current_password':'wrong','new_password':'new-password'}).status_code,400)
        self.assertEqual(self.post('auth/change-password',{'current_password':'original-password','new_password':'new-password'}).status_code,204)
        self.assertEqual(self.get('auth/me').status_code,401);self.assertEqual(self.login('new-password').status_code,200)

    def test_profile_onboarding_and_duplicate_email(self):
        self.assertEqual(self.put('auth/me',{'full_name':'Updated','kennel_name':'Updated Kennel','onboarding_completed':True}).status_code,200)
        self.assertTrue(self.get('auth/me').json()['onboarding_completed'])
        self.assertEqual(self.put('auth/me',{'email':'OTHER@example.com'}).status_code,400)

    def test_dog_health_create_edit_clear_filter_delete(self):
        r=self.post('dogs/',{'name':'Bella','breed':'Poodle','sex':'female','health_tests':{'OFA':'OFA Good'}})
        self.assertEqual(r.status_code,201,r.text);dog=r.json()['id']
        r=self.put('dogs/'+dog,{'name':'Bella II','breed':'Poodle','sex':'female','weight_lbs':None,'health_tests':{'OFA':'OFA Excellent'}})
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(self.get('dogs/'+dog).json()['health_tests']['OFA'],'OFA Excellent')
        r=self.post(f'dogs/{dog}/health-records',{'record_type':'vaccination','description':'Rabies','administered_at':'2026-10-01','next_due':'2027-10-01'})
        self.assertEqual(r.status_code,201,r.text)
        self.assertEqual(len(self.get(f'dogs/{dog}/health-records').json()),1)
        self.assertEqual(self.delete(f'dogs/{dog}/health-records/'+r.json()['id']).status_code,204)
        self.assertEqual(self.delete('dogs/'+dog).status_code,204);self.assertEqual(self.get('dogs/').json(),[])
        self.assertEqual(self.post('dogs/',{'name':'Bad','breed':'Poodle','sex':'unknown'}).status_code,422)

    def test_buyer_persistence_search_notes_and_budget_validation(self):
        data={'full_name':'Jane','email':'JANE@example.com','phone':'555-0100','referral_source':'referral','lifestyle_notes':'Quiet home','budget_min':1000,'budget_max':3000,'timeline':'Spring'}
        r=self.post('buyers/',data);self.assertEqual(r.status_code,201,r.text);buyer=r.json()['id']
        for key in ['referral_source','lifestyle_notes','budget_min','budget_max','timeline']:self.assertEqual(self.get('buyers/'+buyer).json()[key],data[key])
        self.assertEqual(self.post('buyers/',data).status_code,400);self.assertEqual(len(self.get('buyers/?search=Jane').json()),1)
        self.assertEqual(self.put('buyers/'+buyer,{'lifestyle_notes':'Updated','follow_up_date':None}).status_code,200)
        self.assertEqual(self.get('buyers/'+buyer).json()['lifestyle_notes'],'Updated')
        self.assertEqual(self.put('buyers/'+buyer,{'budget_min':4000}).status_code,422)
        self.assertEqual(self.put('buyers/'+buyer,{'status':'invented'}).status_code,422)
        self.assertEqual(self.put('buyers/'+buyer,{'email':'buyer@example.com'}).status_code,400)

    def test_waitlist_visibility_closed_and_clean_buyer_delete(self):
        self.assertEqual(self.waitlist().status_code,200)
        self.assertEqual(self.get('buyers/buyer/waitlists').json()[0]['litter_id'],'litter')
        self.assertEqual(self.put('litters/litter',{'waitlist_open':False}).status_code,200);self.assertEqual(self.waitlist().status_code,400)
        self.assertEqual(self.delete('buyers/buyer').status_code,204)
        with self.Session() as db:self.assertEqual(db.query(BuyerLitterMatch).count(),0)

    def test_litter_edit_parents_dates_clear_and_delete_guards(self):
        dog=self.post('dogs/',{'name':'Dam','breed':'Poodle','sex':'female'}).json()['id']
        r=self.put('litters/litter',{'dam_id':dog,'name':'First litter','due_date':'2026-12-01','notes':'Notes','puppy_price':1200})
        self.assertEqual(r.status_code,200,r.text);self.assertEqual(self.get('litters/litter').json()['dam']['name'],'Dam')
        self.assertEqual(self.put('litters/litter',{'dam_id':'foreign-dam'}).status_code,404)
        self.assertEqual(self.put('litters/litter',{'dam_id':None,'due_date':None}).status_code,200)
        self.assertIsNone(self.get('litters/litter').json()['dam_id'])
        contract=self.new_contract();self.assertEqual(self.delete('litters/litter').status_code,400)
        self.delete('contracts/'+contract+'/permanent');self.waitlist();self.assertEqual(self.delete('litters/litter').status_code,204)

    def test_puppies_matching_plan_gate_and_ai_failure(self):
        r=self.post('litters/litter/puppies',{'name':'Rose','collar_color':'Pink','sex':'female','is_keeper':False});self.assertEqual(r.status_code,201,r.text)
        self.waitlist();self.assertEqual(len(self.get('litters/litter/puppies').json()),1)
        self.assertEqual(self.post('ai/match-litter/litter').status_code,403);self.pro()
        with patch('app.services.ai_service.match_buyers_to_litter',return_value=[{'buyer_name':'Buyer','puppy_collar':'Pink','match_reason':'Preference','match_score':90}]):self.assertEqual(len(self.post('ai/match-litter/litter').json()['matches']),1)
        with patch('app.services.ai_service.generate_litter_update',side_effect=ValueError('Invalid output')):self.assertEqual(self.post('ai/litter-announcement/litter').status_code,502)

    def test_signed_contract_reopens_and_cannot_be_signed_twice(self):
        c=self.new_contract()
        with patch('app.services.email_service.send_contract_email',return_value=True):self.post('contracts/'+c+'/send')
        with self.Session() as db:token=db.get(Contract,c).sign_token
        self.assertEqual(self.client.post('/api/contracts/sign/'+token,params={'buyer_name':'Buyer'}).status_code,200)
        r=self.client.get('/api/contracts/sign/'+token);self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.json()['status'],'signed')
        self.assertEqual(self.client.post('/api/contracts/sign/'+token,params={'buyer_name':'Buyer'}).status_code,400)

    def test_billing_and_connect_return_reconciliation(self):
        self.pro()
        with patch('stripe.Subscription.list',return_value=page([self.sub(status='canceled')])):
            self.assertEqual(self.post('payments/refresh-subscription').status_code,200);self.assertFalse(self.get('auth/me').json()['subscription_active'])
        self.pro()
        with self.Session() as db:u=db.get(User,'breeder');u.subscription_active=True;db.commit()
        with patch('stripe.Account.retrieve',return_value=Obj(charges_enabled=True,payouts_enabled=True)):self.assertTrue(self.post('payments/stripe-connect/refresh').json()['connected'])

    def test_public_deposit_result_no_buyer_data(self):
        self.waitlist()
        with self.Session() as db:
            db.add(DepositPayment(id='deposit',breeder_id='breeder',buyer_id='buyer',litter_id='litter',amount_cents=20000,stripe_session_id='cs_receipt'));db.commit()
        with patch('stripe.checkout.Session.retrieve',return_value=Obj(id='cs_receipt',amount_total=20000,currency='usd',payment_status='paid',payment_intent='pi_receipt')):
            r=self.client.get('/api/payments/deposit-status?session_id=cs_receipt');self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.json(),{'status':'paid','amount_cents':20000})
        self.assertTrue(self.get('litters/litter/waitlist').json()[0]['deposit_paid'])

    def test_cross_breeder_resource_access(self):
        for path in ['buyers/outsider','buyers/outsider/communications','buyers/outsider/waitlists','dogs/foreign-dam','dogs/foreign-dam/health-records','litters/foreign-litter','litters/foreign-litter/puppies','litters/foreign-litter/waitlist']:
            with self.subTest(path=path):self.assertEqual(self.get(path).status_code,404)

    def test_successful_logins_do_not_trigger_failure_limit(self):
        for _ in range(10):self.assertEqual(self.login().status_code,200)
        for _ in range(8):self.assertEqual(self.login('wrong').status_code,401)
        self.assertEqual(self.login('wrong').status_code,429)

    def test_ai_terms_and_contact_logging(self):
        self.pro()
        data={'buyer_id':'buyer','litter_id':'litter','puppy_sex':'female','dob':'2026-09-01','go_home_date':'2026-11-01','balance_due_date':'2026-11-01','sale_price':1000,'deposit_amount':1100}
        self.assertEqual(self.post('ai/generate-contract',data).status_code,422)
        self.assertEqual(self.post('buyers/buyer/log-contact',{'channel':'note','direction':'outbound','body':'Phone follow-up'}).status_code,200)
        rows=self.get('buyers/buyer/communications').json();self.assertEqual(rows[0]['body'],'Phone follow-up')

    def test_contact_notification_failure_is_not_reported_as_email_sent(self):
        from app.routers import leads
        self.app.include_router(leads.router,prefix='/api/leads')
        with patch('app.services.email_service.send_email',return_value=False) as send:
            response=self.post('leads/contact',{'email':'test@example.com','name':'<script>','message':'<b>Test message</b>'})
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.json()['status'],'received')
            self.assertNotIn('<script>',send.call_args.kwargs['html'])
            self.assertIn('&lt;b&gt;',send.call_args.kwargs['html'])

    def test_email_service_keeps_recipient_and_escapes_plain_text(self):
        from app.services import email_service
        with patch.object(email_service.resend.Emails,'send') as send:
            self.assertTrue(email_service.send_email('buyer@example.com','Subject','<b>Plain text</b>'))
            payload=send.call_args.args[0]
            self.assertEqual(payload['to'],['buyer@example.com'])
            self.assertIn('&lt;b&gt;Plain text&lt;/b&gt;',payload['html'])


class SchemaUpgradeTests(unittest.TestCase):
    def test_legacy_upgrade_is_repeatable_and_preserves_rows(self):
        engine=create_engine('sqlite://')
        with engine.begin() as conn:
            conn.execute(text('CREATE TABLE users (id VARCHAR PRIMARY KEY, email VARCHAR)'));conn.execute(text("INSERT INTO users VALUES ('legacy','owner@example.com')"));conn.execute(text('CREATE TABLE buyers (id VARCHAR PRIMARY KEY)'))
        ensure_customer_columns(engine);ensure_customer_columns(engine)
        with engine.connect() as conn:self.assertEqual(tuple(conn.execute(text('SELECT credential_version,onboarding_completed,email FROM users')).one()),(0,1,'owner@example.com'))
        self.assertIn('timeline',{c['name'] for c in inspect(engine).get_columns('buyers')});engine.dispose()


class PublicCorsTests(unittest.TestCase):
    def test_customer_origin_and_owned_previews_are_allowed(self):
        from app.main import app
        from fastapi.testclient import TestClient
        client=TestClient(app)
        for origin in ['https://litterdesk.vercel.app','https://litterdesk-bv7zo5w3j-sirbattoballs-projects.vercel.app']:
            response=client.get('/health',headers={'Origin':origin})
            self.assertEqual(response.headers.get('access-control-allow-origin'),origin)
        response=client.get('/health',headers={'Origin':'https://litterdesk.attacker.example'})
        self.assertNotIn('access-control-allow-origin',response.headers)
        client.close()
