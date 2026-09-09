import { DataStore, syncFromSupabase } from '@/lib/store';
import { PayrollClient } from '@/components/PayrollClient';

export const revalidate = 0;

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: 'weekly' | 'monthly'; offset?: string }>;
}) {
  await syncFromSupabase();
  const params = await searchParams;
  const periodType = params.type || 'weekly';
  const offset = parseInt(params.offset || '0', 10);

  const currentRole = DataStore.getSessionRole();
  const report = DataStore.getPayrollReport(periodType, offset);

  return (
    <PayrollClient
      report={report}
      periodType={periodType}
      offset={offset}
      currentRole={currentRole}
    />
  );
}
