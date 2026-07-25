import * as functionsV1 from "firebase-functions/v1";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();

// Note: this uses the v1 SDK's auth.user().onCreate — as of writing, v2
// "identity" triggers (onIdentityCreated / beforeUserCreated) are blocking
// triggers meant for pre-creation checks, not the fire-and-forget
// post-creation setup this needs. Mixing v1 and v2 triggers in one
// functions app is fully supported.
export const onUserCreated = functionsV1.auth.user().onCreate(async (user) => {
  const now = Timestamp.now();

  // Every new account starts as a plain "user" with no special claims.
  // Admin/support roles are granted explicitly later via a separate
  // admin-only callable (see admin.ts), never automatically.
  await getAuth().setCustomUserClaims(user.uid, { role: "user" });

  const searchTokens = buildSearchTokens(user.email ?? undefined, user.phoneNumber ?? undefined);

  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email ?? null,
    phone: user.phoneNumber ?? null,
    displayName: user.displayName ?? (user.email ? user.email.split("@")[0] : "New user"),
    photoURL: user.photoURL ?? null,
    address: null,
    role: "user",
    status: "pending_verification",
    pinHash: null,
    pinSetAt: null,
    twoFactorEnabled: false,
    twoFactorSecret: null, // set only server-side during enrollment, never read by client rules
    emailVerified: user.emailVerified,
    notificationPrefs: { email: true, push: true, sms: false },
    searchTokens,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  });

  await db.collection("wallets").doc(user.uid).set({
    uid: user.uid,
    balance: 0,
    currency: "USD",
    status: "active",
    version: 0,
    createdAt: now,
    updatedAt: now,
  });
});

// Clean up on account deletion — freeze the wallet record rather than
// deleting it outright, so transaction history referencing this uid stays
// intact for audit purposes.
export const onUserDeleted = functionsV1.auth.user().onDelete(async (user) => {
  const now = Timestamp.now();
  await db.collection("wallets").doc(user.uid).update({ status: "frozen", updatedAt: now }).catch(() => {
    // Wallet may not exist if account creation failed partway; ignore.
  });
  await db.collection("users").doc(user.uid).update({ status: "frozen", updatedAt: now }).catch(() => {});
});

function buildSearchTokens(email?: string, phone?: string): string[] {
  const tokens = new Set<string>();
  if (email) {
    const lower = email.toLowerCase();
    tokens.add(lower);
    for (let i = 3; i <= lower.length; i++) tokens.add(lower.slice(0, i));
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    for (let i = 3; i <= digits.length; i++) tokens.add(digits.slice(-i)); // suffix search is more useful for phone numbers
  }
  return Array.from(tokens);
}
