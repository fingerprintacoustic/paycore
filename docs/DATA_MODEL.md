# PayCore — Firestore Data Model

> Placeholder project name. Swap once you've cleared the real name for
> trademark/domain/business-name conflicts.

## Design principles

1. **Balances are never trusted from the client.** Every write that touches
   money happens inside a Cloud Function, inside a Firestore transaction.
2. **Every transfer is idempotent.** The client generates a `requestId`
   (UUID) before calling the function. The function uses that ID as the
   transaction document ID, so retries (flaky network, double-tap) can never
   create a second transfer.
3. **Money moves as a single atomic transaction**: debit sender, credit
   receiver, write the transaction record, write two ledger entries — all
   inside one Firestore `runTransaction`, or none of it happens.
4. **Firestore holds current state; a separate `ledgerEntries` collection
   holds the append-only history** each balance change can be reconstructed
   from. This is what makes reconciliation and fraud review possible later.
5. **Security rules deny all writes to `wallets` and `transactions` from
   clients.** Reads are scoped to the owner (or admin custom claim). All
   writes go through Cloud Functions using the Admin SDK, which bypasses
   rules by design — that's the trust boundary.

---

## Collections

### `users/{uid}`
```
uid: string (== Firebase Auth UID)
email: string
phone: string | null
displayName: string
photoURL: string | null
address: { line1, line2?, city, region, postalCode, country } | null
role: "user" | "admin" | "support"
status: "active" | "frozen" | "pending_verification"
pinHash: string | null        // Argon2id hash, set via callable fn only
pinSetAt: Timestamp | null
twoFactorEnabled: boolean
emailVerified: boolean
notificationPrefs: { email: boolean, push: boolean, sms: boolean }
createdAt: Timestamp
updatedAt: Timestamp
lastLoginAt: Timestamp | null
searchTokens: string[]        // lowercase prefix tokens for search (see below)
```
No balance field here — balance lives only in `wallets`.

### `wallets/{uid}`
```
uid: string                    // == users/{uid}, 1:1
balance: number                // integer minor units (cents), never float
currency: string                // "USD" etc.
status: "active" | "frozen"
version: number                 // optimistic concurrency counter, incremented every write
createdAt: Timestamp
updatedAt: Timestamp
```
**Balance is stored in integer minor units** (e.g. cents) to avoid float
rounding bugs — a classic source of real money bugs. Convert to display
currency only in the UI layer.

### `transactions/{transactionId}`
`transactionId` == the client-supplied `requestId` (idempotency key).
```
id: string
type: "transfer" | "deposit" | "withdrawal" | "reversal"
status: "pending" | "completed" | "failed" | "reversed"
fromUid: string | null          // null for admin deposit
toUid: string | null            // null for withdrawal
amount: number                  // integer minor units, always positive
currency: string
note: string | null
referenceNumber: string         // human-facing, e.g. PC-2026-000123
createdAt: Timestamp
completedAt: Timestamp | null
failureReason: string | null
initiatedBy: string             // uid of actor (user, or admin uid for manual credit)
metadata: { ip: string, userAgent: string } | null
```

### `ledgerEntries/{entryId}`
Append-only double-entry style record, one pair per transaction.
```
id: string
transactionId: string           // FK -> transactions
uid: string                     // whose ledger this entry belongs to
direction: "debit" | "credit"
amount: number                  // integer minor units, always positive
balanceAfter: number            // wallet balance snapshot after this entry
createdAt: Timestamp
```
This is what lets you rebuild any wallet's balance from history and prove
it matches `wallets.balance` — critical for audits and fraud review.

### `notifications/{notificationId}`
```
uid: string
type: "transfer_received" | "transfer_sent" | "deposit" | "withdrawal_approved" | "security_alert" | "announcement"
title: string
body: string
read: boolean
createdAt: Timestamp
data: object | null             // deep-link payload
```

### `auditLogs/{logId}`
Every admin action and every sensitive user action (PIN change, password
change, 2FA toggle, freeze/unfreeze) writes here. Immutable, no client
writes, no client reads except by admins.
```
id: string
actorUid: string
actorRole: "user" | "admin" | "support" | "system"
action: string                  // e.g. "wallet.credit", "user.freeze"
targetType: "user" | "wallet" | "transaction" | "settings" | "announcement"
targetId: string
before: object | null
after: object | null
ip: string | null
createdAt: Timestamp
}
```

### `settings/global`
Single document, admin-writable only.
```
maintenanceMode: boolean
minTransferAmount: number
maxTransferAmount: number
dailyTransferLimit: number
withdrawalRequiresApproval: boolean
supportedCurrencies: string[]
```

### `announcements/{announcementId}`
```
title: string
body: string
audience: "all" | "verified_only"
active: boolean
createdBy: string
createdAt: Timestamp
expiresAt: Timestamp | null
```

### `supportTickets/{ticketId}`
```
uid: string
subject: string
status: "open" | "in_progress" | "resolved" | "closed"
messages: [{ sender: "user" | "admin", body: string, sentAt: Timestamp }]
createdAt: Timestamp
updatedAt: Timestamp
assignedTo: string | null
```

### `withdrawalRequests/{requestId}`
(Split out from `transactions` because these need an approval workflow.)
```
id: string
uid: string
amount: number
status: "pending" | "approved" | "rejected"
requestedAt: Timestamp
reviewedBy: string | null
reviewedAt: Timestamp | null
payoutDetails: object            // bank/mobile-money details, MVP: free text
```

---

## Indexes you'll need (composite)

- `transactions`: `(fromUid ASC, createdAt DESC)` and `(toUid ASC, createdAt DESC)`
- `notifications`: `(uid ASC, read ASC, createdAt DESC)`
- `auditLogs`: `(targetType ASC, targetId ASC, createdAt DESC)`
- `withdrawalRequests`: `(status ASC, requestedAt ASC)`

## Search strategy

Firestore has no native full-text/prefix search across fields. For the
admin "search by phone/email/username/account ID" requirement at MVP scale,
generate a `searchTokens` array on `users` (lowercase prefixes of email,
phone digits, displayName, uid) at write time and query with
`array-contains`. When you outgrow that, swap in Algolia or Typesense via a
Cloud Function trigger — the token field can stay as a fallback.
