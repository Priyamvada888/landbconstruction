'use client';

import { useState, useTransition } from 'react';
import { Plus, X, Briefcase, MapPin, Calendar, Users, FileText, Trash2 } from 'lucide-react';
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

interface RoleRow {
  id: string;
  role: OperatorRole;
  count: number;
  start_date: string;
}

export function QuickAddJobModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [roleRows, setRoleRows] = useState<RoleRow[]>([
    { id: '1', role: 'ADT Operator', count: 1, start_date: new Date().toISOString().split('T')[0] },
  ]);

  const totalHeadcount = roleRows.reduce((acc, r) => acc + (Number(r.count) || 0), 0);

  const handleAddRoleRow = () => {
    setRoleRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        role: 'Excavator Operator',
        count: 1,
        start_date: new Date().toISOString().split('T')[0],
      },
    ]);
  };

  const handleRemoveRoleRow = (id: string) => {
    if (roleRows.length <= 1) return;
    setRoleRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRoleRow = (id: string, field: 'role' | 'count' | 'start_date', value: any) => {
    setRoleRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const rolesPayload = roleRows.map((r) => ({
      role: r.role,
      count: Number(r.count) || 1,
      start_date: r.start_date,
    }));
    formData.set('role_requirements', JSON.stringify(rolesPayload));
    formData.set('required_operator_count', totalHeadcount.toString());
    formData.set('required_role', roleRows[0]?.role || 'ADT Operator');

    startTransition(async () => {
      try {
        await createJobAction(formData);
        setIsOpen(false);
        form.reset();
        setRoleRows([
          { id: '1', role: 'ADT Operator', count: 1, start_date: new Date().toISOString().split('T')[0] },
        ]);
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

              {/* Role & Headcount Requirements */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Role & Headcount Requirements
                  </p>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Total Openings: {totalHeadcount}
                  </span>
                </div>

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

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Roles Needed on Site (e.g. 4 ADTs, 2 Dozers, 1 Roller with different start dates)
                    </label>
                  </div>
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
                            onChange={(e) => handleUpdateRoleRow(row.id, 'role', e.target.value as OperatorRole)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                          >
                            {OPERATOR_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={row.count}
                            onChange={(e) => handleUpdateRoleRow(row.id, 'count', Math.max(1, parseInt(e.target.value) || 1))}
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
