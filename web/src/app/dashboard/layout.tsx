import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/getServerUser";
import { adminDb } from "@/lib/firebase/admin";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // This is the real check (see comment in middleware.ts) — cryptographic
  // verification against Firebase, with revocation checking, run on every
  // request to a protected route.
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Freeze status lives in Firestore, not the auth token's custom claims —
  // claims only refresh on sign-in/force-refresh, so an admin freeze
  // wouldn't take effect until then if we checked the token instead. A
  // fresh Firestore read here means a freeze is enforced on the very next
  // page load.
  const userDoc = await adminDb.collection("users").doc(user.uid).get();
  if (userDoc.data()?.status === "frozen") redirect("/account-frozen");

  return (
    <div className="flex min-h-screen bg-surface-light dark:bg-surface-dark">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
