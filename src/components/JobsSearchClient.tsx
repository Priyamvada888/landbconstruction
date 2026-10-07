'use client';

import { useMemo, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Job, JobStatus } from '@/types/database';
import { JobCardActions, JobRowActions } from '@/components/JobRowActions';

const STATUS_TABS = ['All', 'Draft', 'Filled', 'In Progress', 'Completed', 'Cancelled'];

const STATUS_BADGE: Record<JobStatus, string> = {
  'In Progress': 'text-emerald-700 border-emerald-300',
  Filled: 'text-blue-700 border-blue-300',
  Draft: 'text-amber-700 border-amber-300',
  Completed: 'text-slate-600 border-slate-300',
  Cancelled: 'text-rose-700 border-rose-300',
};

interface JobsSearchClientProps {
  jobs: Job[];
}

export function JobsSearchClient({ jobs }: JobsSearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const searchTerm = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? 'All';

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (!val || val === '' || (key === 'status' && val === 'All')) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const setSearchTerm = (val: string) => updateParams({ q: val });
  const setStatusFilter = (val: string) => updateParams({ status: val });

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch =
        !q ||
        job.site_name.toLowerCase().includes(q) ||
        job.client.toLowerCase().includes(q) ||
        (job.postcode && job.postcode.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (statusFilter !== 'All' && job.status !== statusFilter) return false;
      return true;
    });
  }, [jobs, searchTerm, statusFilter]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: jobs.length };
    STATUS_TABS.filter((s) => s !== 'All').forEach((s) => {
      counts[s] = jobs.filter((j) => j.status === s).length;
    });
    return counts;
  }, [jobs]);

  return (
    <div className="space-y-5">
      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 pt-1">
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 w-full lg:w-auto -mx-1 px-1">
          {STATUS_TABS.map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{s}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tabCounts[s] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-full lg:max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client, site, postcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none transition-colors shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Jobs List Cards (< md) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white text-slate-400 text-xs">
            No jobs found matching your filters.
          </div>
        ) : (
          filtered.map((job) => {
            const activeCount = (job.assignments || []).filter((a) => !a.unassigned_at).length;
            const isFilled = activeCount >= job.required_operator_count;
            return (
              <div key={job.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                    {job.client}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[job.status] || 'text-slate-700 border-slate-300'}`}
                  >
                    {job.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{job.site_name}</h3>
                {job.postcode && <p className="text-[11px] text-slate-400 mt-0.5">{job.postcode}</p>}
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span
                    className="font-semibold text-slate-700 truncate max-w-[170px]"
                    title={job.role_requirements?.map((r) => `${r.count}x ${r.role}`).join(', ')}
                  >
                    {job.role_requirements && job.role_requirements.length > 1
                      ? `${job.role_requirements.length} Roles (${job.role_requirements.map((r) => `${r.count}x ${r.role.replace(' Operator', '')}`).join(', ')})`
                      : job.required_role}
                  </span>
                  <span className={`font-bold text-[11px] ${isFilled ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {activeCount}/{job.required_operator_count} filled
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">£{job.pay_rate.toFixed(2)}/hr</span>
                    <span className="text-slate-400 text-[11px] ml-1">pay</span>
                  </div>
                </div>
                <JobCardActions job={job} />
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Jobs Table (>= md) */}
      <div className="hidden md:block rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Site / Client</th>
                <th className="px-4 py-3.5">Required Role</th>
                <th className="px-4 py-3.5">Fill Status</th>
                <th className="px-4 py-3.5">Pay / Charge Rate</th>
                <th className="px-4 py-3.5">Dates</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No jobs found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((job) => {
                  const activeCount = (job.assignments || []).filter((a) => !a.unassigned_at).length;
                  return (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{job.site_name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          <span className="text-indigo-500 font-semibold">{job.client}</span>
                          {job.postcode && <span> • {job.postcode}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]"
                          title={job.role_requirements?.map((r) => `${r.count}x ${r.role}`).join(', ')}
                        >
                          {job.role_requirements && job.role_requirements.length > 1
                            ? `${job.role_requirements.length} Roles (${job.role_requirements.map((r) => `${r.count}x ${r.role.replace(' Operator', '')}`).join(', ')})`
                            : job.required_role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              activeCount >= job.required_operator_count ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {activeCount}/{job.required_operator_count}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${
                                activeCount >= job.required_operator_count ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  Math.round((activeCount / job.required_operator_count) * 100),
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">
                          £{job.pay_rate.toFixed(2)}/hr{' '}
                          <span className="text-slate-400 font-normal">pay</span>
                        </div>
                        <div className="text-[11px] text-slate-400">£{job.charge_rate.toFixed(2)}/hr charge</div>
                      </td>
                      <td className="px-4 py-4 text-slate-500 text-[11px]">
                        <div>Start: {job.start_date}</div>
                        {job.end_date && <div>End: {job.end_date}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_BADGE[job.status] || 'text-slate-700 border-slate-300'}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <JobRowActions job={job} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
