import Link from "next/link";

interface HelpSection {
  title: string;
  body: React.ReactNode;
}

const SECTIONS: HelpSection[] = [
  {
    title: "Overview",
    body: (
      <p>
        The{" "}
        <Link href="/admin" className="font-medium text-brand-400 hover:underline">
          Overview
        </Link>{" "}
        page is your at-a-glance dashboard: total users, total wallet balance across every account, lifetime fee
        revenue, transactions today, and anything waiting on you — pending deposits and withdrawals.
      </p>
    ),
  },
  {
    title: "Reviewing deposits",
    body: (
      <p>
        When a customer sends money outside the app and reports it (bank transfer, cash, etc.), it shows up under{" "}
        <Link href="/admin/deposits" className="font-medium text-brand-400 hover:underline">
          Deposits
        </Link>{" "}
        with the amount and their note on how they sent it. Approve to credit their wallet, or reject if you can&apos;t
        verify it — either way, they&apos;re notified automatically.
      </p>
    ),
  },
  {
    title: "Reviewing withdrawals",
    body: (
      <p>
        <Link href="/admin/withdrawals" className="font-medium text-brand-400 hover:underline">
          Withdrawals
        </Link>{" "}
        lists payout requests the same way. Note: paying real money out to a bank account is a Phase 3 capability
        (it needs money-transmission licensing) — this review screen is ready for that, but there&apos;s no
        customer-facing way to submit a withdrawal request yet in the current phase.
      </p>
    ),
  },
  {
    title: "Managing users",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Search and open any account from{" "}
          <Link href="/admin/users" className="font-medium text-brand-400 hover:underline">
            Users
          </Link>
          .
        </li>
        <li>From a user&apos;s page you can manually credit or debit their wallet (with an optional note for the record).</li>
        <li>Freeze an account to block it from sending, receiving, or requesting money — reactivate it any time.</li>
      </ul>
    ),
  },
  {
    title: "Transfer fees",
    body: (
      <p>
        Under{" "}
        <Link href="/admin/settings" className="font-medium text-brand-400 hover:underline">
          Settings
        </Link>{" "}
        → Transfer fees, define fee tiers by transfer amount — a flat fee, a percentage, or both across different
        ranges (e.g. a flat fee under $10, a lower percentage as amounts grow). The fee is always added on top of what
        the sender enters, so recipients still receive the full amount. Leave the tier list empty and transfers stay
        free. &ldquo;Use example tiers&rdquo; loads a starting scheme you can edit before saving.
      </p>
    ),
  },
  {
    title: "Transfer limits & maintenance mode",
    body: (
      <p>
        The rest of{" "}
        <Link href="/admin/settings" className="font-medium text-brand-400 hover:underline">
          Settings
        </Link>{" "}
        controls the minimum and maximum size of a single transfer, how much any one user can move per day, whether
        withdrawals need manual approval, and a maintenance-mode switch that pauses all money movement app-wide —
        useful if you ever need to freeze activity while investigating something.
      </p>
    ),
  },
  {
    title: "Announcements",
    body: (
      <p>
        Post a banner message from{" "}
        <Link href="/admin/announcements" className="font-medium text-brand-400 hover:underline">
          Announcements
        </Link>{" "}
        to every user or to verified users only — useful for planned downtime, new features, or policy changes.
      </p>
    ),
  },
  {
    title: "Reports",
    body: (
      <p>
        <Link href="/admin/reports" className="font-medium text-brand-400 hover:underline">
          Reports
        </Link>{" "}
        exports transactions and user registrations as CSV files for bookkeeping or analysis outside the app.
      </p>
    ),
  },
  {
    title: "Managing admin access",
    body: (
      <div className="space-y-2">
        <p>
          There&apos;s deliberately no in-app way to promote or demote an admin — that would let the app grant its own
          elevated access, defeating the point of a separate trust tier. Instead, run this from a machine with access
          to the Firebase project&apos;s service account:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-slate-200">
          <code>
            GOOGLE_APPLICATION_CREDENTIALS=./service-account.json{"\n"}
            {"  "}npx tsx scripts/grantAdminRole.ts &lt;uid-or-email&gt; &lt;admin|support|user&gt;
          </code>
        </pre>
        <p>Use role &ldquo;admin&rdquo; or &ldquo;support&rdquo; to grant access, or &ldquo;user&rdquo; to revoke it.</p>
      </div>
    ),
  },
];

export default function AdminHelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">Help</h1>
        <p className="mt-1 text-sm text-slate-400">A quick reference for what each part of the admin panel does.</p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-base font-semibold text-white">{section.title}</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">{section.body}</div>
        </div>
      ))}
    </div>
  );
}
