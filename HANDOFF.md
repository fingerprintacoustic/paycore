# PayCore — Project Handoff Summary

*Placeholder project name — rename before launch (see README.md note on
domain/trademark/business-name clearance).*

**Status: code-complete for the scope below, but never installed, run, or
deployed.** Nothing in this repo has been executed end-to-end. Budget time
for first-run debugging before showing it to a client.

---

## What this is

A digital wallet / P2P money transfer platform for small businesses,
community groups, organizations, and individuals — Next.js + TypeScript +
Tailwind frontend, Firebase (Auth, Firestore, Cloud Functions, Cloud
Messaging) backend, Firebase Hosting.

## What's built

| Area | Status | Notes |
|---|---|---|
| Data model & security rules | ✅ Complete | `docs/DATA_MODEL.md`, `firestore.rules`, `storage.rules` |
| Auth (email, phone, password reset, email verify) | ✅ Complete | Session via httpOnly cookie, not raw ID tokens |
| PIN + 2FA (TOTP) | ✅ Complete | Bcrypt hashing, 5-attempt lockout, standard authenticator app support |
| Wallet + atomic transfers | ✅ Complete | Idempotent (`requestId`), atomic Firestore transactions, no double-spend |
| User dashboard | ✅ Mostly complete | Balance, send, receive/QR, activity feed. **Missing:** Request money page, wallet history page, profile page (linked in nav, not built — 404 currently) |
| Admin portal | ✅ Complete | Overview stats, user management, credit/debit, freeze/reactivate, withdrawal approval, announcements, settings, CSV reports |
| Public landing page | ✅ Complete | Hero, features, security, pricing, about, contact — dark/light mode |
| Push notifications (FCM) | ✅ Complete | Requires generating a VAPID key in Firebase console (manual step) |
| GitHub Actions (CI + deploy) | ✅ Complete | Needs repo secrets configured before it can run |
| Tests | ✅ Partial | Security rules tests + Cloud Functions unit tests (transferFunds, PIN). **Not covered:** admin functions, 2FA, frontend components |
| Docs | ✅ Complete | README, DATA_MODEL, INSTALLATION, DEPLOYMENT, API reference |
| Sample data seed script | ✅ Complete | Emulator-only, Firestore docs only (no matching Auth accounts) |

## Deployment target

Firebase Hosting + Cloud Functions handles building, serving, and scaling
this app directly — there is deliberately **no Docker setup** in this
repo. Docker would only matter if you ever wanted to run this on
non-Firebase infrastructure (a VPS, Cloud Run, AWS), which isn't the plan
here. Don't reintroduce it unless that changes.

## What's explicitly NOT built (flagged honestly, not silently skipped)

- **Request money page** — linked from the dashboard nav, route doesn't exist yet
- **Wallet transaction history page** and **user profile page** — same situation
- **Payment processor integrations** (Visa, Mastercard, PayPal, Stripe, EcoCash, OneMoney, InnBucks, bank APIs, remittance providers) — data model has room, nothing wired in
- **Monthly/failed-login report rollups** — admin reports currently only export live data (transactions, users); trend/monthly aggregation needs a scheduled Cloud Function, not yet built
- **Fraud detection** — beyond the audit log, no automated flagging
- **Any real Firebase project, deployment, or manual QA pass**

## Critical setup steps before this can run at all

1. Create a real Firebase project (Blaze plan required for Cloud Functions)
2. Enable Auth (email/password + phone), Firestore, Storage, Cloud Messaging
3. Fill in `web/.env.local` from `.env.local.example` (Firebase web config + VAPID key + service account JSON)
4. Set the real project ID in `.firebaserc`
5. **Bootstrap the first admin manually** — there's no in-app way to grant admin access by design; run `scripts/grantAdminRole.ts` (see `docs/INSTALLATION.md`)
6. Set up App Check — every Cloud Function requires it (`enforceAppCheck: true`); skipping this makes every callable reject all requests
7. Run `firebase emulators:start` + `npm run dev` locally and click through the full flow (register → verify phone → set PIN → send money → admin freeze/credit) before anyone else sees it

Full walkthrough: `docs/INSTALLATION.md` and `docs/DEPLOYMENT.md`.

## Architecture decisions worth knowing before continuing this

- **Money is stored in integer cents**, never floats, throughout — don't introduce decimal balances anywhere.
- **The client never writes to `wallets` or `transactions`** — this is enforced in `firestore.rules` and is the actual security boundary. Any new feature that touches balances must go through a new Cloud Function, not a direct Firestore write.
- **Every transfer is idempotent** via a client-generated `requestId` used as the transaction doc ID. If you add new money-moving functions, follow the same pattern (see `functions/src/transferFunds.ts`).
- **Admin role lives in a Firestore field (`users/{uid}.role`)**, checked directly by every admin Cloud Function and admin page — not the Auth custom claim, which can go stale. Keep both in sync if you touch role-granting code (see `scripts/grantAdminRole.ts`).
- **Design tokens**: brand green (`brand-500` etc. in `tailwind.config.ts`), Space Grotesk (display) + Inter (body) + JetBrains Mono with tabular figures (money amounts) — keep new UI consistent with this rather than introducing new fonts/palettes.

## Repo structure

```
paycore/
├── web/                    # Next.js app (public site, dashboard, admin)
├── functions/               # Cloud Functions (all money-moving/admin logic)
├── scripts/                 # grantAdminRole.ts (manual admin bootstrap)
├── tests/security-rules/    # Firestore rules tests (separate package)
├── sample-data/              # Emulator-only seed script
├── docs/                     # DATA_MODEL, INSTALLATION, DEPLOYMENT, API
├── firestore.rules, firestore.indexes.json, storage.rules, firebase.json
└── .github/workflows/        # ci.yml, deploy.yml
```

See `README.md` for the full breakdown and `docs/API.md` for every Cloud
Function's request/response shape — that's the fastest way for another
developer to get oriented on what each piece does.
