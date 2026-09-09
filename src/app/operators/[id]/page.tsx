import { notFound } from 'next/navigation';
import { DataStore, syncFromSupabase } from '@/lib/store';
import { OperatorDetailClient } from '@/components/OperatorDetailClient';

export const revalidate = 0;

export default async function OperatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await syncFromSupabase();
  const { id } = await params;
  const operator = DataStore.getOperatorById(id);

  if (!operator) {
    notFound();
  }

  const timesheets = DataStore.getTimesheets({ operatorId: id });
  const allJobs = DataStore.getJobs(false);
  const hoursSummary = DataStore.getOperatorHoursSummary(id);
  const currentRole = DataStore.getSessionRole();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <OperatorDetailClient
        operator={operator}
        timesheets={timesheets}
        allJobs={allJobs}
        hoursSummary={hoursSummary}
        currentRole={currentRole}
      />
    </div>
  );
}
