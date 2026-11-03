# LitterDesk readiness audit — November 3, 2026

Inspected repository `sirbattoball/litterdesk`, main at `2d5b61d`.
Changes are local only. No deployment, production account creation, checkout,
payment, or email delivery was performed.

## Deployed structure

- `https://litterdesk.vercel.app/` returned HTTP 200. Its response bytes exactly
  match `frontend/public/landing.html`. `frontend/src/app/route.ts` serves that
  file; authenticated pages use the Next.js 14 App Router in `frontend/src/app`.
- Public registration JavaScript contains API base URL
  `https://litterdesk.onrender.com`. The application API is FastAPI under
  `backend/app`, with SQLAlchemy/PostgreSQL models. Render database settings,
  deployed backend commit, Stripe configuration, and webhook delivery were not
  accessible/verified. A read of public OpenAPI metadata timed out.
- `frontend/package.json` is the only application package manifest.
  `premium-v1`, `premium-v2`, `litterdesk-v3`, `bug-fixes`, and `zero-dead-ends`
  contain partial historical source copies. They are not independent complete
  apps. Docker Compose and README also describe an older self-hosted setup;
  README prices and deployment guidance are not authoritative for production.
- Remote branch listing contains only `main`. The requested
  `fix-litter-status-counts-not-saving.patch` was absent from all fetched Git
  history, current files, and accessible files searched in Documents, Downloads,
  Desktop, and temporary folders. Existing similarly named count-input patches
  address frontend inputs, not the missing create-schema fields.

## Fixes in this change

1. `backend/app/schemas/__init__.py`: LitterCreate now accepts status,
   num_males, and num_females. Previously Pydantic silently dropped all three,
   and SQLAlchemy applied planned/0/0 defaults. Both create and update now
   validate status against the existing model enum and counts as nonnegative
   integers. Existing defaults and partial updates remain supported.
2. New-litter and onboarding forms omit an empty optional puppy price, avoiding
   HTTP 422 from submitting an empty string as a float.
3. `backend/app/routers/auth.py`: resuming an abandoned checkout through
   registration requires the existing account password. Previously a caller
   could replace the password and profile of any account with no active
   subscription or recorded trial. Matching-password retries retain the stored
   profile. Other accounts retain the duplicate-registration rejection.
4. `backend/app/services/email_service.py`: removed a hard-coded recipient
   override that diverted password reset links, contracts, and other email to
   a fixed inbox. The service now uses the requested recipient. Resend sender
   domain verification must be confirmed before relying on production delivery.

## Follow-up fixes

The previously listed workflow defects are addressed locally:

| Area | Result |
| --- | --- |
| Manual contracts | Starter and Pro can write/paste agreements, save a draft, reopen it, edit it, and send it. AI generation is Pro-only and produces an editable preview without saving a duplicate. Special terms reach the generator. |
| Contract lifecycle | Only drafts can be edited; only draft/sent contracts can be sent. Blank contracts/signatures are rejected. Draft links cannot expose unsigned content. Email failures return an error without advancing the contract to sent. Signed/voided contracts cannot be resent. |
| Subscription synchronization | Current Stripe state drives plan/access and trial history. Checkout returns are verified against the signed-in customer and completed session. Subscription create/update/delete/pause/resume and invoice paid/failure events reconcile current state. Transient Stripe errors return non-2xx for retry. Old subscription events cannot replace a newer subscription. |
| Checkout retries | Existing subscriptions and open checkout sessions are reused. Past-due/paused/incomplete subscriptions go to billing recovery rather than creating another subscription. Card collection is explicit. A previous local subscription ID, recorded trial end, or Stripe subscription history prevents a second trial. Deleted customers are replaced safely. |
| Buyer deposits | Pro breeders with an onboarded Stripe Connect account can generate hosted payment links for buyers already on their litter waitlist. Amounts and ownership are validated. Repeated requests reuse the existing link/idempotency key. Verified checkout webhooks mark deposits paid, update waitlist/buyer records, and populate real deposit history. An old expiry/failure event cannot undo a paid deposit. |
| Record ownership | Parent dogs, contract litters/buyers, and deposit litters/buyers must belong to the signed-in breeder. Parent sex is validated. |
| Duplicate waitlist additions | Requests serialize on the litter row and reuse an existing entry. Existing historical duplicates are not deleted automatically. |
| Subscription gate | Private core workflows require an active Starter/Pro/Kennel subscription or Stripe trial on the backend. Editing the URL or cached browser profile does not grant access. Billing endpoints and public contract signing remain reachable without a paid subscription. Legacy inactive/free accounts must subscribe before using private workflows. |
| Existing litter correction | The litter detail page now has an editor for puppy counts. Corrected counts persist across reloads. Historical lost values cannot be reconstructed automatically. |

## Data and release notes

- Added the `deposit_payments` table to persist checkout links and payment history.
  Existing startup `Base.metadata.create_all()` creates this missing table; an
  idempotent Alembic migration `002_deposit_payments` is included for installations
  that already use Alembic. Do not run the initial migration blindly against an
  existing unversioned production database. No existing records are rewritten.
- Buyer/litter deletion is blocked when deposit history exists, preserving
  financial records. No historic waitlist entries or litter counts are deleted
  or guessed.
- `APP_URL` now controls payment checkout/portal/Connect return URLs. It must be
  the actual frontend origin. Subscription price IDs must match Stripe prices;
  unknown prices do not grant paid access.
- Release requires configuring the Stripe webhook destination to deliver
  `checkout.session.completed`, `checkout.session.expired`,
  `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`,
  `invoice.payment_failed`, and `account.updated`. Existing PaymentIntent events
  remain supported for deposits created before hosted checkout.
- Refunds/disputes require reconciliation in Stripe; this change does not add
  an in-app refund workflow. Expired links can be replaced. A pending link with
  a different amount is rejected to prevent two collectible deposits.

The implementation follows Stripe's official documentation for
[destination charges](https://docs.stripe.com/connect/destination-charges) and
[subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks).

## Verification

- `cd backend && python -m unittest discover -s tests -v`: 26 tests pass on
  Python 3.12. Real HTTP routes and isolated SQLAlchemy tables verify persistence,
  contract create/edit/send/sign, ownership, entitlement checks, waitlist retries,
  first-trial/retry behavior, completed checkout ownership, signed Stripe webhooks,
  delayed billing events, deposit amounts/payment history, lost-response recovery,
  and migration startup compatibility. Stripe/email calls are mocked, and unexpected
  Stripe network calls fail tests.
- `cd frontend && npm run build`: compilation, lint/type checks, and static-page
  generation pass. Google Fonts stylesheet optimization is skipped when its
  download fails; this does not fail the build.
- Local browser checks with fake users and mocked external services verified
  manual draft save/reopen/edit/reload, buyer deposit link creation with pending
  history, and editing existing puppy counts with persistence after reload.
- PostgreSQL-specific row-lock concurrency and real Stripe test-mode/Resend delivery
  have not been exercised. Production credentials/configuration were not accessed.
  Before deployment, verify webhook subscriptions, configured price IDs, frontend
  origin, Connect capabilities, and verified Resend sender using test credentials.

Nothing has been pushed or deployed. No real checkout, payment, buyer email,
contract invitation, or outreach message was sent.
