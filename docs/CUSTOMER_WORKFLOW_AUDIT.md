# Customer workflow audit — November 5, 2026

## Release state

The customer-audit changes are prepared on `codex/customer-workflow-audit` and are not deployed. Production currently runs the previously approved visual release. Frontend: Next.js on Vercel; backend: FastAPI/SQLAlchemy on Render with an external PostgreSQL database. A second Render service follows the same backend branch. Publishing requires approval for this release.

## Coverage and fixes

| Area | Verification and resulting behavior |
| --- | --- |
| Account creation and login | HTTP/database tests cover normalized email, duplicate registration, password validation, abandoned-checkout authentication, account isolation, and repeated successful logins. Existing test-account browser sign-in works. |
| Password reset/change | One-time and expired reset links tested; password changes revoke existing sessions. Delivery to real recipients remains blocked by sender-domain setup. No real account passwords changed. |
| Trial and subscription | Checkout ownership, trial state, signed webhook handling, replay/idempotency, portal return reconciliation, and access restrictions tested with provider mocks. Existing live portal configuration inspected. No live purchase or charge performed. |
| Onboarding | Browser-created litter and dog survive refresh; completion persists and links parents correctly. Existing customers bypass the new-user wizard. |
| Litters | Status and male/female counts survive reload (final production build: pregnant, 3 male + 4 female). Dates, prices, parents, notes and waitlist state can be edited; due date survives reload. Ownership, parent sex, null clearing and deletion guards tested. |
| Dogs and health | Optional blank weight no longer blocks creation; records/dates persist; health-test choices remain consistent. Related litters are linked. |
| Buyers and waitlists | Contact details, source, notes, budgets, timeline and follow-up persist; duplicate and range validation; closed waitlist protection; linked litters visible. Manual contact history saves without sending a message. |
| Puppies and matching | Individual puppy profiles and Pro matching suggestions are accessible. Provider success/failure and plan restrictions tested. Suggestions do not silently assign buyers. |
| Contracts | Starter manual creation and editing checked; zero deposits supported; Pro drafting and provider failures checked. Signed agreements remain readable with signature and print control; repeated signing is protected. Browser verification used a seeded, nonbinding signed copy. |
| Deposits and payments | Deposit links/history and provider callback tests; public receipt returns minimal verified payment status. Paid, pending, cancelled and failure states distinguished. Stripe requests mocked in local customer checks. |
| Dashboard and navigation | Saved records invalidate cached lists; overdue follow-ups included; loading failures offer retry; inactive customers retain billing/settings access. |
| AI features | Announcement, email and contract drafts checked with deterministic provider mocks. Invalid/truncated provider output gives a usable error. Live model quality/availability is not certified. |
| Public pages and template | Existing public/template routes retained; misleading automation/support claims removed; signup card requirement preserved. Free agreement is a static reusable template, not individualized legal advice. |
| Responsive layout | Local phone checks at 390 × 844 show no horizontal overflow on litter detail. Earlier desktop and mobile design audit artifacts remain in docs. |

## Verification

- 45 backend tests pass against isolated SQLite data, with foreign keys enabled for customer deletion cases.
- Next.js production build passes; TypeScript checks run as part of build. ESLint configuration is now checked into the repository rather than prompting interactively.
- Final production-build browser smoke: sign-in, status/count persistence, date persistence, saved contact note, signed-copy display, phone litter layout; zero captured console errors in that check.
- Full npm dependency audit (including development dependencies): zero reported vulnerabilities. Python dependency audit: zero reported vulnerabilities; pip dependency consistency check passes. These scans are not a penetration test or a guarantee against unknown defects.
- Patched dependencies include Next.js 15.5.29, React 19.3.1, FastAPI 0.162.0, Starlette 1.10.0 and PyJWT 2.15.1. Removed unused vulnerable dependencies. Versions and frontend lockfile are committed for repeatable installs.

## Live configuration corrected

With the user's explicit approval, the existing live Stripe webhook now subscribes to 14 events: its original five plus nine checkout, subscription and invoice lifecycle events. Readback confirmed the existing destination URL and API version; no signing-secret change or charge was made. Screenshot: `customer-audit/stripe-webhook-14-events.png`.

## Release/migration notes

Startup adds credential-version, onboarding-completion and buyer budget/timeline columns to legacy installations. The operation is additive and repeatable; PostgreSQL advisory locking serializes concurrent backend startups. Existing accounts are marked onboarded, newly created accounts begin incomplete. A matching additive Alembic migration is included. Schema changes preserve existing records on rollback; credential revocation versions must not be reset. SQLite migration behavior is tested; the production PostgreSQL migration has not been executed by this release yet.

## Remaining launch requirements

1. Approve publishing this customer-audit release, then verify both production deployments and their health.
2. Buy an owned domain, configure DNS, verify the Resend sender, and configure FROM_EMAIL. The Vercel-provided subdomain cannot supply the required sender DNS ownership. Real password-reset, agreement and buyer-email delivery must then be tested end to end.
3. Run the final integrated billing check in the app's test environment with matching provider credentials and webhook before claiming full external billing verification. Earlier standalone test checkout success does not establish the entire app integration.

No outreach was sent and no domain was purchased. Automated reminder/nurture jobs remain unscheduled because no background email worker is deployed. This audit records exercised paths and known limitations; it does not claim every possible input or third-party outage was tested.

## Original patch search

No file named `fix-litter-status-counts-not-saving.patch` was found in the accessible project or temporary files. The existing `fix/litter-persistence-and-core-workflows` branch contains the earlier persistence work; current tests and browser reload checks verify the resulting behavior directly.
