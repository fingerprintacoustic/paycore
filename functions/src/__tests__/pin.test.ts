import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import "./setup";

initializeApp({ projectId: "demo-paycore" });
const db = getFirestore();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setPin, verifyPin } = require("../pin");

function callableRequest(data: Record<string, unknown>, uid: string) {
  return { data, auth: { uid, token: {} } } as never;
}

beforeEach(async () => {
  const snap = await db.collection("users").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  await db.collection("users").doc("alice").set({ uid: "alice", role: "user", status: "active" });
});

describe("setPin", () => {
  it("rejects an obviously weak PIN", async () => {
    await expect(setPin.run(callableRequest({ pin: "1234" }, "alice"))).rejects.toBeInstanceOf(HttpsError);
  });

  it("rejects a non-numeric or wrong-length PIN", async () => {
    await expect(setPin.run(callableRequest({ pin: "12" }, "alice"))).rejects.toBeInstanceOf(HttpsError);
    await expect(setPin.run(callableRequest({ pin: "abcdef" }, "alice"))).rejects.toBeInstanceOf(HttpsError);
  });

  it("stores a hash, never the plaintext PIN", async () => {
    await setPin.run(callableRequest({ pin: "739284" }, "alice"));
    const user = (await db.collection("users").doc("alice").get()).data()!;
    expect(user.pinHash).toBeDefined();
    expect(user.pinHash).not.toBe("739284");
  });
});

describe("verifyPin", () => {
  beforeEach(async () => {
    await setPin.run(callableRequest({ pin: "739284" }, "alice"));
  });

  it("succeeds with the correct PIN", async () => {
    const result = await verifyPin.run(callableRequest({ pin: "739284" }, "alice"));
    expect(result.status).toBe("ok");
  });

  it("rejects an incorrect PIN", async () => {
    await expect(verifyPin.run(callableRequest({ pin: "000000" }, "alice"))).rejects.toBeInstanceOf(HttpsError);
  });

  it("locks out after 5 failed attempts", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(verifyPin.run(callableRequest({ pin: "000000" }, "alice"))).rejects.toBeInstanceOf(HttpsError);
    }
    // A 6th attempt, even with the CORRECT pin, should now be blocked by
    // the lockout rather than reach the comparison at all.
    await expect(verifyPin.run(callableRequest({ pin: "739284" }, "alice"))).rejects.toMatchObject({
      code: "resource-exhausted",
    });
  });
});
