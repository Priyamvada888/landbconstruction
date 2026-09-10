'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  HardHat,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Clock,
  Award,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Archive,
  RotateCcw,
  Edit,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Operator, Timesheet, Job, UserRole, AvailabilityStatus } from '@/types/database';
import {
  archiveOperatorAction,
  restoreOperatorAction,
  deleteOperatorAction,
  deleteTimesheetAction,
} from '@/lib/actions';
import { QuickLogHoursModal } from '@/components/QuickLogHoursModal';
import { EditOperatorModal } from '@/components/EditOperatorModal';
import { EditTimesheetModal } from '@/components/EditTimesheetModal';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface OperatorDetailClientProps {
  operator: Operator;
  timesheets: Timesheet[];
  allJobs: Job[];
  hoursSummary: {
    weekHours: number;
    monthHours: number;
    yearHours: number;
  };
  currentRole: UserRole;
}

export function OperatorDetailClient({
  operator,
  timesheets,
  allJobs,
  hoursSummary,
  currentRole,
}: OperatorDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    if (!confirm('Archive this operator? Historical timesheets will be preserved.')) return;
    startTransition(async () => {
      await archiveOperatorAction(operator.id);
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      await restoreOperatorAction(operator.id);
    });
  };

  const handleDeleteOperator = () => {
    if (!confirm(`Are you sure you want to permanently delete operator "${operator.name}"? This action cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      await deleteOperatorAction(operator.id);
      router.push('/operators');
    });
  };

  const handleDeleteTimesheet = (id: string) => {
    if (!confirm('Are you sure you want to delete this timesheet entry?')) return;
    startTransition(async () => {
      await deleteTimesheetAction(id);
    });
  };

  const isTicketExpired = (expiryStr: string | null) => {
    if (!expiryStr) return false;
    return new Date(expiryStr).getTime() < new Date().getTime();
  };

  const isTicketExpiringSoon = (expiryStr: string | null) => {
    if (!expiryStr) return false;
    const expiryTime = new Date(expiryStr).getTime();
    const now = new Date().getTime();
    const thirtyDays = 30 * 86400000;
    return expiryTime > now && expiryTime - now < thirtyDays;
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/operators" className="text-xs font-semibold text-slate-500 hover:text-slate-900">
              Operators
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-indigo-600 font-semibold">{operator.primary_role}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {operator.name}
            </h1>
            {operator.is_archived && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Archived
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-indigo-600" />
              {operator.primary_role} ({operator.experience_years} years exp)
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {operator.phone || 'No phone recorded'}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {operator.email || 'No email'}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {operator.location || 'North West'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <EditOperatorModal
            operator={operator}
            currentRole={currentRole}
            triggerLabel="Edit Details"
            triggerClassName="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
          />

          <QuickLogHoursModal
            operators={[operator]}
            jobs={allJobs}
            defaultOperatorId={operator.id}
            triggerLabel="Log Hours"
            triggerClassName="touch-target inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
          />

          {operator.is_archived ? (
            <button
              onClick={handleRestore}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore</span>
            </button>
          ) : (
            <button
              onClick={handleArchive}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              <Archive className="w-4 h-4" />
              <span>Archive</span>
            </button>
          )}

          <button
            onClick={handleDeleteOperator}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors"
            title="Delete operator"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Hours Worked Computed Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hours This Week</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{hoursSummary.weekHours.toFixed(1)} hrs</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Current Monday - Sunday cycle</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hours This Month</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{hoursSummary.monthHours.toFixed(1)} hrs</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Calendar month to date</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hours This Year</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{hoursSummary.yearHours.toFixed(1)} hrs</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Year 2026 total verified hours</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Tickets & Compliance */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Plant & Safety Certifications</span>
            </h2>

            {(operator.tickets || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No tickets or card certificates registered.</p>
            ) : (
              <div className="space-y-2.5">
                {(operator.tickets || []).map((t) => {
                  const expired = isTicketExpired(t.expiry_date);
                  const expiringSoon = isTicketExpiringSoon(t.expiry_date);

                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{t.ticket_type}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {t.expiry_date ? `Expires: ${t.expiry_date}` : 'No expiry set'}
                        </div>
                      </div>

                      {expired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-rose-700 border border-rose-300 font-bold text-[10px]">
                          <AlertTriangle className="w-3 h-3" />
                          EXPIRED
                        </span>
                      ) : expiringSoon ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-amber-700 border border-amber-300 font-bold text-[10px]">
                          EXPIRING SOON
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-emerald-700 border border-emerald-300 font-bold text-[10px]">
                          VALID
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rates & Bank Info */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>Remuneration & Banking</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Base Hourly Rate</span>
                <span className="font-bold text-slate-900 text-sm">
                  £{Number(operator.hourly_rate).toFixed(2)}/hr
                </span>
              </div>

              {currentRole === 'admin' ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500">Daily Equivalent Rate</span>
                    <span className="font-bold text-slate-800">
                      £{Number(operator.daily_rate).toFixed(2)}/day
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500">CIS / PAYE Tax Withholding</span>
                    <span className="font-bold text-slate-800">{operator.tax_rate_percent}%</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      Bank Details (Admin Restricted)
                    </p>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-[11px] text-slate-700">
                      <div>
                        Bank: <strong className="text-slate-900">{operator.bank_name || 'Not provided'}</strong>
                      </div>
                      <div>
                        Account Name:{' '}
                        <strong className="text-slate-900">{operator.bank_account_name || 'Not provided'}</strong>
                      </div>
                      <div>
                        Account No:{' '}
                        <strong className="text-slate-900 font-mono">
                          {operator.bank_account_number || '••••••••'}
                        </strong>
                      </div>
                      <div>
                        Sort Code:{' '}
                        <strong className="text-slate-900 font-mono">{operator.bank_sort_code || '••-••-••'}</strong>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <span>Day rates, tax % and banking information restricted to Admin users.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Timesheets History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <span>Logged Shifts History ({timesheets.length})</span>
                </h2>
                <p className="text-xs text-slate-500">Verified timesheet rows with rate snapshots.</p>
              </div>

              <QuickLogHoursModal
                operators={[operator]}
                jobs={allJobs}
                defaultOperatorId={operator.id}
                triggerLabel="+ Log Shift"
              />
            </div>

            {timesheets.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
                No shift entries logged for this operator yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-100 bg-slate-50/60 uppercase font-bold text-slate-400 tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Linked Job Site</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">Rate Applied</th>
                      <th className="px-4 py-3">Gross</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timesheets.map((ts) => {
                      const gross = Number(ts.hours) * Number(ts.rate_applied);
                      return (
                        <tr key={ts.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-700">{ts.date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {ts.job ? `${ts.job.client} — ${ts.job.site_name}` : 'Direct / Unassigned'}
                          </td>
                          <td className="px-4 py-3 font-bold text-indigo-600">{ts.hours} hrs</td>
                          <td className="px-4 py-3 text-slate-700">
                            £{Number(ts.rate_applied).toFixed(2)}/hr
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(gross)}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{ts.notes || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <EditTimesheetModal
                                timesheet={ts}
                                operators={[operator]}
                                jobs={allJobs}
                              />
                              <button
                                onClick={() => handleDeleteTimesheet(ts.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete timesheet"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
