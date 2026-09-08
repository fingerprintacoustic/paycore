import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/sessionCookie";

// Middleware runs on the Edge runtime, which can't use firebase-admin (it
// needs Node APIs). So this only checks whether a session cookie is
// *present* — a cheap first gate to bounce obviously-signed-out visitors
// before they load the dashboard shell. The real check —
// adminAuth.verifySessionCookie(), confirming the cookie is valid and not
// revoked — happens in a Node-runtime layout/server component for every
// protected route. Never treat "cookie exists" as "user is authorized."
//
// This file must live at src/middleware.ts (next to src/app), not the
// project root — Next only picks up root-level middleware when there is no
// src/ directory. A misplaced copy is silently ignored.
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/wallet", "/settings"];

function loginRedirect(req: NextRequest): NextResponse {
  // Note: under `next dev`, NextResponse.redirect() rewrites the host of the
  // returned Location to match req.nextUrl (always "localhost"), regardless of
  // what we pass here — so a visitor on 127.0.0.1 is bounced to localhost
  // locally. This does not happen in a real deployment, where req.nextUrl
  // carries the actual request host.
  const url = req.nextUrl.clone();
  const next = url.pathname + url.search;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (!req.cookies.has(SESSION_COOKIE)) return loginRedirect(req);

  // Cookie is present but only the Node-runtime check can say if it's valid.
  // Forward the path so that check can build its own ?next= if it rejects
  // the session (expired, revoked, account frozen).
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/wallet/:path*", "/settings/:path*"],
};
