import { DataStore, syncFromSupabase } from '@/lib/store';
import { SettingsClient } from '@/components/SettingsClient';

export const revalidate = 0;

export default async function SettingsPage() {
  await syncFromSupabase();
  const currentRole = DataStore.getSessionRole();

  return <SettingsClient currentRole={currentRole} />;
}
