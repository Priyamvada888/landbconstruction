'use client';

import { useState, useTransition } from 'react';
import { Plus, X, Briefcase, MapPin, Calendar, Users, FileText } from 'lucide-react';
import { OperatorRole } from '@/types/database';
import { createJobAction } from '@/lib/actions';

const OPERATOR_ROLES: OperatorRole[] = [
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

export function QuickAddJobModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createJobAction(formData);
        setIsOpen(false);
        form.reset();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create job');
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 active:scale-[0.98] transition-all"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Add Job Site</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] text-slate-900 overflow-hidden">
            
            {/* Modal Fixed Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Create New Job Site</h2>
                  <p className="text-[11px] text-slate-400">Post site requirement and plant operator specs</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form id="quick-add-job-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Site & Client */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Site Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      name="client"
                      required
                      placeholder="e.g. Balfour Beatty Civils"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Site Name *
                    </label>
                    <input
                      type="text"
                      name="site_name"
                      required
                      placeholder="e.g. A580 East Lancs Bypass Widening"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Quantity */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Role & Headcount
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Site Postcode
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      placeholder="e.g. M28 2LY"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Required Role *
                    </label>
                    <select
                      name="required_role"
                      required
                      defaultValue="Excavator Operator"
                      className="w-full max-w-full truncate min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    >
                      {OPERATOR_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Operators Needed *
                    </label>
                    <input
                      type="number"
                      name="required_operator_count"
                      min="1"
                      defaultValue="1"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Commercial Terms & Rates */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Rates & Commercials
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pay Rate (£/hr paid to op) *
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      name="pay_rate"
                      defaultValue="24.00"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Charge Rate (£/hr to client) *
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      name="charge_rate"
                      defaultValue="32.00"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Contacts */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Timeline & Contact
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Site Contact Name
                    </label>
                    <input
                      type="text"
                      name="site_contact_name"
                      placeholder="e.g. Trevor (Site Agent)"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Site Contact Phone
                    </label>
                    <input
                      type="text"
                      name="site_contact_phone"
                      placeholder="e.g. 07700 900551"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Notes & Equipment Specs
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="e.g. 20T tracked 360 with quick hitch, PPE requirement..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors resize-none"
                />
              </div>
            </form>

            {/* Modal Fixed Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="quick-add-job-form"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-all active:scale-95"
              >
                {isPending ? 'Saving...' : 'Post Job to Board'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
