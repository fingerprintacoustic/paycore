"use client";

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
//
// "use client" here (unlike src/app/dashboard/layout.tsx, which must stay
// a server component for getServerUser()/adminDb): DEMO_NAV_ITEMS carries
// lucide-react icon components in its `icon` field, and passing those as
// props from a server component into the client <Sidebar> forces Next.js
// to serialize them for the server->client boundary. Icon components are
// forwardRef objects, not serializable data, so the build failed with
// "Export encountered an error on /demo/page" while trying to stringify
// one. Making this layout a client component removes that boundary —
// page.tsx (and the other /demo/* pages) stay server components as
// normal; Next renders them and passes the result in via `children`.
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
