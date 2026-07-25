import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/getServerUser";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb.collection("transactions").orderBy("createdAt", "desc").limit(5000).get();

  const header = "reference,type,status,fromUid,toUid,amount,currency,createdAt\n";
  const rows = snap.docs
    .map((d) => {
      const t = d.data();
      const amountDisplay = (t.amount / 100).toFixed(2);
      return [
        t.referenceNumber,
        t.type,
        t.status,
        t.fromUid ?? "",
        t.toUid ?? "",
        amountDisplay,
        t.currency,
        t.createdAt.toDate().toISOString(),
      ].join(",");
    })
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
