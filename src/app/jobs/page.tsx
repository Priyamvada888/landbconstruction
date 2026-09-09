import Link from 'next/link';
import { DataStore, syncFromSupabase } from '@/lib/store';
import { QuickAddJobModal } from '@/components/QuickAddJobModal';
import { ChevronRight } from 'lucide-react';
import { JobStatus } from '@/types/database';

export const revalidate = 0;

export default async function JobsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  await syncFromSupabase();
  const params = await searchParams;
  const statusFilter = params.status || 'All';
  const query = (params.search || '').toLowerCase();

  const allJobs = DataStore.getJobs(true);

  const filtered = allJobs.filter((job) => {
    const matchesSearch =
      job.site_name.toLowerCase().includes(query) ||
      job.client.toLowerCase().includes(query) ||
      (job.postcode && job.postcode.toLowerCase().includes(query));

    if (!matchesSearch) return false;
    if (statusFilter !== 'All' && job.status !== statusFilter) return false;
    return true;
  });

  const statuses = ['All', 'Draft', 'Filled', 'In Progress', 'Completed', 'Cancelled'];

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'In Progress':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Filled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Draft':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Completed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Job Sites
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage client site contracts, required operators, and billing terms
          </p>
        </div>
        <QuickAddJobModal />
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 pt-1">
        {/* Modern Sleek Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 w-full lg:w-auto -mx-1 px-1">
          {statuses.map((s) => {
            const count = s === 'All' ? allJobs.length : allJobs.filter((j) => j.status === s).length;
            const active = statusFilter === s;
            return (
              <Link
                key={s}
                href={`/jobs?status=${s}${query ? `&search=${encodeURIComponent(query)}` : ''}`}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{s}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form method="GET" className="relative flex-1 max-w-full lg:max-w-sm">
          <input type="hidden" name="status" value={statusFilter} />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Search by client, site, postcode..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none transition-colors shadow-sm"
          />
        </form>
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
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                    {job.client}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      job.status
                    )}`}
                  >
                    {job.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {job.site_name}
                </h3>
                {job.postcode && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{job.postcode}</p>
                )}

                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{job.required_role}</span>
                  <span
                    className={`font-bold text-[11px] ${
                      isFilled ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {activeCount}/{job.required_operator_count} filled
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">£{job.pay_rate.toFixed(2)}/hr</span>
                    <span className="text-slate-400 text-[11px] ml-1">pay</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-indigo-600 text-xs">
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
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
                          <span className="text-[#6366f1] font-semibold">{job.client}</span>
                          {job.postcode && <span> • {job.postcode}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                          {job.required_role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              activeCount >= job.required_operator_count
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {activeCount}/{job.required_operator_count}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${
                                activeCount >= job.required_operator_count
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
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
                        <div className="text-[11px] text-slate-400">
                          £{job.charge_rate.toFixed(2)}/hr charge
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500 text-[11px]">
                        <div>Start: {job.start_date}</div>
                        {job.end_date && <div>End: {job.end_date}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="inline-flex items-center gap-1 font-bold text-[#6366f1] hover:text-indigo-800 transition-colors"
                        >
                          <span>View</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
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
