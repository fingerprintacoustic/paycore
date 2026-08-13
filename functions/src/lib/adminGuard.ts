import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * The authoritative admin check for every admin-only callable. Reads the
 * `role` field from Firestore (not the auth token's custom claim) so it
 * stays in lockstep with the same field the rest of the app treats as the
 * source of truth (see freeze-status checks in the dashboard layout).
 * Granting admin access is a manual, out-of-band operation — see
 * scripts/grantAdminRole.ts — never self-serve or automatic.
 */
export async function requireAdmin(uid: string | undefined): Promise<string> {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return uid;
}

export async function writeAuditLog(params: {
  actorUid: string;
  actorRole: "admin" | "user" | "support" | "system";
  action: string;
  targetType: "user" | "wallet" | "transaction" | "settings" | "announcement";
  targetId: string;
  before?: unknown;
  after?: unknown;
}) {
  const { Timestamp } = await import("firebase-admin/firestore");
  const ref = db.collection("auditLogs").doc();
  await ref.set({
    id: ref.id,
    actorUid: params.actorUid,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    before: params.before ?? null,
    after: params.after ?? null,
    ip: null,
    createdAt: Timestamp.now(),
  });
}
