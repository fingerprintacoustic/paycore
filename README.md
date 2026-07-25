# PayCore

> **Naming note:** this project was built under the placeholder name
> "PayCore." Swap it for your real brand once you've cleared it as a
> domain, business name, and trademark — search-and-replace
> `PayCore`/`paycore` across the repo, including Firebase project IDs,
> before you launch.

A digital wallet and peer-to-peer money transfer platform for small
businesses, community groups, organizations, and individuals — instant
internal transfers, real receipts, QR pay/request, and an admin portal
for wallet management and oversight.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | Firebase Auth, Cloud Firestore, Cloud Functions (2nd gen), Cloud Messaging |
| Hosting | Firebase Hosting (Next.js SSR via `frameworksBackend`) |
| CI/CD | GitHub Actions |

## Repository structure

```
paycore/
├── web/                    # Next.js app — public site, user dashboard, admin portal
│   ├── src/app/            # routes: /, /login, /register, /dashboard/*, /admin/*
│   ├── src/components/     # ui/, dashboard/, admin/, marketing/, theme/
│   ├── src/hooks/          # useWallet, useTransactions, useNotifications, usePushNotifications
│   └── src/lib/firebase/   # client + admin SDK singletons, callable wrappers
├── functions/               # Cloud Functions — the security-critical backend
│   └── src/                # transferFunds, auth triggers, PIN, 2FA, admin actions, push
├── scripts/                 # one-off ops scripts (grantAdminRole.ts)
├── tests/security-rules/    # Firestore rules tests (separate package, own emulator run)
├── docs/                    # DATA_MODEL, INSTALLATION, DEPLOYMENT, API
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
└── .github/workflows/       # ci.yml, deploy.yml
```

## Documentation

- [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) — Firestore collections, the transaction/ledger design, why balances are integer minor units
- [`docs/INSTALLATION.md`](./docs/INSTALLATION.md) — local setup, Firebase project creation, running the emulators
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — deploying to Firebase, bootstrapping your first admin, GitHub Actions secrets
- [`docs/API.md`](./docs/API.md) — every Cloud Functions callable: request/response shapes and error codes

## Core security properties

These aren't optional add-ons — they're the reason the ledger can be trusted at all:

- **The client never writes balances.** `wallets` and `transactions` are locked to client writes in `firestore.rules`; every balance change happens in a Cloud Function using the Admin SDK.
- **Every transfer is idempotent.** The client generates a `requestId`; it becomes the transaction document's ID, so a retried request returns the original result instead of moving money twice.
- **Every transfer is atomic.** Debit, credit, transaction record, ledger entries, and notifications all happen inside one `runTransaction` — all or nothing.
- **PINs are hashed, never stored or logged in plaintext**, and lock out after 5 failed attempts.
- **Freezing an account revokes active sessions immediately**, not just on next token expiry.

## Quick start

See [`docs/INSTALLATION.md`](./docs/INSTALLATION.md) for the full walkthrough. Short version:

```bash
# 1. Install dependencies
cd web && npm install && cd ../functions && npm install && cd ..

# 2. Configure environment
cp web/.env.local.example web/.env.local   # fill in your Firebase project's config

# 3. Run the emulator suite + app locally
firebase emulators:start
cd web && npm run dev
```

## License

Choose and add a license before making this repository public — none is
specified yet.
