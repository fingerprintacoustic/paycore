"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const { user } = useAuth();
  const { permission, enablePush } = usePushNotifications();
  const [emailPref, setEmailPref] = useState(true);
  const [busy, setBusy] = useState(false);

  async function toggleEmailPref() {
    if (!user) return;
    setBusy(true);
    const next = !emailPref;
    setEmailPref(next);
    await updateDoc(doc(db, "users", user.uid), { "notificationPrefs.email": next });
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Push notifications</p>
            <p className="text-xs text-slate-400">
              {permission === "granted" ? "Enabled on this device." : permission === "denied" ? "Blocked in browser settings." : "Get alerted the moment money moves."}
            </p>
          </div>
          {permission !== "granted" && permission !== "unsupported" && (
            <Button variant="secondary" className="w-auto px-3 py-1.5 text-xs" onClick={enablePush} disabled={permission === "denied"}>
              Enable
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Email notifications</p>
          <button
            role="switch"
            aria-checked={emailPref}
            onClick={toggleEmailPref}
            disabled={busy}
            className={`h-6 w-11 rounded-full transition ${emailPref ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"}`}
          >
            <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition ${emailPref ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <h2 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">Security</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Transfer PIN</p>
            <p className="text-xs text-slate-400">Required to confirm every transfer.</p>
          </div>
          <a href="/dashboard/security" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Manage
          </a>
        </div>
      </div>
    </div>
  );
}
