/**
 * scripts/resetAllUsers.ts
 *
 * Full reset: deletes every user, wallet, transaction, and related
 * record in the project, plus every Firebase Auth account — for wiping
 * all test activity clean before a real first user (the client) touches
 * the app.
 *
 * This is broader and more destructive than deleteTestAccount.ts, which
 * only targets specific accounts you name. This one wipes everyone,
 * with no exceptions — including whatever account you're using as an
 * admin right now. After running it there is no admin account left:
 * register a fresh one in the app, then run grantAdminRole.ts against
 * it to get back into /admin.
 *
 * NOT touched:
 *   - settings/global — your configured transfer limits & fee tiers.
 *     Wiping users shouldn't make you redo that setup.
 *   - announcements — admin-authored content, not user/test data.
 *   - auditLogs — intentionally immutable, and never shown in the app,
 *     so there's nothing to "clean up" there.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npx tsx scripts/resetAllUsers.ts                    # dry run — reports only
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npx tsx scripts/resetAllUsers.ts --wipe-everything   # actually deletes
 *
 * Run without --wipe-everything first, read the counts, and only re-run
 * with the flag once you're sure.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();
const auth = getAuth();

const COLLECTIONS = [
  "users",
  "wallets",
  "transactions",
  "ledgerEntries",
  "notifications",
  "depositRequests",
  "withdrawalRequests",
  "stepUpTokens",
] as const;

async function main() {
  const apply = process.argv.includes("--wipe-everything");
  console.log(apply ? "WIPING EVERYTHING — this cannot be undone" : "DRY RUN — nothing will be deleted");
  console.log("(settings, announcements, and auditLogs are left untouched)\n");

  const deletions: FirebaseFirestore.DocumentReference[] = [];

  for (const col of COLLECTIONS) {
    const snap = await db.collection(col).get();
    snap.forEach((d) => deletions.push(d.ref));
    console.log(`  ${col}: ${snap.size} doc(s)`);
  }

  // users/{uid}/private/security lives in a subcollection, wherever it is.
  const privateSnap = await db.collectionGroup("private").get();
  privateSnap.forEach((d) => deletions.push(d.ref));
  console.log(`  private (subcollection): ${privateSnap.size} doc(s)`);

  const authUids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) authUids.push(u.uid);
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`\nTotal Firestore documents to delete: ${deletions.length}`);
  console.log(`Firebase Auth accounts to delete: ${authUids.length}`);

  if (!apply) {
    console.log("\nDry run complete — nothing was deleted. Re-run with --wipe-everything to apply.");
    return;
  }

  console.log("\nDeleting Firestore documents…");
  const BATCH_SIZE = 400;
  for (let i = 0; i < deletions.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const ref of deletions.slice(i, i + BATCH_SIZE)) batch.delete(ref);
    await batch.commit();
  }

  console.log("Deleting Auth accounts…");
  for (let i = 0; i < authUids.length; i += 1000) {
    const chunk = authUids.slice(i, i + 1000);
    const result = await auth.deleteUsers(chunk);
    if (result.failureCount > 0) {
      console.error(`  ${result.failureCount} account(s) failed to delete:`, result.errors);
    }
  }

  console.log(`\nDone — deleted ${deletions.length} document(s) and ${authUids.length} Auth account(s).`);
  console.log("Register a fresh account in the app, then run grantAdminRole.ts against it to regain admin access.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
