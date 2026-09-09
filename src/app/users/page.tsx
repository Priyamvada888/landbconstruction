import { DataStore, syncFromSupabase } from '@/lib/store';
import { UserManagementClient } from '@/components/UserManagementClient';

export const revalidate = 0;

export default async function UsersPage() {
  await syncFromSupabase();
  const currentRole = DataStore.getSessionRole();
  const profiles = DataStore.getProfiles();

  return (
    <UserManagementClient profiles={profiles} currentRole={currentRole} />
  );
}
