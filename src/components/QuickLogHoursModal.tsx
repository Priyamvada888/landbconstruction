'use client';

import { useState, useTransition, useMemo } from 'react';
import { Clock, X, AlertCircle } from 'lucide-react';
import { Operator, Job } from '@/types/database';
import { logTimesheetAction } from '@/lib/actions';

interface QuickLogHoursModalProps {
  operators: Operator[];
  jobs: Job[];
  defaultOperatorId?: string;
  defaultJobId?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

export function QuickLogHoursModal({
  operators,
  jobs,
  defaultOperatorId,
  defaultJobId,
  triggerLabel = 'Log Hours',
  triggerClassName,
}: QuickLogHoursModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(defaultOperatorId || (operators[0]?.id ?? ''));
  const [selectedJobId, setSelectedJobId] = useState<string>(defaultJobId || '');

  // Calculate available jobs for the selected operator
  const availableJobsForOperator = useMemo(() => {
    if (!selectedOperatorId) return [];
    return jobs.filter((job) =>
      (job.assignments || []).some(
        (asg) => asg.operator_id === selectedOperatorId && !asg.unassigned_at
      )
    );
  }, [jobs, selectedOperatorId]);

  // Calculate available operators if job is fixed
  const availableOperatorsForJob = useMemo(() => {
    if (!defaultJobId) return operators;
    const targetJob = jobs.find((j) => j.id === defaultJobId);
    if (!targetJob) return operators;
    const assignedOpIds = new Set(
      (targetJob.assignments || []).filter((a) => !a.unassigned_at).map((a) => a.operator_id)
    );
    return operators.filter((op) => assignedOpIds.has(op.id));
  }, [jobs, operators, defaultJobId]);

  // Selected operator object
  const currentOp = useMemo(
    () => operators.find((op) => op.id === selectedOperatorId),
    [operators, selectedOperatorId]
  );

  // Selected job object
  const currentJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId),
    [jobs, selectedJobId]
  );

  // Projected rate applied
  const projectedRate = useMemo(() => {
    if (selectedJobId && currentJob) {
      return {
        rate: currentJob.pay_rate,
        source: `Job Agreed Rate (${currentJob.client} - ${currentJob.site_name})`,
      };
    }
    if (currentOp) {
      return {
        rate: currentOp.hourly_rate,
        source: `Operator Standard Base Rate (${currentOp.name})`,
      };
    }
    return { rate: 0, source: 'None' };
  }, [selectedJobId, currentJob, currentOp]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await logTimesheetAction(formData);
        setIsOpen(false);
        form.reset();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to log hours');
      }
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setSelectedOperatorId(defaultOperatorId || (operators[0]?.id ?? ''));
          setSelectedJobId(defaultJobId || '');
          setIsOpen(true);
        }}
        className={
          triggerClassName ||
          'inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors'
        }
      >
        <Clock className="w-3.5 h-3.5" />
        <span>{triggerLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xl max-h-[90vh] flex flex-col my-0 sm:my-8 text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Log Working Hours</h2>
                  <p className="text-xs text-slate-500">Record timesheet entry with automated rate snapshot</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Operator Selection */}
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Operator *
                </label>
                {defaultOperatorId ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 truncate">
                    {currentOp?.name} ({currentOp?.primary_role})
                    <input type="hidden" name="operator_id" value={defaultOperatorId} />
                  </div>
                ) : (
                  <select
                    name="operator_id"
                    value={selectedOperatorId}
                    onChange={(e) => {
                      setSelectedOperatorId(e.target.value);
                      setSelectedJobId('');
                    }}
                    required
                    className="w-full max-w-full truncate min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                  >
                    {availableOperatorsForJob.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} — {op.primary_role} (£{Number(op.hourly_rate ?? 0).toFixed(2)}/hr)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Job Selection */}
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Linked Job Site
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {availableJobsForOperator.length} active assignment(s)
                  </span>
                </div>
                {defaultJobId ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 truncate">
                    {currentJob?.client} - {currentJob?.site_name} (£{Number(currentJob?.pay_rate ?? 0).toFixed(2)}/hr)
                    <input type="hidden" name="job_id" value={defaultJobId} />
                  </div>
                ) : (
                  <select
                    name="job_id"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full max-w-full truncate min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                  >
                    <option value="direct">
                      Direct / Unassigned (uses Operator Base Rate £{Number(currentOp?.hourly_rate ?? 0).toFixed(2)}/hr)
                    </option>
                    {availableJobsForOperator.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.client} — {job.site_name} (£{Number(job.pay_rate ?? 0).toFixed(2)}/hr)
                      </option>
                    ))}
                  </select>
                )}
                {availableJobsForOperator.length === 0 && !defaultJobId && (
                  <p className="mt-1.5 text-[11px] text-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Not assigned to active jobs. Will apply base rate (£{Number(currentOp?.hourly_rate ?? 0).toFixed(2)}/hr).</span>
                  </p>
                )}
              </div>

              {/* Date & Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date Worked *
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Hours * (e.g. 8.5)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    name="hours"
                    defaultValue="8.0"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Rate Applied Snapshot Notice */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center text-slate-700 font-medium">
                  <span>Calculated Rate Snapshot:</span>
                  <span className="text-base font-bold text-slate-900">£{Number(projectedRate.rate ?? 0).toFixed(2)}/hr</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 truncate">{projectedRate.source}</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Shift Notes & Machine Operations
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="e.g. Trenching excavation on Sector 4, wet weather conditions."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Logging...' : 'Save Timesheet Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
