# API reference — Cloud Functions callables

All functions below are Firebase **callable functions** (`httpsCallable`),
not REST endpoints — call them via the Firebase client SDK, not `fetch`.
Region: `us-central1`. All require App Check and an authenticated Firebase
Auth session unless noted otherwise.

Errors are thrown as `HttpsError` with a `code` and `message`. Common
codes used throughout: `unauthenticated`, `invalid-argument`,
`failed-precondition`, `permission-denied`, `not-found`,
`resource-exhausted`.

---

## `transferFunds`

Internal peer-to-peer transfer. Atomic and idempotent.

**Request**
```ts
{
  requestId: string;  // client-generated UUID — reuse for retries of the SAME attempt
  toUid: string;
  amount: number;     // integer cents, e.g. 2500 = $25.00
  note?: string;      // max 280 chars
}
```

**Response**
```ts
{
  transactionId: string;
  status: "completed";
  referenceNumber: string;   // e.g. "PC-2026-004821"
  newBalance: number | null; // null if this call replayed an existing requestId
}
```

**Errors**: `unauthenticated` (not signed in) · `invalid-argument`
(missing/invalid fields, amount out of range, sending to self) ·
`not-found` (recipient doesn't exist) · `failed-precondition` (sender or
recipient wallet frozen, currency mismatch, insufficient balance).

---

## `setPin` / `verifyPin`

`setPin` — creates or resets a transaction PIN (4–6 digits).
```ts
// request: { pin: string }
// response: { status: "ok" }
```
Rejects PINs in an obvious weak list (`1234`, `0000`, etc.) with
`invalid-argument`.

`verifyPin` — step-up check before a sensitive action (e.g. before
calling `transferFunds` from the UI).
```ts
// request: { pin: string }
// response: { status: "ok" }
```
Locks out for 15 minutes after 5 failed attempts:
`resource-exhausted`. Wrong PIN (not yet locked out): `permission-denied`.
No PIN set yet: `failed-precondition`.

---

## `start2FAEnrollment` / `confirm2FAEnrollment` / `verify2FACode` / `disable2FA`

Standard TOTP (works with Google Authenticator, Authy, etc.).

```ts
// start2FAEnrollment
// request: {}
// response: { otpauthUrl: string }  // render as a QR code client-side

// confirm2FAEnrollment
// request: { code: string }  // 6-digit code from the authenticator app
// response: { status: "ok" }

// verify2FACode
// request: { code: string }
// response: { status: "ok" }

// disable2FA
// request: { code: string }  // must provide a valid current code to disable
// response: { status: "ok" }
```

---

## `requestWithdrawal`

User requests a payout. Funds are held immediately (debited from the
available balance) pending admin review.

```ts
// request: { amount: number; payoutDetails: Record<string, string> }
// response: { requestId: string; status: "pending" }
```

**Errors**: `failed-precondition` (frozen wallet, insufficient balance).

---

## Admin-only callables

All of the following throw `permission-denied` unless the caller's
Firestore `users/{uid}.role` field is `"admin"`. There is no self-serve
way to acquire this role — see `scripts/grantAdminRole.ts`.

### `adminCreditWallet` / `adminDebitWallet`
```ts
// request: { targetUid: string; amount: number; note?: string }
// response: { status: "ok" }
```
Debit throws `failed-precondition` if it would take the wallet negative.

### `freezeAccount` / `reactivateAccount`
```ts
// freezeAccount request: { targetUid: string; reason?: string }
// reactivateAccount request: { targetUid: string }
// response (both): { status: "ok" }
```
Freezing also revokes the user's active Firebase Auth sessions — they're
signed out everywhere within minutes, not just on next token refresh.

### `reviewWithdrawal`
```ts
// request: { requestId: string; decision: "approved" | "rejected" }
// response: { status: "ok" }
```
Rejecting automatically returns the held funds to the user's wallet.

### `upsertAnnouncement` / `deleteAnnouncement`
```ts
// upsertAnnouncement request:
{
  announcementId?: string;  // omit to create a new one
  title: string;            // max 200 chars
  body: string;             // max 2000 chars
  audience: "all" | "verified_only";
  active: boolean;
  expiresAt?: string;       // ISO date string, optional
}
// response: { announcementId: string }

// deleteAnnouncement request: { announcementId: string }
// response: { status: "ok" }
```

### `updateSettings`
Patches `settings/global` — pass only the fields you want to change.
```ts
{
  maintenanceMode?: boolean;
  minTransferAmount?: number;   // cents
  maxTransferAmount?: number;   // cents
  dailyTransferLimit?: number;  // cents
  withdrawalRequiresApproval?: boolean;
}
// response: { status: "ok" }
```

---

## Firestore reads (not callables)

Most reads happen directly against Firestore from the client, governed
by `firestore.rules` — there's no REST wrapper for these:

| Data | Path | Access |
|---|---|---|
| Own wallet balance | `wallets/{uid}` | owner or support/admin |
| Own transactions | `transactions` where `fromUid`/`toUid == uid` | participant or support/admin |
| Own notifications | `notifications` where `uid == uid` | owner only |
| Active announcements | `announcements` | any signed-in user |

## REST endpoints (Next.js API routes, not Firebase callables)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/session` | `POST` | Firebase ID token in body | Exchanges an ID token for the httpOnly session cookie |
| `/api/auth/session` | `DELETE` | session cookie | Clears the session cookie (logout) |
| `/api/contact` | `POST` | none (public) | Public contact form → `contactMessages` collection |
| `/api/admin/reports/transactions` | `GET` | admin session | CSV export, last 5,000 transactions |
| `/api/admin/reports/users` | `GET` | admin session | CSV export, all users |
