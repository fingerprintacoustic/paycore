import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

// Firebase ID tokens expire after 1 hour and aren't meant to live in a
// cookie. We exchange the ID token for a long-lived session cookie that's
// httpOnly + secure + sameSite, so it's invisible to client JS (XSS-safe)
// and not sent cross-site (CSRF-resistant). Server components / middleware
// verify this cookie on every request via adminAuth.verifySessionCookie.

const SESSION_EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    // Reject tokens older than 5 minutes to limit session-fixation replay.
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const authTimeMs = decoded.auth_time * 1000;
    if (Date.now() - authTimeMs > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Recent sign-in required" }, { status: 401 });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    const res = NextResponse.json({ status: "ok" });
    res.cookies.set("session", sessionCookie, {
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ status: "ok" });
  res.cookies.set("session", "", { maxAge: 0, path: "/" });
  return res;
}
