import Link from "next/link";
import { X } from "lucide-react";

export function DemoTopBar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/60 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <p className="text-sm text-slate-500 dark:text-slate-400">Demo wallet</p>
      <Link
        href="/"
        aria-label="Exit demo"
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <X size={14} />
        Exit demo
      </Link>
    </header>
  );
}
