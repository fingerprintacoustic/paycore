import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";

interface UserRow {
  uid: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: FirebaseFirestore.Timestamp;
}

async function searchUsers(term: string | undefined): Promise<UserRow[]> {
  let q = adminDb.collection("users").orderBy("createdAt", "desc").limit(50);
  if (term) {
    q = adminDb
      .collection("users")
      .where("searchTokens", "array-contains", term.trim().toLowerCase())
      .limit(50) as typeof q;
  }
  const snap = await q.get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      displayName: data.displayName,
      email: data.email,
      phone: data.phone,
      status: data.status,
      createdAt: data.createdAt,
    };
  });
}

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const users = await searchUsers(searchParams.q);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Users</h1>

      <form className="max-w-md">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search by email, phone, or account ID"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
        />
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.uid} className="text-slate-200">
                <td className="px-4 py-3">{u.displayName}</td>
                <td className="px-4 py-3 text-slate-400">{u.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === "frozen"
                        ? "bg-red-500/15 text-red-300"
                        : u.status === "active"
                          ? "bg-brand-500/15 text-brand-300"
                          : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${u.uid}`} className="text-sm font-medium text-brand-400 hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
