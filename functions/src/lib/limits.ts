import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

const db = getFirestore();

export interface GlobalSettings {
  maintenanceMode: boolean;
  minTransferAmount: number;
  maxTransferAmount: number;
  dailyTransferLimit: number;
  withdrawalRequiresApproval: boolean;
}

// Used when settings/global is missing or a field is unset. Deliberately
// generous — a real limit is only in force once an admin sets it.
export const DEFAULT_SETTINGS: GlobalSettings = {
  maintenanceMode: false,
  minTransferAmount: 100, // $1.00
  maxTransferAmount: 500_000_00, // $500,000
  dailyTransferLimit: 1_000_000_00, // $1,000,000
  withdrawalRequiresApproval: true,
};

export async function getSettings(): Promise<GlobalSettings> {
  const snap = await db.collection("settings").doc("global").get();
  return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<GlobalSettings> | undefined) };
}

export function assertNotInMaintenance(settings: GlobalSettings): void {
  if (settings.maintenanceMode) {
    throw new HttpsError(
      "unavailable",
      "PayCore is temporarily in maintenance. Money movement is paused — please try again shortly."
    );
  }
}

/**
 * Total outbound money a user has moved in the last 24h: transfers sent
 * plus withdrawals still in flight or paid out (rejected withdrawals were
 * refunded, so they don't count). Used to enforce dailyTransferLimit
 * across both paths, which is the meaningful risk boundary.
 */
export async function outboundLast24h(uid: string): Promise<number> {
  const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const [transfers, withdrawals] = await Promise.all([
    db
      .collection("transactions")
      .where("fromUid", "==", uid)
      .where("createdAt", ">=", since)
      .get(),
    db
      .collection("withdrawalRequests")
      .where("uid", "==", uid)
      .where("requestedAt", ">=", since)
      .get(),
  ]);

  let total = 0;
  transfers.forEach((d) => {
    const t = d.data();
    if (t.type === "transfer") total += t.amount ?? 0;
  });
  withdrawals.forEach((d) => {
    const w = d.data();
    if (w.status !== "rejected") total += w.amount ?? 0;
  });
  return total;
}
