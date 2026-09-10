"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      setDisplayName(data?.displayName ?? user.displayName ?? "");
      setLoading(false);
    }, () => setLoading(false));
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setSaving(true); setMessage(null);
    try {
      // displayName is the only field editable here. Phone changes must go
      // through verification (/verify-phone → OTP → linkWithCredential →
      // markPhoneVerified) — that's what links the number to the auth record
      // and rebuilds searchTokens. Writing `phone` straight to Firestore
      // (as this page used to) leaves an unverified number that recipient
      // search can't find.
      await updateDoc(doc(db, "users", user.uid), { displayName: displayName.trim(), updatedAt: new Date() });
      setMessage("Profile updated.");
    } catch {
      setMessage("Could not update your profile.");
    } finally { setSaving(false); }
  }

  if (!user || loading) return <div className="mx-auto max-w-md text-sm text-slate-500">Loading profile…</div>;

  const verifiedPhone = user.phoneNumber;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div><h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Profile</h1><p className="mt-1 text-sm text-slate-500">Manage your basic account details.</p></div>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-6 dark:border-white/10 dark:bg-white/5">
        <Input label="Display name" name="displayName" required value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} />
        <Input label="Email" name="email" value={user.email ?? ""} disabled readOnly />
        <div className="space-y-1.5">
          <Input
            label="Phone"
            name="phone"
            value={verifiedPhone ?? ""}
            placeholder="No phone verified"
            disabled
            readOnly
          />
          <p className="text-xs text-slate-400">
            {verifiedPhone
              ? "Verified. "
              : "Not verified — people can't find you by phone until you verify one. "}
            <a href="/verify-phone" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
              {verifiedPhone ? "Change number" : "Verify a phone number"}
            </a>
          </p>
        </div>
        {message && <p className="text-sm text-slate-500">{message}</p>}
        <Button type="submit" loading={saving}>Save changes</Button>
      </form>
    </div>
  );
}
