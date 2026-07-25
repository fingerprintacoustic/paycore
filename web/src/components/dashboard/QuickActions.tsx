import Link from "next/link";
import { Send, QrCode, HandCoins } from "lucide-react";

const ACTIONS = [
  { href: "/dashboard/send", label: "Send", icon: Send },
  { href: "/dashboard/receive", label: "Receive", icon: QrCode },
  { href: "/dashboard/request", label: "Request", icon: HandCoins },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </div>
  );
}
