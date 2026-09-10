'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Building2,
  Users,
  Clock,
  Filter,
  ArrowUpDown,
  MoreVertical,
  ChevronRight,
  HardHat,
  CheckCircle2,
} from 'lucide-react';
import { Job, Operator, JobStatus } from '@/types/database';
import { QuickAddJobModal } from '@/components/QuickAddJobModal';
import { formatRelativeTime } from '@/lib/utils';

interface BoardViewProps {
  jobs: Job[];
  operators: Operator[];
}

export function BoardView({ jobs, operators }: BoardViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [sortBy, setSortBy] = useState<'updated' | 'client' | 'fill'>('updated');

  const operatorMap = useMemo(() => {
    return new Map(operators.map((op) => [op.id, op]));
  }, [operators]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        const matchesSearch =
          job.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (job.postcode && job.postcode.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        const isClosed = job.status === 'Completed' || job.status === 'Cancelled';

        if (statusFilter === 'Active') {
          return !isClosed;
        }
        if (statusFilter !== 'All') {
          return job.status === statusFilter;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'client') return a.client.localeCompare(b.client);
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      });
  }, [jobs, searchTerm, statusFilter, sortBy]);

  const activeJobs = jobs.filter((j) => j.status !== 'Completed' && j.status !== 'Cancelled');
  const totalRequired = activeJobs.reduce((acc, j) => acc + j.required_operator_count, 0);
  const totalAssigned = activeJobs.reduce(
    (acc, j) => acc + (j.assignments || []).filter((a) => !a.unassigned_at).length,
    0
  );

  const filterTabs = ['Active', 'Draft', 'Filled', 'In Progress', 'Completed', 'All'];

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
    <div className="space-y-6 text-slate-800">
      {/* Top Header Section (Matching Image 1: Title + Subtitle + Right Primary Button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Dashboard & Sites
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage and collaborate within your organization&apos;s site teams and plant allocations
          </p>
        </div>

        {/* Primary Action Button (Matching purple + Add button in Image 1) */}
        <div>
          <QuickAddJobModal />
        </div>
      </div>

      {/* Filter Tabs & Search / Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 pt-1">
        {/* Modern Sleek Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 w-full lg:w-auto -mx-1 px-1">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab;
            const count =
              tab === 'Active'
                ? activeJobs.length
                : tab === 'All'
                ? jobs.length
                : jobs.filter((j) => j.status === tab).length;

            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar + Filters + Sort controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 max-w-full lg:max-w-lg">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search sites, clients, postcodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none transition-colors shadow-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'updated' ? 'client' : 'updated')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">Sort: {sortBy}</span>
          </button>
        </div>
      </div>

      {/* Clean Minimal Site Cards */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No sites found</h3>
          <p className="text-xs text-slate-400 mt-1">Try selecting another filter or post a new site requirement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => {
            const activeAssignments = (job.assignments || []).filter((a) => !a.unassigned_at);
            const assignedCount = activeAssignments.length;
            const requiredCount = job.required_operator_count;
            const isFilled = assignedCount >= requiredCount;

            return (
              <div
                key={job.id}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Client badge and status */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                      {job.client}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {/* Site Name & Postcode */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {job.site_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {job.postcode || 'North West UK'}
                  </p>

                  {/* Role Requirement Pill */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{job.required_role}</span>
                      <span
                        className={`font-bold ${
                          isFilled ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {assignedCount} of {requiredCount} filled
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFilled ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{
                          width: `${Math.min(Math.round((assignedCount / requiredCount) * 100), 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Assigned Operators list */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Assigned Operators ({assignedCount})
                    </p>
                    {activeAssignments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-2 rounded-lg bg-slate-50">
                        Awaiting candidate assignment
                      </p>
                    ) : (
                      activeAssignments.map((asg) => {
                        const op = operatorMap.get(asg.operator_id);
                        if (!op) return null;
                        return (
                          <div
                            key={asg.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center border border-slate-200">
                                {op.name.charAt(0)}
                              </div>
                              <span className="font-semibold text-slate-800">{op.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">£{job.pay_rate.toFixed(2)}/hr</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatRelativeTime(job.updated_at || job.created_at)}
                  </span>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex items-center gap-1 font-bold text-slate-900 hover:text-slate-700"
                  >
                    <span>Manage Site</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
