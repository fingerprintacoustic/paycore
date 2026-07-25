export function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Why we built PayCore</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Most digital wallets are designed for one person tapping a phone
            alone. We built PayCore for the messier, more real version of
            that — small businesses splitting takings, families sending
            support home, community groups collecting dues. The ledger
            underneath is the same either way: precise, atomic, and
            auditable.
          </p>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            We'd rather ship fewer features that we've actually stress-tested
            than a long list that half-works.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { stat: "< 1s", label: "Average transfer time" },
            { stat: "100%", label: "Server-verified balances" },
            { stat: "0", label: "Trust placed in the client" },
            { stat: "24/7", label: "Ledger availability" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="font-mono text-2xl font-semibold text-brand-700 dark:text-brand-300">{s.stat}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
