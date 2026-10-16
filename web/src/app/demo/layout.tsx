import type { ReactNode } from "react";
import { LayoutDashboard, Send, QrCode, HandCoins } from "lucide-react";
import { Sidebar, type SidebarNavItem } from "@/components/dashboard/Sidebar";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoTopBar } from "@/components/demo/DemoTopBar";

// Deliberately NOT under /dashboard, /admin, /wallet, or /settings — the
// prefixes src/middleware.ts gates on — and this layout does not call
// getServerUser() the way src/app/dashboard/layout.tsx does. No session,
// no cookie, no Firebase Auth check at all. See the comment at the top of
// src/lib/demo/store.ts for why: a session-cookie-based "is this a demo
// visit" flag would hit the exact same cookie-stripping landmine that
// caused the September App Check bug, just for a different cookie. A
// route with no auth gate sidesteps that risk entirely, and anyone with
// the link can open it — which is the point for a sales demo.
const DEMO_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/demo", label: "Overview", icon: LayoutDashboard },
  { href: "/demo/send", label: "Send money", icon: Send },
  { href: "/demo/receive", label: "Receive", icon: QrCode },
  { href: "/demo/request", label: "Add funds", icon: HandCoins },
];

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-light dark:bg-surface-dark">
      <Sidebar items={DEMO_NAV_ITEMS} title="PayCore" />
      <div className="flex min-h-screen flex-1 flex-col">
        <DemoBanner />
        <DemoTopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
