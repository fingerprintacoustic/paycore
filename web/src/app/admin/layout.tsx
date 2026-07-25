import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/getServerUser";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-surface-dark">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
