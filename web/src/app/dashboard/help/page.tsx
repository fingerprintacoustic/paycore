import Link from "next/link";

interface HelpSection {
  title: string;
  body: React.ReactNode;
}

const SECTIONS: HelpSection[] = [
  {
    title: "Getting started",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Verify your phone number so other PayCore users can find you by it when sending money.</li>
        <li>
          Set a 4-6 digit transfer PIN under{" "}
          <Link href="/dashboard/security" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Security
          </Link>{" "}
          — you&apos;ll confirm every transfer with it, so choose one you won&apos;t forget.
        </li>
      </ul>
    ),
  },
  {
    title: "Sending money",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Go to{" "}
          <Link href="/dashboard/send" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Send money
          </Link>
          , search for the recipient by email or phone, enter an amount, and confirm with your PIN.
        </li>
        <li>
          If a fee applies to the amount you&apos;re sending, you&apos;ll see it before you confirm. It&apos;s always
          added on top — the person you&apos;re sending to receives exactly the amount you typed.
        </li>
        <li>Every completed transfer gets a reference number you can look up in your transaction history.</li>
      </ul>
    ),
  },
  {
    title: "Receiving money",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Share your QR code or payment link from{" "}
          <Link href="/dashboard/receive" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Receive
          </Link>{" "}
          — anyone with a PayCore account can scan or open it to pay you.
        </li>
        <li>Optionally set a specific amount first, so whoever&apos;s paying doesn&apos;t have to type it in themselves.</li>
      </ul>
    ),
  },
  {
    title: "Adding funds",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Sent money in some other way (bank transfer, cash, etc.)? Go to{" "}
          <Link href="/dashboard/request" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Add funds
          </Link>
          , enter the amount and how you sent it, and your wallet is credited once it&apos;s confirmed.
        </li>
        <li>You&apos;ll get a notification either way — once it&apos;s approved, or if we need more information first.</li>
      </ul>
    ),
  },
  {
    title: "Keeping your account secure",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Change your PIN any time from{" "}
          <Link href="/dashboard/security" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Security
          </Link>
          . Forgotten it? Reset it there using your account password instead of your old PIN.
        </li>
        <li>
          Turn on push or email notifications under{" "}
          <Link href="/dashboard/settings" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Settings
          </Link>{" "}
          to know the moment money moves in or out of your account.
        </li>
      </ul>
    ),
  },
  {
    title: "If something's not working",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          A frozen account or a blocked transfer usually means an administrator has placed a hold on it — reach out to
          whoever manages your PayCore account and they can review it.
        </li>
        <li>Transfers also have minimum, maximum, and daily limits set by an administrator — you&apos;ll see the specific limit in the error message if you hit one.</li>
      </ul>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Help</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Quick answers for using PayCore. Can&apos;t find what you need? Ask whoever manages your PayCore account.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <div
          key={section.title}
          className="rounded-2xl border border-slate-200 bg-white/70 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
        >
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{section.title}</h2>
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{section.body}</div>
        </div>
      ))}
    </div>
  );
}
