'use client';

import { useState, useTransition } from 'react';
import { Plus, X, HardHat, Award, ShieldAlert, CreditCard } from 'lucide-react';
import { OperatorRole, AvailabilityStatus, TicketType, UserRole } from '@/types/database';
import { createOperatorAction } from '@/lib/actions';

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

const AVAILABILITIES: AvailabilityStatus[] = [
  'Available',
  'Working',
  'Starting Soon',
  'On Leave',
  'Do Not Use',
];

const TICKET_TYPES: TicketType[] = [
  'Excavator 180',
  'Excavator 360',
  'ADT',
  'Dozer',
  'Dumper',
  'Roller',
  'Telehandler',
  'CPCS',
  'NPORS',
  'EUSR',
  'CSCS',
  'First Aid',
  'Confined Space',
  'Slinger/Signaller',
];

interface CreateOperatorModalProps {
  currentRole: UserRole;
}

export function CreateOperatorModal({ currentRole }: CreateOperatorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<TicketType[]>(['CSCS']);

  const handleToggleTicket = (ticket: TicketType) => {
    if (selectedTickets.includes(ticket)) {
      setSelectedTickets(selectedTickets.filter((t) => t !== ticket));
    } else {
      setSelectedTickets([...selectedTickets, ticket]);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createOperatorAction(formData);
        setIsOpen(false);
        form.reset();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to register operator');
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
        <span>Add Member</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-t-[28px] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] text-slate-900 overflow-hidden">
            
            {/* Modal Fixed Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  <HardHat className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Register Plant Operator</h2>
                  <p className="text-[11px] text-slate-400">Add worker profile, tickets, and CIS rate</p>
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

            <form id="create-op-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* General Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. John Campbell"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="e.g. 07700 900123"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Base Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Manchester (M4)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Trade & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2 min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Primary Role *
                  </label>
                  <select
                    name="primary_role"
                    required
                    defaultValue="Excavator Operator"
                    className="w-full max-w-full truncate min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Years Experience
                  </label>
                  <input
                    type="number"
                    name="experience_years"
                    min="0"
                    defaultValue="5"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Availability Status *
                  </label>
                  <select
                    name="availability_status"
                    defaultValue="Available"
                    className="w-full max-w-full truncate min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  >
                    {AVAILABILITIES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Current Company */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Company (working with)
                </label>
                <input
                  type="text"
                  name="current_company"
                  placeholder="e.g. Balfour Beatty / Self-Employed"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#6366f1] focus:bg-white focus:outline-none"
                />
              </div>

              {/* Tickets Multi-select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tickets & Certifications
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  {TICKET_TYPES.map((t) => {
                    const isSelected = selectedTickets.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleToggleTicket(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#6366f1] text-white shadow-sm font-bold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>

                {selectedTickets.map((t) => (
                  <input key={t} type="hidden" name="tickets" value={t} />
                ))}
              </div>

              {/* Rates */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Remuneration & Rates
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hourly Base Rate (£) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      name="hourly_rate"
                      defaultValue="24.00"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6366f1] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Daily Rate (£)
                    </label>
                    <input
                      type="number"
                      step="5.0"
                      min="0"
                      name="daily_rate"
                      defaultValue="220.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6366f1] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tax Rate % (CIS/PAYE) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      name="tax_rate_percent"
                      defaultValue="20"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#6366f1] focus:outline-none"
                    />
                  </div>
                </div>
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
                form="create-op-form"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-all active:scale-95"
              >
                {isPending ? 'Saving...' : 'Register Operator'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
