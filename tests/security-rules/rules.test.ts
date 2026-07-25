import * as fs from "fs";
import * as path from "path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-paycore",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed fixture data with admin privileges (bypasses rules entirely) —
  // rules only govern client reads/writes, not this setup step.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection("wallets").doc("alice").set({ uid: "alice", balance: 5000, currency: "USD", status: "active", version: 0 });
    await db.collection("wallets").doc("bob").set({ uid: "bob", balance: 0, currency: "USD", status: "active", version: 0 });
    await db.collection("users").doc("alice").set({ uid: "alice", role: "user", status: "active" });
    await db.collection("transactions").doc("tx1").set({ id: "tx1", fromUid: "alice", toUid: "bob", amount: 500, status: "completed" });
    await db.collection("notifications").doc("n1").set({ uid: "alice", type: "transfer_sent", title: "x", body: "y", read: false });
  });
});

describe("wallets", () => {
  it("denies a user writing to their own wallet balance", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(alice, "wallets/alice"), { balance: 999999 }));
  });

  it("allows a user to read their own wallet", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "wallets/alice")));
  });

  it("denies a user reading someone else's wallet", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(alice, "wallets/bob")));
  });
});

describe("transactions", () => {
  it("denies a client creating a transaction directly", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(alice, "transactions/fake"), { fromUid: "alice", toUid: "bob", amount: 100000, status: "completed" })
    );
  });

  it("allows a participant to read their own transaction", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "transactions/tx1")));
  });

  it("denies a non-participant reading someone else's transaction", async () => {
    const eve = testEnv.authenticatedContext("eve").firestore();
    await assertFails(getDoc(doc(eve, "transactions/tx1")));
  });
});

describe("users", () => {
  it("denies a user granting themselves the admin role", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(alice, "users/alice"), { role: "admin" }));
  });

  it("denies a user unfreezing their own status field", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(alice, "users/alice"), { status: "active" }));
  });

  it("allows a user updating a non-sensitive profile field", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(updateDoc(doc(alice, "users/alice"), { displayName: "Alice K." }));
  });
});

describe("notifications", () => {
  it("allows a user to mark their own notification read", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(updateDoc(doc(alice, "notifications/n1"), { read: true }));
  });

  it("denies a user rewriting the notification body", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(alice, "notifications/n1"), { body: "tampered" }));
  });
});

describe("default deny", () => {
  it("denies access to an undeclared collection", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(alice, "somethingElse/doc1")));
  });
});
