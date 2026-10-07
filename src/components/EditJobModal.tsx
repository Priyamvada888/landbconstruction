'use client';

import { useState, useTransition } from 'react';
import { Edit, X, Briefcase, Calendar, MapPin, Phone, Building2, Plus, Trash2 } from 'lucide-react';
import { Job, OperatorRole, JobStatus, JobRoleRequirement } from '@/types/database';
import { updateJobAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';

const ROLES: OperatorRole[] = [
  'Excavator Operator',
  'ADT Operator',
  'Dozer Operator',
  'Dumper Operator',
  'Roller Operator',
  'Telehandler Operator',
  'Groundworker',
  'Pipe Layer',
  'General Labourer',
  'Other',
];

const STATUSES: JobStatus[] = ['Draft', 'Filled', 'In Progress', 'Completed', 'Cancelled'];

interface EditJobModalProps {
  job: Job;
  isOpen?: boolean;
  onClose?: () => void;
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: (updated: Job) => void;
}

export function EditJobModal({
  job,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  triggerLabel = 'Edit Site',
  triggerClassName,
  onSuccess,
}: EditJobModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  const initialRoleRows = job.role_requirements && job.role_requirements.length > 0
    ? job.role_requirements.map((r, i) => ({
        id: `${i}-${Date.now()}`,
        role: r.role,
        countStr: String(r.count ?? 1),
        start_date: r.start_date || job.start_date || new Date().toISOString().split('T')[0],
      }))
    : [
        {
          id: '1',
          role: job.required_role || 'ADT Operator',
          countStr: String(job.required_operator_count || 1),
          start_date: job.start_date || new Date().toISOString().split('T')[0],
        },
      ];

  const [roleRows, setRoleRows] = useState(initialRoleRows);
  const totalHeadcount = roleRows.reduce((acc, r) => acc + (parseInt(r.countStr) || 0), 0);

  const handleAddRoleRow = () => {
    setRoleRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        role: 'Excavator Operator',
        countStr: '1',
        start_date: job.start_date || new Date().toISOString().split('T')[0],
      },
    ]);
  };

  const handleRemoveRoleRow = (id: string) => {
    if (roleRows.length <= 1) return;
    setRoleRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRoleRow = (id: string, field: 'role' | 'countStr' | 'start_date', value: string) => {
    setRoleRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

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

    const rolesPayload = roleRows.map((r) => ({
      role: r.role,
      count: parseInt(r.countStr) || 0,
      start_date: r.start_date,
    }));
    formData.set('role_requirements', JSON.stringify(rolesPayload));
    formData.set('required_operator_count', totalHeadcount.toString());
    formData.set('required_role', roleRows[0]?.role || 'ADT Operator');

    startTransition(async () => {
      try {
        const res = await updateJobAction(job.id, formData);
        handleClose();
        if (onSuccess && res.job) {
          onSuccess(res.job);
        }
        router.refresh();
      } catch (err: unknown) {
        let msg = 'Failed to update job site';
        if (err instanceof Error) {
          msg = err.message.includes('Minified React error')
            ? 'An error occurred while saving the job. Please verify your inputs and try again.'
            : err.message;
        }
        setError(msg);
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
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors'
          }
        >
          <Edit className="w-3.5 h-3.5" />
          <span>{triggerLabel}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-t-[28px] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] text-slate-900 overflow-hidden">
            {/* Modal Fixed Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Edit Site / Job</h2>
                  <p className="text-[11px] text-slate-500">Updating requirements for {job.site_name}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <form id="edit-job-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Client / Contractor Name *
                    </label>
                    <input
                      type="text"
                      name="client"
                      required
                      defaultValue={job.client}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Site / Project Name *
                    </label>
                    <input
                      type="text"
                      name="site_name"
                      required
                      defaultValue={job.site_name}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Site Postcode / Location
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      defaultValue={job.postcode || ''}
                      placeholder="e.g. M4 4BF"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Job Site Status
                    </label>
                    <select
                      name="status"
                      defaultValue={job.status}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Role & Headcount Requirements */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Role & Headcount Requirements
                    </p>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Total Openings: {totalHeadcount}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {roleRows.map((row, idx) => (
                      <div key={row.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500">Role #{idx + 1}</span>
                          {roleRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRoleRow(row.id)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Remove role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-6">
                            <label className="block text-[10px] text-slate-500 mb-0.5">Required Role</label>
                            <select
                              value={row.role}
                              onChange={(e) => handleUpdateRoleRow(row.id, 'role', e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-500 mb-0.5">Quantity</label>
                            <input
                              type="number"
                              min="0"
                              value={row.countStr}
                              onChange={(e) => handleUpdateRoleRow(row.id, 'countStr', e.target.value)}
                              onBlur={(e) => {
                                if (e.target.value === '' || e.target.value === '-') {
                                  handleUpdateRoleRow(row.id, 'countStr', '0');
                                }
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-slate-500 mb-0.5">Start Date</label>
                            <input
                              type="date"
                              value={row.start_date}
                              onChange={(e) => handleUpdateRoleRow(row.id, 'start_date', e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddRoleRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors w-full justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Another Role</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-100">

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pay Rate to Operator (£/hr) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      name="pay_rate"
                      required
                      defaultValue={job.pay_rate}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Charge Rate to Client (£/hr) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      name="charge_rate"
                      required
                      defaultValue={job.charge_rate}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      defaultValue={job.start_date}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      defaultValue={job.end_date || ''}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Site Contact Name
                    </label>
                    <input
                      type="text"
                      name="site_contact_name"
                      defaultValue={job.site_contact_name || ''}
                      placeholder="e.g. Mike Evans"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Site Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="site_contact_phone"
                      defaultValue={job.site_contact_phone || ''}
                      placeholder="e.g. 07700 900789"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Special Notes / Induction Details
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={job.notes || ''}
                    placeholder="e.g. Must report to Gate 2 security with full orange Hi-Vis"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors resize-none"
                  />
                </div>
              </form>
            </div>

            {/* Modal Fixed Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 flex-shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-job-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
