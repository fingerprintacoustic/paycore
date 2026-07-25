"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertAnnouncementFn, deleteAnnouncementFn } from "@/lib/firebase/adminFunctions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audience: "all" | "verified_only";
  active: boolean;
}

export function AnnouncementsManager({ initial }: { initial: AnnouncementRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await upsertAnnouncementFn({ title, body, audience: "all", active: true });
      setTitle("");
      setBody("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(a: AnnouncementRow) {
    setBusy(true);
    try {
      await upsertAnnouncementFn({ announcementId: a.id, title: a.title, body: a.body, audience: a.audience, active: !a.active });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteAnnouncementFn({ announcementId: id });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-200">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={2000}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </div>
        <Button type="submit" loading={busy}>
          Publish announcement
        </Button>
      </form>

      <ul className="space-y-3">
        {initial.map((a) => (
          <li key={a.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-white">{a.title}</p>
                <p className="mt-1 text-sm text-slate-400">{a.body}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${a.active ? "bg-brand-500/15 text-brand-300" : "bg-slate-500/15 text-slate-400"}`}>
                {a.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" className="w-auto px-2 py-1 text-xs" onClick={() => toggleActive(a)} disabled={busy}>
                {a.active ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="ghost" className="w-auto px-2 py-1 text-xs text-red-300" onClick={() => remove(a.id)} disabled={busy}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
