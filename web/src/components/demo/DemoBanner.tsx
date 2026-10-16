import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      <span>You&apos;re in the PayCore sandbox — sample data, nothing here is real or saved.</span>
      <Link href="/register" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100">
        Create your own wallet →
      </Link>
    </div>
  );
}
