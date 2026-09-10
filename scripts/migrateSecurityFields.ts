/**
 * scripts/migrateSecurityFields.ts
 *
 * One-time migration: move per-user secrets out of the client-readable
 * `users/{uid}` document into `users/{uid}/private/security`, which
 * firestore.rules denies to every client.
 *
 * Fields moved: pinHash, pinFailedAttempts, pinLockedUntil,
 * twoFactorSecret, pending2FASecret.
 *
 * Idempotent — a second run finds nothing left to move. Safe to run while
 * the app is live: it copies first, then deletes the originals.
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *   npx tsx scripts/migrateSecurityFields.ts            # apply
 *   npx tsx scripts/migrateSecurityFields.ts --dry-run  # report only
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const SECRET_FIELDS = [
  "pinHash",
  "pinFailedAttempts",
  "pinLockedUntil",
  "twoFactorSecret",
  "pending2FASecret",
] as const;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const users = await db.collection("users").get();
  console.log(`Scanning ${users.size} user document(s)${dryRun ? " (dry run)" : ""}…`);

  let moved = 0;
  for (const userDoc of users.docs) {
    const data = userDoc.data();
    const present = SECRET_FIELDS.filter((f) => f in data);
    if (present.length === 0) continue;

    const payload: Record<string, unknown> = {};
    for (const f of present) payload[f] = data[f];

    console.log(`  ${userDoc.id}: moving [${present.join(", ")}]`);
    if (dryRun) continue;

    await userDoc.ref
      .collection("private")
      .doc("security")
      .set(payload, { merge: true });

    const clears: Record<string, unknown> = {};
    for (const f of present) clears[f] = FieldValue.delete();
    await userDoc.ref.update(clears);
    moved++;
  }

  console.log(dryRun ? "Dry run complete." : `Done — migrated ${moved} account(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
