import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { authenticator } from "otplib";

const db = getFirestore();

// otplib's default window (1) tolerates one 30s step of clock drift either
// direction — enough for real-world clock skew without materially
// widening the guessing window.
authenticator.options = { window: 1 };

/**
 * Step 1 of enrollment: generate a secret and return the otpauth:// URI so
 * the client can render it as a QR code (e.g. with the `qrcode` package).
 * The secret is stored but NOT yet marked enabled — that only happens
 * after the user proves they can generate a valid code with it.
 */
export const start2FAEnrollment = functions.onCall(
  { enforceAppCheck: true,
  async (request) => {
    const uid = request.auth?.uid;
    const email = request.auth?.token.email;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email ?? uid, "PayCore", secret);

    // Pending secret, separate from the live one, so an abandoned
    // enrollment never silently activates.
    await db.collection("users").doc(uid).update({
      pending2FASecret: secret,
      updatedAt: Timestamp.now(),
    });

    return { otpauthUrl };
  }
);

/** Step 2: user enters a code from their authenticator app to confirm setup. */
export const confirm2FAEnrollment = functions.onCall<{ code: string }>(
  { enforceAppCheck: true,
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const pendingSecret = userSnap.data()?.pending2FASecret;
    if (!pendingSecret) {
      throw new HttpsError("failed-precondition", "No enrollment in progress.");
    }

    const isValid = authenticator.check(request.data.code ?? "", pendingSecret);
    if (!isValid) {
      throw new HttpsError("permission-denied", "Invalid code. Please try again.");
    }

    await userRef.update({
      twoFactorSecret: pendingSecret,
      twoFactorEnabled: true,
      pending2FASecret: null,
      updatedAt: Timestamp.now(),
    });

    const auditRef = db.collection("auditLogs").doc();
    await auditRef.set({
      id: auditRef.id,
      actorUid: uid,
      actorRole: "user",
      action: "user.2fa_enabled",
      targetType: "user",
      targetId: uid,
      before: null,
      after: null,
      ip: null,
      createdAt: Timestamp.now(),
    });

    return { status: "ok" };
  }
);

/** Used at login step-up and for disabling 2FA (require a fresh valid code either way). */
export const verify2FACode = functions.onCall<{ code: string }>(
  { enforceAppCheck: true,
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const userSnap = await db.collection("users").doc(uid).get();
    const secret = userSnap.data()?.twoFactorSecret;
    if (!secret) throw new HttpsError("failed-precondition", "2FA is not enabled.");

    const isValid = authenticator.check(request.data.code ?? "", secret);
    if (!isValid) throw new HttpsError("permission-denied", "Invalid code.");

    return { status: "ok" };
  }
);

export const disable2FA = functions.onCall<{ code: string }>(
  { enforceAppCheck: true,
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const secret = userSnap.data()?.twoFactorSecret;
    if (!secret) throw new HttpsError("failed-precondition", "2FA is not enabled.");

    const isValid = authenticator.check(request.data.code ?? "", secret);
    if (!isValid) throw new HttpsError("permission-denied", "Invalid code.");

    await userRef.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: Timestamp.now(),
    });
    return { status: "ok" };
  }
);
