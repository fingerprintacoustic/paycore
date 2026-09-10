import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const MAX_RESULTS = 5;

export interface LookupRecipientResult {
  uid: string;
  displayName: string;
  maskedEmail: string | null;
  maskedPhone: string | null;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

/**
 * Directory lookup for the send-money flow. Client-side queries on
 * /users are denied by security rules (isSelf || isSupport) — and should
 * stay that way — so this callable does the lookup with the Admin SDK and
 * returns only the minimal, masked fields a sender needs to confirm they
 * picked the right person.
 */
export const lookupRecipient = functions.onCall<{ query: string }>(
  { enforceAppCheck: true },
  async (request): Promise<{ results: LookupRecipientResult[] }> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const raw = (request.data.query ?? "").trim().toLowerCase();
    if (raw.length < 3) {
      throw new HttpsError(
        "invalid-argument",
        "Enter at least 3 characters to search."
      );
    }

    // searchTokens stores phone numbers as digit-only suffixes, so a query
    // typed with the usual "+", spaces or dashes ("+1 555-123-4567") would
    // never match. If the query is phone-shaped, strip it to digits;
    // otherwise (an email) leave it alone.
    const phoneDigits = raw.replace(/[\s+().-]/g, "");
    const needle = /^\d{3,}$/.test(phoneDigits) ? phoneDigits : raw;

    const snap = await db
      .collection("users")
      .where("searchTokens", "array-contains", needle)
      .limit(MAX_RESULTS + 1)
      .get();

    const results: LookupRecipientResult[] = [];
    for (const doc of snap.docs) {
      if (doc.id === uid) continue; // never return the caller
      const data = doc.data();
      if (data.status && data.status !== "active") continue;
      results.push({
        uid: doc.id,
        displayName: data.displayName || "PayCore user",
        maskedEmail: data.email ? maskEmail(data.email) : null,
        maskedPhone: data.phone ? maskPhone(data.phone) : null,
      });
      if (results.length >= MAX_RESULTS) break;
    }

    return { results };
  }
);
