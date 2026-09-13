import { redirect } from "next/navigation";
import { requireAdmin, loginUrlWithNext } from "@/lib/auth/getServerUser";
import { AuthGate } from "@/components/auth/AuthGate";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect(await loginUrlWithNext("/admin"));

  return (
    // Deliberately always-dark, not dark:-conditional: every admin page and
    // component (text-white, bg-white/5, border-white/10, etc.) is styled
    // assuming a dark surface with no light-mode variant. Toggling this
    // wrapper with the site theme left it going light while the content
    // stayed styled for dark — near-invisible white-on-white text and cards.
    <div className="flex min-h-screen bg-surface-dark">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <AuthGate>{children}</AuthGate>
      </main>
    </div>
  );
}
