import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, message } = body;

  if (
    typeof name !== "string" || name.length < 1 || name.length > 200 ||
    typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof message !== "string" || message.length < 1 || message.length > 5000
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Unauthenticated visitors can't write to supportTickets directly (see
  // firestore.rules) — this route runs with Admin SDK privileges and does
  // the validation client-side rules would otherwise enforce, so the
  // trust boundary stays server-side either way.
  await adminDb.collection("contactMessages").add({
    name,
    email,
    message,
    createdAt: Timestamp.now(),
    handled: false,
  });

  return NextResponse.json({ status: "ok" });
}
