import { NextRequest, NextResponse } from "next/server";

// Middleware runs on the Edge runtime, which can't use firebase-admin (it
// needs Node APIs). So this only checks whether a session cookie is
// *present* — a cheap first gate to bounce obviously-signed-out visitors
// before they load the dashboard shell. The real check —
// adminAuth.verifySessionCookie(), confirming the cookie is valid and not
// revoked — happens in a Node-runtime layout/server component for every
// protected route. Never treat "cookie exists" as "user is authorized."
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/wallet", "/settings"];

export function middleware(req: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has("session");
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/wallet/:path*", "/settings/:path*"],
};
