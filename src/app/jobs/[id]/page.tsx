import { notFound } from 'next/navigation';
import { DataStore, syncFromSupabase } from '@/lib/store';
import { JobDetailClient } from '@/components/JobDetailClient';

export const revalidate = 0;

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await syncFromSupabase();
  const { id } = await params;
  const job = DataStore.getJobById(id);

  if (!job) {
    notFound();
  }

  const { suggested, override } = DataStore.getSuggestedCandidates(id);
  const timesheets = DataStore.getTimesheets({ jobId: id });
  const allOperators = DataStore.getOperators(false);
  const financials = DataStore.getJobFinancials(id) || {
    totalHours: 0,
    revenue: 0,
    cost: 0,
    margin: 0,
    marginPercent: 0,
    entryCount: 0,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <JobDetailClient
        job={job}
        suggestedCandidates={suggested}
        overrideCandidates={override}
        timesheets={timesheets}
        allOperators={allOperators}
        financials={financials}
      />
    </div>
  );
}
