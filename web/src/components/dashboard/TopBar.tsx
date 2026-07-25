"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "./NotificationBell";

export function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/60 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {user?.displayName ?? user?.email}
      </p>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
