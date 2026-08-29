/**
 * scripts/setAppCheckSecret.ts
 *
 * Registers the plain reCAPTCHA v3 secret key for App Check directly via
 * Firebase's REST API, bypassing the Console's "reCAPTCHA secret key"
 * field — which has been consistently broken (won't accept input) across
 * multiple browsers and sessions.
 *
 * Verified against Firebase's official REST reference before building
 * this: https://firebase.google.com/docs/reference/appcheck/rest/v1/projects.apps.recaptchaV3Config/patch
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *   $env:RECAPTCHA_V3_SECRET="<your reCAPTCHA v3 secret key from google.com/recaptcha/admin>"
 *   npx tsx scripts/setAppCheckSecret.ts
 *
 * The secret is read from an env var rather than a CLI argument so it
 * never lands in shell history in plain text.
 */
import { GoogleAuth } from "google-auth-library";

// From an earlier browser console log — App IDs are formatted
// "1:{project_number}:web:{hash}", so the project number is embedded here.
const PROJECT_NUMBER = "1067214939456";
const APP_ID = "1:1067214939456:web:8c35bf2b57cb936a0e86a5";

async function main() {
  const secret = process.env.RECAPTCHA_V3_SECRET;
  if (!secret) {
    console.error('Set $env:RECAPTCHA_V3_SECRET="<your secret key>" first, then rerun.');
    process.exit(1);
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/firebase"],
  });
  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const accessToken = accessTokenResponse.token;
  if (!accessToken) {
    console.error("Failed to obtain an access token — check GOOGLE_APPLICATION_CREDENTIALS is set correctly.");
    process.exit(1);
  }

  const configUrl = `https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_NUMBER}/apps/${APP_ID}/recaptchaV3Config?updateMask=siteSecret`;

  console.log("Setting the reCAPTCHA v3 secret via REST API...");
  const patchRes = await fetch(configUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ siteSecret: secret }),
  });

  const patchBody = await patchRes.json();
  console.log(`PATCH status: ${patchRes.status}`);
  console.log(patchBody);

  if (!patchRes.ok) {
    console.error(
      "\nPATCH failed. If this is a 403, the service account may be missing permission — " +
        "see the fallback note in the chat. If it's a 400, double-check the secret is a plain " +
        "reCAPTCHA v3 secret (not Enterprise) copied correctly."
    );
    process.exit(1);
  }

  // Verify — the response never echoes the secret itself, only confirms
  // whether one is now set.
  const verifyUrl = `https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_NUMBER}/apps/${APP_ID}/recaptchaV3Config`;
  const getRes = await fetch(verifyUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const getBody = await getRes.json();
  console.log(`\nVerification GET status: ${getRes.status}`);
  console.log(getBody);

  if (getBody.siteSecretSet) {
    console.log("\n✅ Success — siteSecretSet is true. App Check reCAPTCHA v3 is now configured.");
  } else {
    console.log("\n⚠️ PATCH succeeded but siteSecretSet is not true — something's off, worth double-checking manually.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
