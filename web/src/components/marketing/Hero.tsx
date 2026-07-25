import Link from "next/link";
import { ReceiptStack } from "./ReceiptStack";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
      <div>
        <p className="mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          Built for teams, not just individuals
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white md:text-5xl">
          Money that moves as fast as your community does.
        </h1>
        <p className="mt-5 max-w-md text-lg text-slate-600 dark:text-slate-300">
          PayCore is a digital wallet built for small businesses, community
          groups, and everyday people — instant transfers, real receipts,
          and a ledger you can actually trust.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
          >
            Open your wallet
          </Link>
          <a
            href="#features"
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            See how it works
          </a>
        </div>
        <p className="mt-6 text-xs text-slate-400">No card required. Free to send within PayCore.</p>
      </div>
      <div className="flex justify-center md:justify-end">
        <ReceiptStack />
      </div>
    </section>
  );
}
