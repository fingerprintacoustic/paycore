/**
 * sample-data/seed.ts
 *
 * Seeds the Firestore EMULATOR with a small, realistic dataset — sample
 * users, wallets, a few completed transactions, a pending withdrawal, and
 * an announcement. Never point this at a real project: it writes fake
 * balances directly, bypassing every safeguard in transferFunds.
 *
 * Note: this only creates Firestore documents, not matching Firebase Auth
 * accounts — you can't sign in as these users. It's meant for Browse the
 * admin portal and dashboard UI against realistic-looking data, not for
 * testing the auth flow itself. Register real accounts through the app
 * for that.
 *
 * Usage (with emulators already running):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx ts-node sample-data/seed.ts
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("Refusing to run: FIRESTORE_EMULATOR_HOST is not set. This script only targets the emulator.");
  process.exit(1);
}

initializeApp({ projectId: "demo-paycore" });
const db = getFirestore();

const now = Timestamp.now();

const users = [
  { uid: "demo-alice", displayName: "Alice Okafor", email: "alice@example.com", phone: "+15551230001", role: "user", balance: 48000 },
  { uid: "demo-bob", displayName: "Bob Marere", email: "bob@example.com", phone: "+15551230002", role: "user", balance: 12500 },
  { uid: "demo-kimoyo", displayName: "Kimoyo Traders", email: "kimoyo@example.com", phone: "+15551230003", role: "user", balance: 305000 },
  { uid: "demo-admin", displayName: "Priya Admin", email: "admin@example.com", phone: "+15551230004", role: "admin", balance: 0 },
];

async function seed() {
  for (const u of users) {
    await db.collection("users").doc(u.uid).set({
      uid: u.uid,
      email: u.email,
      phone: u.phone,
      displayName: u.displayName,
      photoURL: null,
      address: null,
      role: u.role,
      status: "active",
      pinHash: null,
      pinSetAt: null,
      twoFactorEnabled: false,
      emailVerified: true,
      notificationPrefs: { email: true, push: true, sms: false },
      searchTokens: [u.email.toLowerCase(), u.phone.replace(/\D/g, "")],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });
    await db.collection("wallets").doc(u.uid).set({
      uid: u.uid,
      balance: u.balance,
      currency: "USD",
      status: "active",
      version: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  const tx1 = db.collection("transactions").doc();
  await tx1.set({
    id: tx1.id,
    type: "transfer",
    status: "completed",
    fromUid: "demo-alice",
    toUid: "demo-bob",
    amount: 4500,
    currency: "USD",
    note: "Lunch split",
    referenceNumber: "PC-2026-000101",
    createdAt: now,
    completedAt: now,
    failureReason: null,
    initiatedBy: "demo-alice",
  });

  const tx2 = db.collection("transactions").doc();
  await tx2.set({
    id: tx2.id,
    type: "transfer",
    status: "completed",
    fromUid: "demo-kimoyo",
    toUid: "demo-alice",
    amount: 128000,
    currency: "USD",
    note: "Invoice #442",
    referenceNumber: "PC-2026-000102",
    createdAt: now,
    completedAt: now,
    failureReason: null,
    initiatedBy: "demo-kimoyo",
  });

  const withdrawal = db.collection("withdrawalRequests").doc();
  await withdrawal.set({
    id: withdrawal.id,
    uid: "demo-bob",
    amount: 5000,
    status: "pending",
    requestedAt: now,
    reviewedBy: null,
    reviewedAt: null,
    payoutDetails: { bankName: "Demo Bank", accountNumber: "****1234" },
  });

  const announcement = db.collection("announcements").doc();
  await announcement.set({
    title: "Welcome to PayCore",
    body: "This is a sample announcement visible to every signed-in user.",
    audience: "all",
    active: true,
    createdBy: "demo-admin",
    createdAt: now,
    expiresAt: null,
  });

  await db.collection("settings").doc("global").set({
    maintenanceMode: false,
    minTransferAmount: 100,
    maxTransferAmount: 50_000_00,
    dailyTransferLimit: 100_000_00,
    withdrawalRequiresApproval: true,
  });

  console.log("Seed complete: 4 users/wallets, 2 transactions, 1 pending withdrawal, 1 announcement, global settings.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
