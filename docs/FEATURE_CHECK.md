# Advertised feature verification — November 5, 2026

Checked the live homepage and plan descriptions against the current app. This is a record of exercised paths, not a guarantee for every input or third-party outage.

| Advertised capability | Evidence / result |
| --- | --- |
| Seven-day trial without a card | Live synthetic Pro signup immediately granted access with no Stripe subscription. Tests cover expiry, retained records and repeat-signup protection. |
| Litter tracking, dates, parents and puppy counts | Live create/read/update/read passed; status and male/female counts persisted. Earlier customer browser checks and automated CRUD/ownership tests cover dates and parents. |
| Buyers, notes, status and waitlists | Live synthetic buyer and waitlist creation passed; automated persistence, search, validation, contact history and ownership tests pass. |
| Dog profiles and health records | Earlier customer browser checks plus automated create/edit/clear/delete and health-date tests pass. |
| Manual contracts on both plans | Automated Starter workflow passes. Live generated text saved and reopened without loss. |
| AI contract generation (Pro) | Actual live model returned a complete 33,402-character JSON response containing the agreement. Draft was saved/reopened. Generation took about 134 seconds, revealing a real defect: the browser used a 90-second timeout. Fix prepared: contract drafting gets a 240-second timeout and an honest waiting message. |
| AI buyer email drafts (Pro) | Actual live request returned subject and body successfully. This drafts text; it does not send the email. |
| AI litter announcements (Pro) | Actual live request returned email and social versions successfully. |
| AI buyer matching (Pro) | Actual live request with a puppy and waitlisted buyer returned a matching suggestion. Suggestions do not automatically assign puppies. |
| Online signing and signed copies | Automated signing/read-only-copy tests pass. Email-only sharing was a gap while sender configuration is incomplete. Fix prepared: authenticated signing-link creation/copy on draft/sent/signed contracts, with ownership/void protection and explicit “No email was sent” wording. |
| Buyer deposits through Stripe (Pro) | Automated hosted checkout, amount verification, ownership, retries, signed webhook reconciliation and history tests pass. Requires the breeder to finish Stripe Connect onboarding. No real buyer deposit or payout was made during this audit. |
| Subscription billing and cancellation | Earlier actual Stripe test checkout, seven-day trial, card replacement, scheduled cancellation and access revocation passed with isolated local records and the real Stripe test account. No live charge was made. |
| Free agreement download | Live DOCX returned 200 and a valid ZIP/document signature. |
| Field notes/articles | Blog index and all three advertised articles returned 200. |
| Home navigation | Previously published shared Home link was verified in-browser to return to the front page. |

## Verification and cleanup

All 49 backend tests pass after the signing-link fix. Frontend production build, lint and type checks pass, with the existing font warning. Live probes used synthetic buyer/litter/puppy/contract records and the real AI provider, rather than mocked AI. Those records were removed afterward. The synthetic account remains a seven-day, non-billing trial; no real customer data was used. No contract email, marketing message, charge or payout was sent.

## Remaining external dependency

Actual password-reset and contract email delivery still requires an owned, verified sender domain and FROM_EMAIL configuration. This report does not mark email delivery as working. Manual signing links remove that dependency from sharing/signing agreements once the prepared fix is published.

## Release state

The timeout and signing-link fixes are prepared for review and publication. Live generation, saving and other results above refer to the current deployed app; the new fixes must be deployed before customers receive them.
