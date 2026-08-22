import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import "./setup";

initializeApp({ projectId: "demo-paycore" });
const db = getFirestore();

// The callable reads the Auth record for the phone number, which the
// emulator-backed Admin SDK cannot fake for arbitrary UIDs. So we stub
// getAuth().getUser at the module boundary the same way transferFunds.test
// stubs request data: by replacing the exported function on the auth
// instance before the module under test captures it.
jest.mock("firebase-admin/auth", () => {
  const actual = jest.requireActual("firebase-admin/auth");
  return {
    ...actual,
    getAuth: () => ({
      getUser: jest.fn(async (uid: string) => ({
        uid,
        email: `${uid}@example.com`,
        phoneNumber: "+14155551234",
      })),
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { markPhoneVerified } = require("../phoneVerification");

function callableRequest(data: Record<string, unknown>, uid: string) {
  return { data, auth: { uid, token: {} } } as never;
}

beforeEach(async () => {
  const snap = await db.collection("users").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
});

describe("markPhoneVerified", () => {
  it("activates a pending_verification user and syncs phone + searchTokens", async () => {
    await db.collection("users").doc("alice").set({
      uid: "alice",
      role: "user",
      status: "pending_verification",
      phone: null,
      searchTokens: [],
    });

    const result = await markPhoneVerified.run(callableRequest({}, "alice"));
    expect(result.status).toBe("activated");

    const user = (await db.collection("users").doc("alice").get()).data()!;
    expect(user.status).toBe("active");
    expect(user.phone).toBe("+14155551234");
    expect(user.searchTokens).toContain("alice@example.com");
    expect(user.searchTokens).toContain("1234"); // phone suffix token
  });

  it("is idempotent for an already-active user with the same phone", async () => {
    await db.collection("users").doc("alice").set({
      uid: "alice",
      role: "user",
      status: "active",
      phone: "+14155551234",
      searchTokens: [],
    });

    const result = await markPhoneVerified.run(callableRequest({}, "alice"));
    expect(result.status).toBe("already_active");
  });

  it("refuses to reactivate a frozen account", async () => {
    await db.collection("users").doc("alice").set({
      uid: "alice",
      role: "user",
      status: "frozen",
      phone: null,
      searchTokens: [],
    });

    await expect(
      markPhoneVerified.run(callableRequest({}, "alice"))
    ).rejects.toMatchObject({ code: "failed-precondition" });

    const user = (await db.collection("users").doc("alice").get()).data()!;
    expect(user.status).toBe("frozen");
  });

  it("rejects unauthenticated calls", async () => {
    await expect(
      markPhoneVerified.run({ data: {}, auth: null } as never)
    ).rejects.toBeInstanceOf(HttpsError);
  });
});
