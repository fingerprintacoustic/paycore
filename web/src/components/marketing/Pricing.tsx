import Link from "next/link";
import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Personal",
    price: "Free",
    tagline: "For everyday sending and receiving.",
    features: ["Unlimited internal transfers", "QR pay & request", "Standard transaction history"],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Business",
    price: "$9/mo",
    tagline: "For shops, freelancers, and small teams.",
    features: ["Everything in Personal", "Multiple staff logins", "Exportable reports", "Priority support"],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Community",
    price: "Custom",
    tagline: "For churches, associations, and organizations.",
    features: ["Everything in Business", "Shared community wallet", "Announcements to members", "Dedicated onboarding"],
    cta: "Talk to us",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 max-w-xl">
        <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Simple pricing, no surprises.</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Start free. Upgrade only when you need to.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-2xl p-6 ${
              tier.highlighted
                ? "border-2 border-brand-500 bg-white shadow-xl dark:bg-slate-900"
                : "border border-slate-200 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
            }`}
          >
            {tier.highlighted && (
              <span className="mb-3 inline-block rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{tier.name}</h3>
            <p className="mt-1 font-mono text-3xl font-medium text-slate-900 dark:text-white">{tier.price}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tier.tagline}</p>
            <ul className="mt-5 space-y-2.5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                tier.highlighted
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
