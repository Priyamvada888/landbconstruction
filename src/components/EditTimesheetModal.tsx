'use client';

import { useState, useTransition } from 'react';
import { Edit, X, Clock, HardHat, Building2 } from 'lucide-react';
import { Timesheet, Operator, Job } from '@/types/database';
import { updateTimesheetAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';

interface EditTimesheetModalProps {
  timesheet: Timesheet;
  operators: Operator[];
  jobs: Job[];
  isOpen?: boolean;
  onClose?: () => void;
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: (updated: Timesheet) => void;
}

export function EditTimesheetModal({
  timesheet,
  operators,
  jobs,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  triggerLabel = 'Edit',
  triggerClassName,
  onSuccess,
}: EditTimesheetModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await updateTimesheetAction(timesheet.id, formData);
        handleClose();
        if (onSuccess && res.timesheet) {
          onSuccess(res.timesheet);
        }
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update timesheet');
      }
    });
  };

  return (
    <>
      {!isControlled && (
        <button
          onClick={() => setInternalOpen(true)}
          className={
            triggerClassName ||
            'p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-1 text-xs font-semibold'
          }
          title="Edit Timesheet"
        >
          <Edit className="w-3.5 h-3.5" />
          {triggerLabel !== 'Edit' && <span>{triggerLabel}</span>}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Edit Shift Timesheet</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Operator *
                </label>
                <select
                  name="operator_id"
                  required
                  defaultValue={timesheet.operator_id}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                >
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.primary_role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Linked Site / Job
                </label>
                <select
                  name="job_id"
                  defaultValue={timesheet.job_id || 'direct'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="direct">Direct / Base Rate (No Site)</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.client} — {job.site_name} (£{job.pay_rate}/hr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Shift Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={timesheet.date}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Hours Worked *
                  </label>
                  <input
                    type="number"
                    name="hours"
                    step="0.25"
                    min="0.25"
                    max="24"
                    required
                    defaultValue={timesheet.hours}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Shift Notes / Machine No
                </label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={timesheet.notes || ''}
                  placeholder="e.g. 8T Digger dig out on road extension"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                >
                  {isPending ? 'Saving...' : 'Update Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
