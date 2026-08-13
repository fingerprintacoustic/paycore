import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. This module must only run server-side."
    );
  }
  return JSON.parse(raw);
}

const adminApp: App = getApps().length
  ? getApps()[0]!
  : initializeApp({ credential: cert(loadServiceAccount()) });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
