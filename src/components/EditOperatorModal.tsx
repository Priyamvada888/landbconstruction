'use client';

import { useState, useTransition } from 'react';
import { Edit, X, HardHat, CreditCard } from 'lucide-react';
import { Operator, OperatorRole, AvailabilityStatus, UserRole } from '@/types/database';
import { updateOperatorAction } from '@/lib/actions';
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

const AVAILABILITIES: AvailabilityStatus[] = [
  'Available',
  'Working',
  'Starting Soon',
  'On Leave',
  'Do Not Use',
];

interface EditOperatorModalProps {
  operator: Operator;
  currentRole?: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: (updated: Operator) => void;
}

export function EditOperatorModal({
  operator,
  currentRole = 'admin',
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  triggerLabel = 'Edit',
  triggerClassName,
  onSuccess,
}: EditOperatorModalProps) {
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
        const res = await updateOperatorAction(operator.id, formData);
        handleClose();
        if (onSuccess && res.operator) {
          onSuccess(res.operator);
        }
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update operator');
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
                  <HardHat className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Edit Person / Operator</h2>
                  <p className="text-[11px] text-slate-500">Updating profile for {operator.name}</p>
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
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <form id="edit-operator-form" onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Core Profile Details */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    1. Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={operator.name}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Primary Trade / Machine Role *
                      </label>
                      <select
                        name="primary_role"
                        required
                        defaultValue={operator.primary_role}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        defaultValue={operator.phone || ''}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={operator.email || ''}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Location / Base Postcode
                      </label>
                      <input
                        type="text"
                        name="location"
                        defaultValue={operator.location || ''}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Years Experience
                      </label>
                      <input
                        type="number"
                        name="experience_years"
                        min="0"
                        defaultValue={operator.experience_years}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Availability Status
                      </label>
                      <select
                        name="availability_status"
                        defaultValue={operator.availability_status}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                      >
                        {AVAILABILITIES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Current Company / Subcontractor
                      </label>
                      <input
                        type="text"
                        name="current_company"
                        defaultValue={operator.current_company || ''}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Rates & Remuneration (Admin fields) */}
                {currentRole === 'admin' && (
                  <div className="pt-3 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Rates & Banking (Admin Restricted)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Base Hourly Rate (£) *
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          name="hourly_rate"
                          defaultValue={operator.hourly_rate}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Day Rate Equivalent (£)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          name="daily_rate"
                          defaultValue={operator.daily_rate}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Tax Rate Withheld (%)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          name="tax_rate_percent"
                          defaultValue={operator.tax_rate_percent}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          name="bank_name"
                          defaultValue={operator.bank_name || ''}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Account Name
                        </label>
                        <input
                          type="text"
                          name="bank_account_name"
                          defaultValue={operator.bank_account_name || ''}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          name="bank_account_number"
                          defaultValue={operator.bank_account_number || ''}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Sort Code
                        </label>
                        <input
                          type="text"
                          name="bank_sort_code"
                          defaultValue={operator.bank_sort_code || ''}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                form="edit-operator-form"
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
