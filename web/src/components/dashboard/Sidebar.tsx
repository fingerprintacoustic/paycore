"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Send, QrCode, Landmark, User, Settings } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/send", label: "Send money", icon: Send },
  { href: "/dashboard/receive", label: "Receive", icon: QrCode },
  // Points at /dashboard/history — the actual page that exists (built in
  // the transfer-onboarding PR) — rather than /dashboard/wallet, which
  // was linked here from the original build but never actually built.
  { href: "/dashboard/history", label: "Wallet", icon: Landmark },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-60 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white/60 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 md:flex">
      <div className="mb-6 px-2 font-display text-xl font-bold text-slate-900 dark:text-white">PayCore</div>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
