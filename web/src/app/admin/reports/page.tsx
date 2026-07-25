const REPORTS = [
  { href: "/api/admin/reports/transactions", title: "Transactions", body: "All transactions, most recent 5,000." },
  { href: "/api/admin/reports/users", title: "User registrations", body: "All registered users and their status." },
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Reports</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <a
            key={r.href}
            href={r.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-brand-500/40"
          >
            <h2 className="font-display text-base font-semibold text-white">{r.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{r.body}</p>
            <p className="mt-3 text-xs font-medium text-brand-400">Download CSV →</p>
          </a>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Monthly transaction summaries and failed-login reports need a scheduled aggregation job — not yet built.
      </p>
    </div>
  );
}
