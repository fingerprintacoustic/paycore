import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { securityDocRef, readSecurityDoc } from "./lib/securityDoc";

const db = getFirestore();
const PIN_REGEX = /^\d{4,6}$/;
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const STEP_UP_TTL_MS = 5 * 60 * 1000;
// Changing an existing PIN counts as a recent re-auth if the account
// signed in (or re-authenticated) within this window.
const REAUTH_WINDOW_MS = 5 * 60 * 1000;

/**
 * PIN state, read from private/security with a fallback to the user doc
 * for accounts that scripts/migrateSecurityFields.ts hasn't moved yet.
 * The next setPin/verifyPin write always lands in private/security.
 */
async function readPinState(
  uid: string,
  userData?: FirebaseFirestore.DocumentData
): Promise<{
  pinHash: string | null;
  pinFailedAttempts: number;
  pinLockedUntil: FirebaseFirestore.Timestamp | null;
}> {
  const security = await readSecurityDoc(uid);
  if (security.pinHash != null) {
    return {
      pinHash: security.pinHash,
      pinFailedAttempts: security.pinFailedAttempts ?? 0,
      pinLockedUntil: security.pinLockedUntil ?? null,
    };
  }
  const legacy = userData ?? (await db.collection("users").doc(uid).get()).data() ?? {};
  return {
    pinHash: legacy.pinHash ?? null,
    pinFailedAttempts: legacy.pinFailedAttempts ?? security.pinFailedAttempts ?? 0,
    pinLockedUntil: legacy.pinLockedUntil ?? security.pinLockedUntil ?? null,
  };
}

async function writeAuditLog(actorUid: string, action: string, targetId: string) {
  const ref = db.collection("auditLogs").doc();
  await ref.set({
    id: ref.id,
    actorUid,
    actorRole: "user",
    action,
    targetType: "user",
    targetId,
    before: null,
    after: null,
    ip: null,
    createdAt: Timestamp.now(),
  });
}

export const setPin = functions.onCall<{ pin: string; currentPin?: string }>(
  { enforceAppCheck: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const { pin, currentPin } = request.data;
    if (!PIN_REGEX.test(pin ?? "")) {
      throw new HttpsError("invalid-argument", "PIN must be 4–6 digits.");
    }
    if (isWeakPin(pin)) {
      throw new HttpsError("invalid-argument", "Choose a less predictable PIN.");
    }

    const existingHash = (await readPinState(uid)).pinHash ?? undefined;

    // The PIN's job is to stay a barrier even if someone gets the session.
    // So *changing* an existing PIN can't rely on the session alone — it
    // needs the current PIN, or a recent re-authentication (auth_time is
    // refreshed when the client re-enters the account password). First-time
    // setup has nothing to protect yet, so it's allowed straight through.
    if (existingHash) {
      const authTimeSec =
        typeof request.auth?.token?.auth_time === "number" ? request.auth.token.auth_time : 0;
      const reauthedRecently = Date.now() - authTimeSec * 1000 < REAUTH_WINDOW_MS;
      const currentPinOk =
        typeof currentPin === "string" && (await bcrypt.compare(currentPin, existingHash));
      if (!reauthedRecently && !currentPinOk) {
        throw new HttpsError(
          "permission-denied",
          "To change your PIN, enter your current PIN or re-enter your password."
        );
      }
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const now = Timestamp.now();
    await securityDocRef(uid).set(
      { pinHash, pinFailedAttempts: 0, pinLockedUntil: null },
      { merge: true }
    );
    await db.collection("users").doc(uid).update({ pinSetAt: now, updatedAt: now });
    await writeAuditLog(uid, existingHash ? "user.pin_changed" : "user.pin_set", uid);
    return { status: "ok" };
  }
);

/** Verifies the PIN and returns a short-lived, single-use step-up token. */
export const verifyPin = functions.onCall<{ pin: string }>(
  { enforceAppCheck: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) throw new HttpsError("not-found", "Account not found.");

    const user = userSnap.data()!;
    const now = Date.now();
    if (user.status && user.status !== "active") {
      throw new HttpsError("failed-precondition", "Your account is not active.");
    }

    const pinState = await readPinState(uid, user);
    if (pinState.pinLockedUntil && pinState.pinLockedUntil.toMillis() > now) {
      const minutesLeft = Math.ceil((pinState.pinLockedUntil.toMillis() - now) / 60000);
      throw new HttpsError("resource-exhausted", `Too many attempts. Try again in ${minutesLeft} min.`);
    }
    if (!pinState.pinHash) {
      throw new HttpsError("failed-precondition", "No PIN set for this account.");
    }

    const secRef = securityDocRef(uid);
    const { pin } = request.data;
    const isMatch = await bcrypt.compare(pin ?? "", pinState.pinHash);
    if (!isMatch) {
      const attempts = pinState.pinFailedAttempts + 1;
      const update: Record<string, unknown> = { pinFailedAttempts: attempts };
      if (attempts >= MAX_PIN_ATTEMPTS) {
        update.pinLockedUntil = Timestamp.fromMillis(now + LOCKOUT_MS);
        update.pinFailedAttempts = 0;
        await writeAuditLog(uid, "user.pin_locked", uid);
      }
      await secRef.set(update, { merge: true });
      throw new HttpsError("permission-denied", "Incorrect PIN.");
    }

    await secRef.set({ pinFailedAttempts: 0, pinLockedUntil: null }, { merge: true });
    const token = randomUUID();
    const tokenRef = db.collection("stepUpTokens").doc(token);
    await tokenRef.set({
      uid,
      purpose: "transfer",
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + STEP_UP_TTL_MS),
      usedAt: null,
    });
    return { status: "ok", stepUpToken: token, expiresInSeconds: STEP_UP_TTL_MS / 1000 };
  }
);

function isWeakPin(pin: string): boolean {
  const weak = [
    "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
    "1234", "123456", "654321", "1212", "1122",
  ];
  return weak.includes(pin);
}
