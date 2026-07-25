import { Lock, ShieldCheck, KeyRound, FileSearch } from "lucide-react";

const POINTS = [
  { icon: Lock, title: "Nothing trusts the client", body: "Every balance change happens on our servers, inside an atomic transaction — never in your browser." },
  { icon: KeyRound, title: "PIN + two-factor", body: "Sending money requires a PIN, on top of your password and optional authenticator app." },
  { icon: FileSearch, title: "Full audit trail", body: "Every transfer, login, and admin action is logged — nothing happens invisibly." },
  { icon: ShieldCheck, title: "No double-spending", body: "Idempotent, transactional transfers mean a retry or a dropped connection can never move money twice." },
];

export function Security() {
  return (
    <section id="security" className="bg-slate-950 py-20 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-xl">
          <h2 className="font-display text-3xl font-bold">Security isn't a feature here. It's the foundation.</h2>
          <p className="mt-3 text-slate-400">
            We built the ledger first, and the interface second — the way a
            wallet should be built.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
                <Icon size={20} />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
