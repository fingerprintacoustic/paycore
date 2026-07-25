import { Zap, QrCode, Users, Receipt, Bell, Shield } from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "Instant transfers", body: "Money lands in seconds, not days — balances update the moment a transfer completes." },
  { icon: QrCode, title: "QR pay & request", body: "Share a code or link to get paid, with an optional amount built right in." },
  { icon: Receipt, title: "Real receipts", body: "Every transfer gets a reference number and a receipt you can point back to." },
  { icon: Users, title: "Built for groups", body: "Run a business, a congregation, or a community fund from one shared wallet." },
  { icon: Bell, title: "Stay in the loop", body: "Get notified the moment money moves — in-app, and by email if you want it." },
  { icon: Shield, title: "Protected by design", body: "PIN confirmation and two-factor login stand between your money and anyone else." },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 max-w-xl">
        <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          Everything a wallet should do. Nothing it shouldn't.
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          No hidden complexity — just the pieces you actually use, done well.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm transition hover:border-brand-300 hover:shadow-md dark:border-white/10 dark:bg-white/5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <Icon size={20} />
            </span>
            <h3 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
