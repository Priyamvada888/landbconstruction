import { DataStore, syncFromSupabase } from '@/lib/store';
import { QuickLogHoursModal } from '@/components/QuickLogHoursModal';
import { Clock, Calendar, Briefcase, HardHat, FileText, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { TimesheetsTableClient } from '@/components/TimesheetsTableClient';

export const revalidate = 0;

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ operatorId?: string; jobId?: string; startDate?: string; endDate?: string }>;
}) {
  await syncFromSupabase();
  const params = await searchParams;
  const operators = DataStore.getOperators(false);
  const jobs = DataStore.getJobs(false);

  const timesheets = DataStore.getTimesheets({
    operatorId: params.operatorId,
    jobId: params.jobId,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const totalHours = timesheets.reduce((acc, t) => acc + Number(t.hours), 0);
  const totalGross = timesheets.reduce((acc, t) => acc + Number(t.hours) * Number(t.rate_applied), 0);

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Timesheets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Site hours tracking with automated rate snapshotting and job verification.
          </p>
        </div>

        <QuickLogHoursModal
          operators={operators}
          jobs={jobs}
          triggerLabel="+ Log Shift Hours"
          triggerClassName="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Entries</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{timesheets.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Hours</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Gross Pay</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalGross)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Avg Shift</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">
            {timesheets.length > 0 ? (totalHours / timesheets.length).toFixed(1) : 0} hrs
          </p>
        </div>
      </div>

      {/* Filter and Table Client Component */}
      <TimesheetsTableClient
        initialTimesheets={timesheets}
        operators={operators}
        jobs={jobs}
        selectedOperatorId={params.operatorId}
        selectedJobId={params.jobId}
      />
    </div>
  );
}
