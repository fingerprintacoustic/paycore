import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * The authoritative auth check. Middleware only confirms a cookie exists;
 * this confirms it's cryptographically valid, unexpired, and not revoked
 * (e.g. after an admin freezes the account or the user changes password).
 * Call this at the top of every protected route's layout/page — never rely
 * on middleware alone.
 */
export async function getServerUser(): Promise<DecodedIdToken | null> {
  // Next.js 15 made cookies() async (it used to return the store directly).
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    // `true` = checkRevoked — hits Firestore-backed revocation list, so a
    // freeze/logout-everywhere action takes effect immediately.
    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<DecodedIdToken | null> {
  const user = await getServerUser();
  if (!user) return null;
  // Firestore's `role` field is the source of truth the rest of the app
  // (and every admin Cloud Function) checks — not the token's custom
  // claim, which only refreshes on sign-in and could be briefly stale
  // right after a promotion/demotion.
  const { adminDb } = await import("@/lib/firebase/admin");
  const snap = await adminDb.collection("users").doc(user.uid).get();
  if (snap.data()?.role !== "admin") return null;
  return user;
}
