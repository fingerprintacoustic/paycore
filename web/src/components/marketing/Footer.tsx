import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 py-10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 dark:text-slate-400 sm:flex-row">
        <p>© {new Date().getFullYear()} PayCore. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/legal/terms" className="hover:text-brand-600 dark:hover:text-brand-300">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-brand-600 dark:hover:text-brand-300">Privacy</Link>
          <a href="#contact" className="hover:text-brand-600 dark:hover:text-brand-300">Contact</a>
        </div>
      </div>
    </footer>
  );
}
