import { DataStore, syncFromSupabase } from '@/lib/store';
import { QuickAddJobModal } from '@/components/QuickAddJobModal';
import { JobsSearchClient } from '@/components/JobsSearchClient';

export const revalidate = 0;

export default async function JobsListPage() {
  await syncFromSupabase();
  const allJobs = DataStore.getJobs(true);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Job Sites
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage client site contracts, required operators, and billing terms
          </p>
        </div>
        <QuickAddJobModal />
      </div>

      {/* Dynamic Search + Filter — all client-side, no page reload */}
      <JobsSearchClient jobs={allJobs} />
    </div>
  );
}
