import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/getServerUser";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb.collection("users").orderBy("createdAt", "desc").limit(10000).get();

  const header = "uid,displayName,email,phone,status,role,createdAt\n";
  const rows = snap.docs
    .map((d) => {
      const u = d.data();
      return [d.id, u.displayName, u.email ?? "", u.phone ?? "", u.status, u.role, u.createdAt.toDate().toISOString()].join(",");
    })
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
