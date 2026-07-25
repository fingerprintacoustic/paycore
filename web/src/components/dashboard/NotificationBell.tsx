"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
          <p className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</p>
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">Nothing yet.</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => markRead(n.id)}
                    className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <p className={`text-sm ${n.read ? "text-slate-500" : "font-medium text-slate-800 dark:text-slate-100"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400">{n.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
