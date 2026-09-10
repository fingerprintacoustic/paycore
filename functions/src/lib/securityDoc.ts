import { getFirestore } from "firebase-admin/firestore";

/**
 * Per-user secrets that must never be readable by a client: the PIN hash,
 * PIN lockout counters, and the TOTP secret(s).
 *
 * They live in `users/{uid}/private/security`, a subcollection that
 * firestore.rules denies to every client — only the Admin SDK (which
 * bypasses rules) reads or writes it. Firestore rules do not cascade into
 * subcollections, and there is no field-level read control, so this is the
 * only way to keep these out of a `users/{uid}` document that the account
 * owner is allowed to read.
 */
export interface SecurityDoc {
  pinHash: string | null;
  pinFailedAttempts: number;
  pinLockedUntil: FirebaseFirestore.Timestamp | null;
  twoFactorSecret: string | null;
  pending2FASecret: string | null;
}

export function securityDocRef(uid: string) {
  return getFirestore().collection("users").doc(uid).collection("private").doc("security");
}

export async function readSecurityDoc(uid: string): Promise<Partial<SecurityDoc>> {
  const snap = await securityDocRef(uid).get();
  return snap.exists ? (snap.data() as Partial<SecurityDoc>) : {};
}
