import { adminDb } from "@/lib/firebase/admin";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";

async function getAnnouncements() {
  const snap = await adminDb.collection("announcements").orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, title: data.title, body: data.body, audience: data.audience, active: data.active };
  });
}

export default async function AdminAnnouncementsPage() {
  const announcements = await getAnnouncements();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Announcements</h1>
      <AnnouncementsManager initial={announcements} />
    </div>
  );
}
