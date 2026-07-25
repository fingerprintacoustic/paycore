"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Users, Landmark, ArrowLeftRight, Megaphone, Settings, FileDown } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Landmark },
  { href: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/reports", label: "Reports", icon: FileDown },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="hidden w-60 shrink-0 flex-col gap-1 border-r border-slate-800 bg-slate-950 p-4 md:flex">
      <div className="mb-1 px-2 font-display text-lg font-bold text-white">PayCore</div>
      <div className="mb-5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</div>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-brand-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
      <Link
        href="/dashboard"
        className="mt-auto rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-white"
      >
        ← Back to app
      </Link>
    </nav>
  );
}
