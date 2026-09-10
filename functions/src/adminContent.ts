import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireAdmin, writeAuditLog } from "./lib/adminGuard";

const db = getFirestore();

export const upsertAnnouncement = functions.onCall<{
  announcementId?: string; // omit to create
  title: string;
  body: string;
  audience: "all" | "verified_only";
  active: boolean;
  expiresAt?: string; // ISO date, optional
}>({ enforceAppCheck: true }, async (request) => {
  const adminUid = await requireAdmin(request.auth?.uid);
  const { announcementId, title, body, audience, active, expiresAt } = request.data;

  if (!title || title.length > 200 || !body || body.length > 2000) {
    throw new HttpsError("invalid-argument", "Title or body invalid.");
  }

  const ref = announcementId
    ? db.collection("announcements").doc(announcementId)
    : db.collection("announcements").doc();

  const now = Timestamp.now();
  await ref.set(
    {
      title,
      body,
      audience,
      active,
      createdBy: adminUid,
      createdAt: now,
      expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
    },
    { merge: true }
  );

  await writeAuditLog({
    actorUid: adminUid,
    actorRole: "admin",
    action: announcementId ? "announcement.update" : "announcement.create",
    targetType: "announcement",
    targetId: ref.id,
    after: { title, active },
  });

  return { announcementId: ref.id };
});

export const deleteAnnouncement = functions.onCall<{ announcementId: string }>(
  { enforceAppCheck: true },
  async (request) => {
    const adminUid = await requireAdmin(request.auth?.uid);
    const { announcementId } = request.data;
    await db.collection("announcements").doc(announcementId).delete();
    await writeAuditLog({
      actorUid: adminUid,
      actorRole: "admin",
      action: "announcement.delete",
      targetType: "announcement",
      targetId: announcementId,
    });
    return { status: "ok" };
  }
);

const AMOUNT_FIELDS = ["minTransferAmount", "maxTransferAmount", "dailyTransferLimit"] as const;
const BOOL_FIELDS = ["maintenanceMode", "withdrawalRequiresApproval"] as const;
const SETTINGS_KEYS: string[] = [...AMOUNT_FIELDS, ...BOOL_FIELDS];
const ABS_MAX_AMOUNT = 500_000_00;

export const updateSettings = functions.onCall<{
  maintenanceMode?: boolean;
  minTransferAmount?: number;
  maxTransferAmount?: number;
  dailyTransferLimit?: number;
  withdrawalRequiresApproval?: boolean;
}>({ enforceAppCheck: true }, async (request) => {
  const adminUid = await requireAdmin(request.auth?.uid);

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(request.data)) {
    if (!SETTINGS_KEYS.includes(key)) {
      throw new HttpsError("invalid-argument", `Unknown setting: ${key}`);
    }
    if ((BOOL_FIELDS as readonly string[]).includes(key)) {
      if (typeof value !== "boolean") throw new HttpsError("invalid-argument", `${key} must be a boolean.`);
    } else {
      if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > ABS_MAX_AMOUNT) {
        throw new HttpsError("invalid-argument", `${key} must be a whole number of cents between 1 and ${ABS_MAX_AMOUNT}.`);
      }
    }
    patch[key] = value;
  }

  const before = (await db.collection("settings").doc("global").get()).data() ?? {};
  const merged = { ...before, ...patch };
  const min = merged.minTransferAmount ?? 100;
  const max = merged.maxTransferAmount ?? ABS_MAX_AMOUNT;
  const daily = merged.dailyTransferLimit ?? ABS_MAX_AMOUNT;
  if (min > max) throw new HttpsError("invalid-argument", "minTransferAmount can't exceed maxTransferAmount.");
  if (daily < max) throw new HttpsError("invalid-argument", "dailyTransferLimit can't be below maxTransferAmount.");

  await db.collection("settings").doc("global").set(patch, { merge: true });

  await writeAuditLog({
    actorUid: adminUid,
    actorRole: "admin",
    action: "settings.update",
    targetType: "settings",
    targetId: "global",
    before,
    after: patch,
  });

  return { status: "ok" };
});
