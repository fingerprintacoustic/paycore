import { adminDb } from "@/lib/firebase/admin";
import { SettingsForm, type GlobalSettings } from "@/components/admin/SettingsForm";

const DEFAULTS: GlobalSettings = {
  maintenanceMode: false,
  minTransferAmount: 100,
  maxTransferAmount: 50_000_00,
  dailyTransferLimit: 100_000_00,
  withdrawalRequiresApproval: true,
};

async function getSettings(): Promise<GlobalSettings> {
  const snap = await adminDb.collection("settings").doc("global").get();
  return { ...DEFAULTS, ...(snap.data() ?? {}) } as GlobalSettings;
}

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-white">Settings</h1>
      <SettingsForm initial={settings} />
    </div>
  );
}
