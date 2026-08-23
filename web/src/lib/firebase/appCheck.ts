"use client";

import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import type { FirebaseApp } from "firebase/app";

// Module-scope singleton: hot reloads and repeated imports must not re-init.
let appCheckInstance: AppCheck | null = null;

/**
 * Initializes Firebase App Check for the browser client.
 *
 * Every callable in functions/ runs with enforceAppCheck: true, so a request
 * without a valid App Check token is rejected before the function body
 * executes. This must run before the first callable or Firestore request,
 * which is why client.ts calls it at module scope rather than in a React
 * effect (child effects would fire first on mount).
 *
 * Local dev: set NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN to a debug token
 * registered in the Firebase console (App Check > Apps > Manage debug
 * tokens), or to "true" to have the SDK print a fresh token to the console.
 */
export function initAppCheck(app: FirebaseApp): AppCheck | null {
  if (typeof window === "undefined") return null;
  if (appCheckInstance) return appCheckInstance;

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) {
    console.warn(
      "[appcheck] NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY is not set — App Check is disabled. " +
        "Callable functions enforce App Check and will reject requests until a site key is configured."
    );
    return null;
  }

  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean })
      .FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  const provider =
    process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_PROVIDER === "enterprise"
      ? new ReCaptchaEnterpriseProvider(siteKey)
      : new ReCaptchaV3Provider(siteKey);

  appCheckInstance = initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
  return appCheckInstance;
}
