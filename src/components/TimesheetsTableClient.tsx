'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Timesheet, Operator, Job } from '@/types/database';
import { deleteTimesheetAction } from '@/lib/actions';
import { Trash2, Search, Filter, HardHat, Building2, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TimesheetsTableClientProps {
  initialTimesheets: Timesheet[];
  operators: Operator[];
  jobs: Job[];
  selectedOperatorId?: string;
  selectedJobId?: string;
}

export function TimesheetsTableClient({
  initialTimesheets,
  operators,
  jobs,
  selectedOperatorId = '',
  selectedJobId = '',
}: TimesheetsTableClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [operatorFilter, setOperatorFilter] = useState(selectedOperatorId);
  const [jobFilter, setJobFilter] = useState(selectedJobId);

  const handleFilterChange = (newOp: string, newJob: string) => {
    setOperatorFilter(newOp);
    setJobFilter(newJob);
    const searchParams = new URLSearchParams();
    if (newOp) searchParams.set('operatorId', newOp);
    if (newJob) searchParams.set('jobId', newJob);
    router.push(`/timesheets?${searchParams.toString()}`);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this timesheet entry?')) return;
    startTransition(async () => {
      await deleteTimesheetAction(id);
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-sm w-full min-w-0">
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5 w-full sm:w-auto min-w-0">
          <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
            <HardHat className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={operatorFilter}
              onChange={(e) => handleFilterChange(e.target.value, jobFilter)}
              className="w-full sm:w-auto max-w-full truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors min-w-0"
            >
              <option value="">All Operators</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={jobFilter}
              onChange={(e) => handleFilterChange(operatorFilter, e.target.value)}
              className="w-full sm:w-auto max-w-full truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors min-w-0"
            >
              <option value="">All Job Sites</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.client} — {job.site_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(operatorFilter || jobFilter) && (
          <button
            onClick={() => handleFilterChange('', '')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline self-start sm:self-auto shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Mobile & Tablet Timesheet Cards (< lg) */}
      <div className="lg:hidden space-y-3">
        {initialTimesheets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white text-slate-400 text-xs">
            No timesheet records match your filters.
          </div>
        ) : (
          initialTimesheets.map((ts) => {
            const gross = Number(ts.hours) * Number(ts.rate_applied);
            return (
              <div
                key={ts.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {ts.operator ? (
                      <Link
                        href={`/operators/${ts.operator.id}`}
                        className="font-bold text-slate-900 text-sm hover:underline block"
                      >
                        {ts.operator.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-sm font-bold">Unknown</span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                      {ts.date}
                    </span>
                  </div>

                  <span className="font-bold text-sm text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                    {formatCurrency(gross)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[180px]">
                    {ts.job ? (
                      <Link
                        href={`/jobs/${ts.job.id}`}
                        className="text-slate-700 font-medium hover:text-slate-900 hover:underline truncate block"
                      >
                        {ts.job.client} — {ts.job.site_name}
                      </Link>
                    ) : (
                      <span className="text-slate-400 italic">Direct / Base</span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-slate-900">{ts.hours} hrs</span>
                    <span className="text-slate-400 text-[11px] ml-1">@ £{Number(ts.rate_applied).toFixed(2)}</span>
                  </div>
                </div>

                {ts.notes && (
                  <p className="text-[11px] text-slate-500 italic px-1">{ts.notes}</p>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => handleDelete(ts.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 text-xs"
                    title="Delete timesheet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (>= lg) */}
      <div className="hidden lg:block rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/60 uppercase font-bold text-slate-400 tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Operator</th>
                <th className="px-4 py-3.5">Linked Job Site</th>
                <th className="px-4 py-3.5">Hours Worked</th>
                <th className="px-4 py-3.5">Rate Applied</th>
                <th className="px-4 py-3.5">Gross Pay</th>
                <th className="px-4 py-3.5">Notes</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialTimesheets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No timesheet records match your filters.
                  </td>
                </tr>
              ) : (
                initialTimesheets.map((ts) => {
                  const gross = Number(ts.hours) * Number(ts.rate_applied);
                  return (
                    <tr key={ts.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-slate-700">{ts.date}</td>
                      <td className="px-4 py-3.5">
                        {ts.operator ? (
                          <Link
                            href={`/operators/${ts.operator.id}`}
                            className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                          >
                            {ts.operator.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {ts.job ? (
                          <Link
                            href={`/jobs/${ts.job.id}`}
                            className="text-slate-700 hover:text-indigo-600 font-medium"
                          >
                            {ts.job.client} — {ts.job.site_name}
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic">Direct / Base Rate</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-indigo-600">{ts.hours} hrs</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        £{Number(ts.rate_applied).toFixed(2)}/hr
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">
                        {formatCurrency(gross)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">{ts.notes || '—'}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(ts.id)}
                          disabled={isPending}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete timesheet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
