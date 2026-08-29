import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();

function buildSearchTokens(email?: string, phone?: string): string[] {
  const tokens = new Set<string>();
  if (email) {
    const lower = email.toLowerCase();
    tokens.add(lower);
    for (let i = 3; i <= lower.length; i++) tokens.add(lower.slice(0, i));
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    for (let i = 3; i <= digits.length; i++) tokens.add(digits.slice(-i));
  }
  return Array.from(tokens);
}

/**
 * Flips a user from pending_verification to active after they have linked a
 * phone number to their Firebase Auth account. The phone link itself happens
 * client-side (linkWithCredential) and is already verified by Identity
 * Toolkit — this callable only trusts what the Auth record says, never the
 * request payload.
 */
export const markPhoneVerified = functions.onCall(
  { enforceAppCheck: false },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    // Authoritative source: the Firebase Auth user record. If no phone is
    // linked there, the client is lying or racing the account-link write.
    const authUser = await getAuth().getUser(uid);
    const phone = authUser.phoneNumber ?? null;
    if (!phone) {
      throw new HttpsError(
        "failed-precondition",
        "No verified phone number on this account."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) throw new HttpsError("not-found", "Account not found.");

    const user = snap.data()!;
    const now = Timestamp.now();

    // Idempotent: already active with this phone → no-op success.
    if (user.status === "active" && user.phone === phone) {
      return { status: "already_active" };
    }

    // Never reactivate a frozen account through this path — that is an
    // admin-only decision (reactivateAccount).
    if (user.status === "frozen") {
      throw new HttpsError("failed-precondition", "Account is frozen.");
    }

    const searchTokens = buildSearchTokens(authUser.email ?? undefined, phone);

    await userRef.update({
      phone,
      status: "active",
      searchTokens,
      updatedAt: now,
    });

    return { status: "activated" };
  }
);
