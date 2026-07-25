import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface Receipt {
  label: string;
  amount: string;
  reference: string;
  status: "completed" | "pending";
  direction: "in" | "out";
  rotate: number;
  offset: number;
}

const RECEIPTS: Receipt[] = [
  { label: "Sent to Amara K.", amount: "$45.00", reference: "PC-2026-004821", status: "completed", direction: "out", rotate: -6, offset: 0 },
  { label: "From Kimoyo Traders", amount: "$1,280.00", reference: "PC-2026-004819", status: "completed", direction: "in", rotate: 3, offset: 28 },
  { label: "Sent to T. Mensah", amount: "$12.50", reference: "PC-2026-004814", status: "pending", direction: "out", rotate: -2, offset: 56 },
];

export function ReceiptStack() {
  return (
    <div className="relative h-80 w-full max-w-sm" aria-hidden="true">
      {RECEIPTS.map((r, i) => (
        <div
          key={r.reference}
          className="absolute left-1/2 w-72 -translate-x-1/2 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/90"
          style={{
            top: `${r.offset}px`,
            transform: `translateX(-50%) rotate(${r.rotate}deg)`,
            zIndex: RECEIPTS.length - i,
            animation: `receipt-in 0.6s ease-out ${i * 0.15}s both`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                r.direction === "in" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {r.direction === "in" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                r.status === "completed"
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {r.status === "completed" ? "Completed" : "Pending"}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{r.label}</p>
          <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-slate-900 dark:text-white">
            {r.amount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-400">{r.reference}</p>
        </div>
      ))}
      <style>{`
        @keyframes receipt-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
