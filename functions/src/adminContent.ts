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
}>({ enforceAppCheck: true,
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
  { enforceAppCheck: true,
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

export const updateSettings = functions.onCall<{
  maintenanceMode?: boolean;
  minTransferAmount?: number;
  maxTransferAmount?: number;
  dailyTransferLimit?: number;
  withdrawalRequiresApproval?: boolean;
}>({ enforceAppCheck: true,
  const adminUid = await requireAdmin(request.auth?.uid);
  const before = (await db.collection("settings").doc("global").get()).data() ?? null;

  await db.collection("settings").doc("global").set(request.data, { merge: true });

  await writeAuditLog({
    actorUid: adminUid,
    actorRole: "admin",
    action: "settings.update",
    targetType: "settings",
    targetId: "global",
    before,
    after: request.data,
  });

  return { status: "ok" };
});
