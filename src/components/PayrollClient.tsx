'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PoundSterling,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Eye,
  X,
  Building2,
  HardHat,
  ShieldAlert,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { CompanyPayrollReport, OperatorPayrollSummary, UserRole } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { generatePayrollCsv } from '@/lib/csv-export';

interface PayrollClientProps {
  report: CompanyPayrollReport;
  periodType: 'weekly' | 'monthly';
  offset: number;
  currentRole: UserRole;
}

export function PayrollClient({
  report,
  periodType,
  offset,
  currentRole,
}: PayrollClientProps) {
  const router = useRouter();
  const [selectedOperatorSummary, setSelectedOperatorSummary] = useState<OperatorPayrollSummary | null>(null);

  // If user is staff, show access denied notice per Section 6.4
  if (currentRole !== 'admin') {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center max-w-xl mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Access Denied: Administrator Only</h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          The Payroll module contains sensitive remuneration rates, gross/net pay, and company financial
          audits. Your current login role is <strong className="text-amber-400">Staff</strong>.
        </p>
        <p className="text-xs text-slate-400 mt-3">
          To inspect this view, switch to <span className="font-semibold text-white">Admin View</span> using the
          role toggle in the top header.
        </p>
      </div>
    );
  }

  const navigatePeriod = (newOffset: number) => {
    router.push(`/payroll?type=${periodType}&offset=${newOffset}`);
  };

  const switchType = (type: 'weekly' | 'monthly') => {
    router.push(`/payroll?type=${type}&offset=0`);
  };

  const handleDownloadCsv = () => {
    const csvContent = generatePayrollCsv(report);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_${periodType}_${report.start_date}_to_${report.end_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              Admin Only
            </span>
            <span className="text-xs text-slate-400">• Wages & CIS Remuneration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Payroll & Labour Costs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Calculate operator gross pay, CIS tax withholdings, and net payable disbursements.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4 text-slate-300" />
          <span>Export Payroll CSV</span>
        </button>
      </div>

      {/* Period Selection & Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-sm">
        {/* Toggle: Weekly vs Monthly */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs">
          <button
            onClick={() => switchType('weekly')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              periodType === 'weekly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Weekly Periods
          </button>
          <button
            onClick={() => switchType('monthly')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              periodType === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Monthly Periods
          </button>
        </div>

        {/* Prev / Next Period Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigatePeriod(offset - 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            title="Previous Period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>{report.period_label}</span>
          </div>

          <button
            onClick={() => navigatePeriod(offset + 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            title="Next Period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {offset !== 0 && (
            <button
              onClick={() => navigatePeriod(0)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 ml-1 underline"
            >
              Current Period
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Hours Worked</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report.total_hours.toFixed(1)} hrs</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{report.operator_summaries.length} active operators</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Gross Pay</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(report.total_gross)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pre-tax labour cost</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total CIS / Tax Withheld</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(report.total_tax)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">HMRC statutory deduction</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Net Payable</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(report.total_net)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Operator bank transfer sum</p>
        </div>
      </div>

      {/* Mobile & Tablet Payroll Cards (< lg) */}
      <div className="lg:hidden space-y-3">
        {report.operator_summaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white text-slate-400 text-xs">
            No shifts or timesheets recorded for this {periodType} period ({report.period_label}).
          </div>
        ) : (
          report.operator_summaries.map((s) => (
            <div
              key={s.operator.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/operators/${s.operator.id}`}
                    className="font-bold text-slate-900 text-sm hover:underline block"
                  >
                    {s.operator.name}
                  </Link>
                  <span className="text-[11px] text-slate-400 block">
                    {s.operator.primary_role} • {s.operator.bank_name || 'Bank N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-emerald-600 block">
                    {formatCurrency(s.net_pay)}
                  </span>
                  <span className="text-[10px] text-slate-400">Net Payable</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Hours</span>
                  <span className="font-bold text-slate-900">{s.total_hours.toFixed(1)} hrs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Gross</span>
                  <span className="font-bold text-slate-900">{formatCurrency(s.gross_pay)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">CIS Tax</span>
                  <span className="font-medium text-rose-600">{formatCurrency(s.tax_amount)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Rate: <strong className="text-slate-700 font-semibold">{s.rate_display}</strong>
                </span>
                <button
                  onClick={() => setSelectedOperatorSummary(s)}
                  className="inline-flex items-center gap-1 font-bold text-slate-900 hover:text-slate-700 text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Breakdown</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Summary Table (>= lg) */}
      <div className="hidden lg:block rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/60 uppercase font-bold text-slate-400 tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Operator</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Total Hours</th>
                <th className="px-4 py-3.5">Rate Column</th>
                <th className="px-4 py-3.5">Gross Pay</th>
                <th className="px-4 py-3.5">Tax Amount</th>
                <th className="px-4 py-3.5">Net Payable</th>
                <th className="px-4 py-3.5 text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.operator_summaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No shifts or timesheets recorded for this {periodType} period ({report.period_label}).
                  </td>
                </tr>
              ) : (
                report.operator_summaries.map((s) => (
                  <tr key={s.operator.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/operators/${s.operator.id}`}
                        className="font-bold text-slate-900 hover:underline transition-colors"
                      >
                        {s.operator.name}
                      </Link>
                      <div className="text-[11px] text-slate-400">{s.operator.bank_name || 'Bank N/A'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{s.operator.primary_role}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{s.total_hours.toFixed(1)} hrs</td>
                    <td className="px-4 py-3.5">
                      {s.rate_display === 'Mixed rates' ? (
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          Mixed rates
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-700">{s.rate_display}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(s.gross_pay)}</td>
                    <td className="px-4 py-3.5 font-medium text-rose-600">
                      {formatCurrency(s.tax_amount)}{' '}
                      <span className="text-[10px] text-slate-400">({s.operator.tax_rate_percent}%)</span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-emerald-600 text-sm">
                      {formatCurrency(s.net_pay)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedOperatorSummary(s)}
                        className="inline-flex items-center gap-1 font-bold text-slate-900 hover:text-slate-700 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Breakdown</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Footer Row */}
            {report.operator_summaries.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs text-slate-900">
                <tr>
                  <td className="px-4 py-3.5">PERIOD TOTALS</td>
                  <td className="px-4 py-3.5">{report.operator_summaries.length} operators</td>
                  <td className="px-4 py-3.5">{report.total_hours.toFixed(1)} hrs</td>
                  <td className="px-4 py-3.5">—</td>
                  <td className="px-4 py-3.5">{formatCurrency(report.total_gross)}</td>
                  <td className="px-4 py-3.5 text-rose-600">{formatCurrency(report.total_tax)}</td>
                  <td className="px-4 py-3.5 text-emerald-600 text-sm">{formatCurrency(report.total_net)}</td>
                  <td className="px-4 py-3.5 text-right">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Per-Operator Daily Breakdown Modal */}
      {selectedOperatorSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-indigo-600" />
                  <span>{selectedOperatorSummary.operator.name} — Remuneration Breakdown</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedOperatorSummary.operator.primary_role} • {report.period_label}
                </p>
              </div>
              <button
                onClick={() => setSelectedOperatorSummary(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Operator Remuneration Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Total Shift Hours</span>
                <span className="text-base font-bold text-slate-900">
                  {selectedOperatorSummary.total_hours.toFixed(1)} hrs
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Gross Pay</span>
                <span className="text-base font-bold text-indigo-600">
                  {formatCurrency(selectedOperatorSummary.gross_pay)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Tax Withheld ({selectedOperatorSummary.operator.tax_rate_percent}%)</span>
                <span className="text-base font-bold text-rose-600">
                  {formatCurrency(selectedOperatorSummary.tax_amount)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Net Payable</span>
                <span className="text-base font-bold text-emerald-600">
                  {formatCurrency(selectedOperatorSummary.net_pay)}
                </span>
              </div>
            </div>

            {/* Banking Details preview */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                Bank: <strong className="text-slate-900">{selectedOperatorSummary.operator.bank_name || 'N/A'}</strong>
              </div>
              <div>
                Account: <strong className="text-slate-900 font-mono">{selectedOperatorSummary.operator.bank_account_number || '••••••••'}</strong>
              </div>
              <div>
                Sort Code: <strong className="text-slate-900 font-mono">{selectedOperatorSummary.operator.bank_sort_code || '••-••-••'}</strong>
              </div>
            </div>

            {/* Per-Day Breakdown Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50 uppercase font-bold text-slate-400 text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Linked Job Site</th>
                    <th className="px-3 py-2.5">Hours</th>
                    <th className="px-3 py-2.5">Rate Applied</th>
                    <th className="px-3 py-2.5">Gross</th>
                    <th className="px-3 py-2.5">Tax</th>
                    <th className="px-3 py-2.5 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedOperatorSummary.entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5 font-mono text-slate-700">{entry.date}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{entry.job_title}</td>
                      <td className="px-3 py-2.5 font-bold text-indigo-600">{entry.hours} hrs</td>
                      <td className="px-3 py-2.5 text-slate-700">£{entry.rate_applied.toFixed(2)}/hr</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800">{formatCurrency(entry.gross)}</td>
                      <td className="px-3 py-2.5 text-rose-600">{formatCurrency(entry.tax)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                        {formatCurrency(entry.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOperatorSummary(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
