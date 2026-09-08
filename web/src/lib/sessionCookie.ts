/**
 * The session cookie name.
 *
 * MUST be `__session`. Firebase Hosting strips every cookie except one named
 * exactly `__session` before forwarding a request to the SSR backend, so any
 * other name is invisible to middleware and server components in production
 * (the browser stores it fine — it just never arrives). See
 * https://firebase.google.com/docs/hosting/manage-cache#using_cookies
 *
 * Plain constant with no imports so the Edge-runtime middleware can use it.
 */
export const SESSION_COOKIE = "__session";
