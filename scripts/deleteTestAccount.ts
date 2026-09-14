/**
 * scripts/deleteTestAccount.ts
 *
 * Removes a test account (and only that account) from the live project:
 * its user/wallet docs, its own transactions/ledger entries/notifications/
 * deposit & withdrawal requests, and its Firebase Auth sign-in — so it
 * doesn't show up when handing the app over to a client.
 *
 * Safety, by design, since this is irreversible:
 *   - Dry run by default. Nothing is deleted unless you pass --delete.
 *   - Only ever touches the exact uid(s)/email(s) you name — never a
 *     pattern or bulk sweep.
 *   - A transaction is deleted only if EVERY account on it (both sides of
 *     a transfer) is in the set you named. If the other side is an
 *     account you're keeping, that transaction is left alone and printed
 *     as a warning instead — re-run with the counterpart's uid/email
 *     included if you want it gone too.
 *   - auditLogs are never touched. They're an intentionally immutable
 *     record and aren't shown anywhere in the app, so there's nothing to
 *     "clean up" for a handover, and deleting them would defeat their
 *     entire purpose.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npx tsx scripts/deleteTestAccount.ts <uid-or-email> [<uid-or-email> ...]            # dry run — reports only
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npx tsx scripts/deleteTestAccount.ts <uid-or-email> [<uid-or-email> ...] --delete   # actually deletes
 *
 * Run it once without --delete, read the report carefully, and only
 * re-run with --delete once you're sure it lists exactly what you expect.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();
const auth = getAuth();

const PER_USER_COLLECTIONS = ["depositRequests", "withdrawalRequests", "stepUpTokens", "notifications"] as const;

async function resolveUid(identifier: string): Promise<{ uid: string; email: string | null }> {
  if (identifier.includes("@")) {
    const user = await auth.getUserByEmail(identifier);
    return { uid: user.uid, email: user.email ?? null };
  }
  const user = await auth.getUser(identifier).catch(() => null);
  return { uid: identifier, email: user?.email ?? null };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--delete");
  const identifiers = args.filter((a) => a !== "--delete");

  if (identifiers.length === 0) {
    console.error("Usage: tsx scripts/deleteTestAccount.ts <uid-or-email> [<uid-or-email> ...] [--delete]");
    process.exit(1);
  }

  const resolved = await Promise.all(identifiers.map(resolveUid));
  const uids = new Set(resolved.map((r) => r.uid));

  console.log(`${apply ? "DELETING" : "DRY RUN — nothing will be deleted"} for:`);
  for (const r of resolved) console.log(`  ${r.uid}${r.email ? ` (${r.email})` : ""}`);
  console.log("");

  const deletions: FirebaseFirestore.DocumentReference[] = [];

  for (const uid of uids) {
    deletions.push(db.collection("users").doc(uid));
    deletions.push(db.collection("users").doc(uid).collection("private").doc("security"));
    deletions.push(db.collection("wallets").doc(uid));

    for (const col of PER_USER_COLLECTIONS) {
      const snap = await db.collection(col).where("uid", "==", uid).get();
      snap.forEach((d) => deletions.push(d.ref));
      if (snap.size > 0) console.log(`  ${col}: ${snap.size} doc(s) for ${uid}`);
    }
  }

  // A transaction only gets deleted if every party on it is in the target
  // set — otherwise deleting it would erase it from a kept account's history.
  const uidList = [...uids];
  const txDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const field of ["fromUid", "toUid"] as const) {
    const snap = await db.collection("transactions").where(field, "in", uidList.slice(0, 30)).get();
    snap.forEach((d) => txDocs.set(d.id, d));
  }

  let containedTxCount = 0;
  for (const doc of txDocs.values()) {
    const tx = doc.data();
    const parties = [tx.fromUid, tx.toUid].filter((p): p is string => !!p);
    const allContained = parties.every((p) => uids.has(p));
    if (!allContained) {
      const outsider = parties.find((p) => !uids.has(p));
      console.log(`  ⚠ skipping transaction ${doc.id} (${tx.referenceNumber}) — also involves ${outsider}, not in your list`);
      continue;
    }
    containedTxCount++;
    deletions.push(doc.ref);
    const ledgerSnap = await db.collection("ledgerEntries").where("transactionId", "==", doc.id).get();
    ledgerSnap.forEach((d) => deletions.push(d.ref));
    const notifSnap = await db.collection("notifications").where("data.transactionId", "==", doc.id).get();
    notifSnap.forEach((d) => deletions.push(d.ref));
  }
  if (containedTxCount > 0) console.log(`  transactions: ${containedTxCount} fully-contained transaction(s), plus their ledger entries/notifications`);

  console.log("");
  console.log(`Total Firestore documents to delete: ${deletions.length}`);
  console.log(`Auth accounts to delete: ${uidList.join(", ")}`);
  console.log("(auditLogs are never touched)");

  if (!apply) {
    console.log("\nDry run complete — nothing was deleted. Re-run with --delete to apply.");
    return;
  }

  console.log("\nDeleting…");
  const BATCH_SIZE = 400;
  for (let i = 0; i < deletions.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const ref of deletions.slice(i, i + BATCH_SIZE)) batch.delete(ref);
    await batch.commit();
  }
  for (const uid of uids) {
    await auth.deleteUser(uid).catch((err) => console.error(`  couldn't delete Auth user ${uid}:`, err.message));
  }
  console.log(`Done — deleted ${deletions.length} document(s) and ${uidList.length} Auth account(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
