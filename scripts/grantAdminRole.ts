/**
 * scripts/grantAdminRole.ts
 *
 * There is deliberately no in-app way to promote a user to admin — that
 * would mean the app could create its own admins, defeating the point of
 * having a separate trust tier. Run this manually, once, to bootstrap
 * your first admin account (and again for any future admin/support hire).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npx tsx scripts/grantAdminRole.ts <uid-or-email> <admin|support>
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp();

async function main() {
  const [, , identifier, role] = process.argv;
  if (!identifier || (role !== "admin" && role !== "support")) {
    console.error("Usage: tsx scripts/grantAdminRole.ts <uid-or-email> <admin|support>");
    process.exit(1);
  }

  const auth = getAuth();
  const db = getFirestore();

  // Accept an email or a raw UID.
  const uid = identifier.includes("@")
    ? (await auth.getUserByEmail(identifier)).uid
    : identifier;

  // Keep both representations of role in sync: the custom claim (which
  // Firestore security rules read) and the Firestore field (which the
  // app's own server-side checks read).
  await auth.setCustomUserClaims(uid, { role });
  await db.collection("users").doc(uid).update({ role, updatedAt: Timestamp.now() });

  // Force the affected user to re-authenticate so the new claim takes
  // effect immediately rather than waiting for natural token refresh.
  await auth.revokeRefreshTokens(uid);

  console.log(`Granted role "${role}" to ${uid}. They'll need to sign in again.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
