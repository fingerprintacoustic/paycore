"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Client-side auth gate for pages inside a layout that has already verified
 * the session server-side (dashboard, admin).
 *
 * The server session cookie (__session, 5 days) can outlive the Firebase
 * *client's* auth state — e.g. you return to the app after the client's ID
 * token lapsed. The layout renders because the cookie is valid, but child
 * pages that read `useAuth().user` would briefly (or, if the client is truly
 * signed out, permanently) see `null` and render blank or hang on a loading
 * flag. This gate holds a spinner until auth resolves, then either renders
 * the page or sends a genuinely-signed-out client through /login to re-sync.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const dest = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(dest)}`);
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
