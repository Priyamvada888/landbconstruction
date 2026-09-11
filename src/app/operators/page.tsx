import Link from 'next/link';
import { DataStore, syncFromSupabase } from '@/lib/store';
import { CreateOperatorModal } from '@/components/CreateOperatorModal';
import { OperatorRowActions, OperatorCardActions } from '@/components/OperatorRowActions';
import {
  Search,
  ArrowUpDown,
  ChevronRight,
} from 'lucide-react';
import { AvailabilityStatus } from '@/types/database';

export const revalidate = 0;

export default async function OperatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; role?: string }>;
}) {
  await syncFromSupabase();
  const params = await searchParams;
  const currentRole = DataStore.getSessionRole();
  const allOperators = DataStore.getOperators(false);

  const query = (params.search || '').toLowerCase();
  const statusFilter = params.status || 'Active';

  const filtered = allOperators.filter((op) => {
    const matchesSearch =
      op.name.toLowerCase().includes(query) ||
      (op.phone && op.phone.toLowerCase().includes(query)) ||
      (op.current_company && op.current_company.toLowerCase().includes(query)) ||
      (op.location && op.location.toLowerCase().includes(query));

    if (!matchesSearch) return false;
    if (statusFilter === 'Active') return op.availability_status !== 'Do Not Use';
    if (statusFilter !== 'All') return op.availability_status === statusFilter;
    return true;
  });

  const filterTabs = ['Active', 'Available', 'Working', 'Starting Soon', 'On Leave', 'All'];

  const getStatusColor = (status: AvailabilityStatus) => {
    switch (status) {
      case 'Available': return 'text-emerald-600';
      case 'Working': return 'text-blue-600';
      case 'Starting Soon': return 'text-amber-600';
      case 'On Leave': return 'text-slate-500';
      case 'Do Not Use': return 'text-rose-600';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Header Section (Exact Match to Image 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Operators
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage and collaborate within your organization&apos;s plant operators and civil engineering teams
          </p>
        </div>

        {/* Primary Action Button (Purple + Add member matching Image 1) */}
        <div>
          <CreateOperatorModal currentRole={currentRole} />
        </div>
      </div>

      {/* Filter Tabs & Search / Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 pt-1">
        {/* Modern Sleek Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 w-full lg:w-auto -mx-1 px-1">
          {filterTabs.map((tab) => {
            const active = statusFilter === tab;
            const count = tab === 'All' ? allOperators.length : allOperators.filter((o) => o.availability_status === tab).length;
            return (
              <Link
                key={tab}
                href={`/operators?status=${tab}${query ? `&search=${encodeURIComponent(query)}` : ''}`}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab}</span>
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

        {/* Search Bar + Filters + Sort controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 max-w-full lg:max-w-lg">
          <form method="GET" className="relative flex-1 min-w-[160px]">
            <input type="hidden" name="status" value={statusFilter} />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={params.search || ''}
              placeholder="Search operators, phone, location..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none transition-colors shadow-sm"
            />
          </form>
        </div>
      </div>

      {/* Mobile & Tablet Operator Cards (< lg) */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white text-slate-400 text-xs">
                        No operators found matching your criteria.
          </div>
        ) : (
          filtered.map((op) => {
            return (
              <div
                key={op.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-slate-200">
                      {op.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{op.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{op.primary_role}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{op.phone || op.location || 'North West UK'}</p>
                    </div>
                  </div>

                  <span className={`text-[11px] font-semibold ${getStatusColor(op.availability_status)}`}>
                    {op.availability_status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                  <span>Pay: £{Number(op.hourly_rate ?? 0).toFixed(2)}/hr</span>
                </div>

                <OperatorCardActions operator={op} currentRole={currentRole} />
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (>= lg) */}
      <div className="hidden lg:block rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-[#6366f1] focus:ring-[#6366f1]"
                  />
                </th>
                <th className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700">
                    <span>Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700">
                    <span>Registered Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700">
                    <span>Job Title / Primary Role</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700">
                    <span>Availability Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                No operators found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((op) => {
                  const dateStr = new Date(op.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={op.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-[#6366f1] focus:ring-[#6366f1]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200">
                            {op.name.charAt(0)}
                          </div>
                          <div>
                            <Link
                              href={`/operators/${op.id}`}
                              className="font-bold text-slate-900 group-hover:text-[#6366f1] transition-colors"
                            >
                              {op.name}
                            </Link>
                            <p className="text-[11px] text-slate-400">
                              {op.phone || op.location || 'North West UK'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {op.primary_role}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold ${getStatusColor(op.availability_status)}`}>
                          {op.availability_status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <OperatorRowActions operator={op} currentRole={currentRole} />
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
