'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Calendar,
  Phone,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  Edit3,
  ChevronDown,
} from 'lucide-react';
import { Job, Operator, Timesheet, JobStatus, JobAssignment, OperatorRole } from '@/types/database';
import {
  assignOperatorAction,
  unassignOperatorAction,
  updateJobStatusAction,
  deleteTimesheetAction,
} from '@/lib/actions';
import { QuickLogHoursModal } from '@/components/QuickLogHoursModal';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface JobDetailClientProps {
  job: Job & { active_assignments: JobAssignment[] };
  suggestedCandidates: Operator[];
  overrideCandidates: Operator[];
  timesheets: Timesheet[];
  allOperators: Operator[];
  financials: {
    totalHours: number;
    revenue: number;
    cost: number;
    margin: number;
    marginPercent: number;
    entryCount: number;
  };
}

export function JobDetailClient({
  job,
  suggestedCandidates,
  overrideCandidates,
  timesheets,
  allOperators,
  financials,
}: JobDetailClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showOverrideList, setShowOverrideList] = useState(false);
  const [selectedOverrideId, setSelectedOverrideId] = useState<string>('');

  const roleRequirements = job.role_requirements && job.role_requirements.length > 0
    ? job.role_requirements
    : [{ role: job.required_role, count: job.required_operator_count, start_date: job.start_date }];

  const totalOpenings = roleRequirements.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
  const activeAssignments = job.active_assignments || [];
  const assignedCount = activeAssignments.length;
  const remainingOpenings = Math.max(0, totalOpenings - assignedCount);
  const isFilled = assignedCount >= totalOpenings;
  const fillPercentage = totalOpenings > 0 ? Math.round((assignedCount / totalOpenings) * 100) : 0;

  const handleStatusChange = (newStatus: JobStatus) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateJobStatusAction(job.id, newStatus);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update status');
      }
    });
  };

  const handleAssign = (operatorId: string, assignedRole?: OperatorRole, startDate?: string | null) => {
    setError(null);
    startTransition(async () => {
      try {
        await assignOperatorAction(job.id, operatorId, assignedRole, startDate);
        setSelectedOverrideId('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to assign operator');
      }
    });
  };

  const handleUnassign = (operatorId: string) => {
    if (!confirm('Are you sure you want to unassign this operator?')) return;
    setError(null);
    startTransition(async () => {
      try {
        await unassignOperatorAction(job.id, operatorId);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to unassign operator');
      }
    });
  };

  const handleDeleteTimesheet = (id: string) => {
    if (!confirm('Are you sure you want to delete this timesheet entry?')) return;
    startTransition(async () => {
      await deleteTimesheetAction(id);
    });
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'In Progress':
        return 'text-emerald-700 border-emerald-300';
      case 'Filled':
        return 'text-blue-700 border-blue-300';
      case 'Draft':
        return 'text-amber-700 border-amber-300';
      case 'Completed':
        return 'text-slate-600 border-slate-300';
      case 'Cancelled':
        return 'text-rose-700 border-rose-300';
      default:
        return 'text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/80 pb-4 sm:pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/jobs" className="text-xs font-semibold text-slate-500 hover:text-slate-900">
              Jobs
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-indigo-600 font-semibold">{job.client}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span>{job.site_name}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(job.status)}`}>
              {job.status}
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {job.postcode || 'No postcode'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Start: {job.start_date} {job.end_date ? `to ${job.end_date}` : ''}
            </span>
            {job.site_contact_name && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Contact: {job.site_contact_name} ({job.site_contact_phone || 'No phone'})
              </span>
            )}
          </div>
        </div>

        {/* Status Control */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-1.5 shadow-sm">
            <span className="text-xs text-slate-500 px-2 font-medium">Status:</span>
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
              disabled={isPending}
              className="bg-slate-50 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1 border border-slate-200 focus:border-indigo-600 focus:bg-white focus:outline-none"
            >
              <option value="Draft">Draft</option>
              <option value="Filled">Filled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <QuickLogHoursModal
            operators={allOperators}
            jobs={[job]}
            defaultJobId={job.id}
            triggerLabel="Log Hours for Site"
            triggerClassName="touch-target inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Staffing Openings & Role Types - Mobile Structured Compact Card (< sm) */}
      <div className="sm:hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm space-y-3">
        {/* 3 Compact KPI Columns */}
        <div className="grid grid-cols-3 gap-1 divide-x divide-slate-100">
          {/* Total */}
          <div className="text-center px-1">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-0.5">
              <Users className="w-3 h-3 text-indigo-600" />
              <span>Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-tight">{totalOpenings}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Openings</p>
          </div>

          {/* Filled */}
          <div className="text-center px-1 pl-1.5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-0.5">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>Filled</span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <p className="text-2xl font-bold text-emerald-600 leading-tight">{assignedCount}</p>
              <span className="text-[11px] font-semibold text-slate-400">/{totalOpenings}</span>
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <div className="w-10 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, fillPercentage)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-emerald-600">{fillPercentage}%</span>
            </div>
          </div>

          {/* Open */}
          <div className="text-center px-1 pl-1.5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-0.5">
              <AlertCircle className={`w-3 h-3 ${remainingOpenings > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>Open</span>
            </div>
            <p className={`text-2xl font-bold leading-tight ${remainingOpenings > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {remainingOpenings}
            </p>
            <span
              className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                remainingOpenings === 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {remainingOpenings === 0 ? 'Full' : `${remainingOpenings} left`}
            </span>
          </div>
        </div>

        {/* Role Types Breakdown - Dropdown */}
        {roleRequirements.length > 0 && (
          <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-shrink-0">Roles:</span>
            <div className="relative flex-1 min-w-0">
              <select
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-7 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              >
                {roleRequirements.map((r, i) => {
                  const roleFilled = activeAssignments.filter(
                    (a) => (a.assigned_role || a.operator?.primary_role) === r.role
                  ).length;
                  const statusText = roleFilled >= r.count ? 'Filled' : `${roleFilled}/${r.count} filled`;
                  return (
                    <option key={i} value={r.role}>
                      {r.count}x {r.role} ({statusText})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Staffing Openings & Role Types - Tablet / Desktop Grid (>= sm) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Openings */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Total Openings</p>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{totalOpenings}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total operators required on site</p>
          </div>
        </div>

        {/* Filled Openings */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Filled Openings</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{assignedCount}</p>
              <span className="text-xs font-semibold text-slate-400">/ {totalOpenings}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, fillPercentage)}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-emerald-600">{fillPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Open Positions Needed */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Open Positions</p>
            <div
              className={`p-1.5 rounded-lg ${
                remainingOpenings > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p
              className={`text-2xl sm:text-3xl font-bold ${
                remainingOpenings > 0 ? 'text-amber-600' : 'text-slate-700'
              }`}
            >
              {remainingOpenings}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {remainingOpenings === 0 ? 'Site is fully staffed' : `${remainingOpenings} position(s) to fill`}
            </p>
          </div>
        </div>

        {/* Role Types in Site */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Required Role Types</p>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {roleRequirements.length} {roleRequirements.length === 1 ? 'Role' : 'Roles'}
            </span>
          </div>
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto pr-1">
            {roleRequirements.map((r, i) => {
              const roleFilled = activeAssignments.filter(
                (a) => (a.assigned_role || a.operator?.primary_role) === r.role
              ).length;
              const roleComplete = roleFilled >= r.count;
              return (
                <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-50 last:border-0">
                  <span className="font-semibold text-slate-800 truncate" title={r.role}>
                    {r.count}x {r.role}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      roleComplete
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {roleFilled}/{r.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Assignments & Candidate Matching */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Placements */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <span>Current Operator Placements</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requirements:{' '}
                  <strong className="text-slate-800">
                    {roleRequirements.map((r) => `${r.count}x ${r.role}${r.start_date ? ` (${r.start_date})` : ''}`).join(' • ')}
                  </strong>{' '}
                  •{' '}
                  <span className={isFilled ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                    {assignedCount} of {totalOpenings} filled
                  </span>
                </p>
              </div>
            </div>

            {activeAssignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">No operators assigned yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Choose from suggested candidates below or use the manual override.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAssignments.map((asg) => {
                  const op = asg.operator;
                  if (!op) return null;
                  return (
                    <div
                      key={asg.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200">
                          {op.name.charAt(0)}
                        </div>
                        <div>
                          <Link
                            href={`/operators/${op.id}`}
                            className="font-bold text-sm text-slate-900 hover:underline transition-colors"
                          >
                            {op.name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            Role: <strong className="text-slate-800">{asg.assigned_role || op.primary_role}</strong> • {op.experience_years} yrs exp • {op.location || 'UK'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-mono">
                              Assigned {formatRelativeTime(asg.assigned_at)}
                            </span>
                            {asg.start_date && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                                Start: {asg.start_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnassign(op.id)}
                        disabled={isPending}
                        className="touch-target inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Unassign</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Candidate Matching */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  <span>Suggested Candidates ({suggestedCandidates.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Matches needed site role(s) ({roleRequirements.map((r) => r.role).join(', ')}) and availability status is Available,
                  Starting Soon, or Working.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowOverrideList(!showOverrideList)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
              >
                {showOverrideList ? 'Hide Full Roster' : 'Show All Operators (Override)'}
              </button>
            </div>

            {/* Suggested Candidates Grid */}
            {suggestedCandidates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-6 text-center text-xs text-amber-800">
                No matching available operators found for &ldquo;{job.required_role}&rdquo;. Use the manual override below to assign an operator from another trade or status.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/operators/${cand.id}`}
                          className="font-bold text-sm text-slate-900 hover:underline"
                        >
                          {cand.name}
                        </Link>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-700 border border-emerald-300">
                          {cand.availability_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cand.experience_years} yrs exp • {cand.location || 'North West'}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Base: £{cand.hourly_rate}/hr • Tickets: {(cand.tickets || []).length}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const matchingReq = roleRequirements.find((r) => r.role === cand.primary_role);
                        handleAssign(cand.id, matchingReq?.role || cand.primary_role, matchingReq?.start_date || job.start_date);
                      }}
                      disabled={isPending}
                      className="w-full mt-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assign to Site</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual Override Candidate Selector */}
            {showOverrideList && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3 min-w-0">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Manual Override Assignment</span>
                </div>
                <p className="text-xs text-slate-600">
                  Select any operator in the system regardless of primary role or current availability. This
                  is a deliberate manual recruiter override.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 min-w-0 items-stretch sm:items-center">
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedOverrideId}
                      onChange={(e) => setSelectedOverrideId(e.target.value)}
                      className="w-full max-w-full truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                    >
                      <option value="">-- Choose Operator from Full Roster --</option>
                      {overrideCandidates.map((cand) => (
                        <option key={cand.id} value={cand.id}>
                          {cand.name} — {cand.primary_role} ({cand.availability_status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      if (!selectedOverrideId) return;
                      const selectedOp = allOperators.find((o) => o.id === selectedOverrideId);
                      const matchingReq = roleRequirements.find((r) => r.role === selectedOp?.primary_role);
                      handleAssign(selectedOverrideId, matchingReq?.role || selectedOp?.primary_role, matchingReq?.start_date || job.start_date);
                    }}
                    disabled={!selectedOverrideId || isPending}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors shrink-0"
                  >
                    Force Assign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Site Details & Job Notes */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Site Specifications</h2>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Client Organisation</span>
                <span className="font-bold text-slate-900 text-sm">{job.client}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Site Location & Postcode</span>
                <span className="font-semibold text-slate-800">
                  {job.site_name} ({job.postcode || 'N/A'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Site Contact</span>
                <span className="font-semibold text-slate-800">
                  {job.site_contact_name || 'None listed'} • {job.site_contact_phone || 'No phone'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Operational Notes</span>
                <p className="text-slate-600 leading-relaxed">
                  {job.notes || 'No specific machine or tooling notes entered.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timesheets Logged Against this Job */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>Timesheet Shifts Logged on this Site ({timesheets.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete shift log for billing client and paying operators.
            </p>
          </div>

          <QuickLogHoursModal
            operators={allOperators}
            jobs={[job]}
            defaultJobId={job.id}
            triggerLabel="+ Log Shift Hours"
          />
        </div>

        {timesheets.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
            No shift hours logged against this site yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/60 uppercase font-bold text-slate-400 tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Rate Applied</th>
                  <th className="px-4 py-3">Shift Notes</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timesheets.map((ts) => {
                  const lineCost = Number(ts.hours) * Number(ts.rate_applied);
                  return (
                    <tr key={ts.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-700">{ts.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {ts.operator?.name || 'Operator'}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-600">{ts.hours} hrs</td>
                      <td className="px-4 py-3 text-slate-700">£{Number(ts.rate_applied).toFixed(2)}/hr</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{ts.notes || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        {formatCurrency(lineCost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteTimesheet(ts.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
  );
}
