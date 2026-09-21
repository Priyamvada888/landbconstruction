'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { Operator, AvailabilityStatus, UserRole } from '@/types/database';
import { OperatorRowActions, OperatorCardActions } from '@/components/OperatorRowActions';

const STATUS_TABS = ['Active', 'Available', 'Working', 'Starting Soon', 'On Leave', 'All'];

const STATUS_COLOR: Record<string, string> = {
  Available: 'text-emerald-600',
  Working: 'text-blue-600',
  'Starting Soon': 'text-amber-600',
  'On Leave': 'text-slate-500',
  'Do Not Use': 'text-rose-600',
};

interface OperatorsSearchClientProps {
  operators: Operator[];
  currentRole: UserRole;
}

/**
 * Haversine formula to compute great-circle distance between two lat/lon points in miles.
 */
function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Extracts a UK postcode or outward code from an Operator's stored data.
 */
function extractLocationCode(op: Operator): string | null {
  if (op.postcode && op.postcode.trim()) {
    return op.postcode.trim().toUpperCase();
  }
  const fullText = `${op.location || ''} ${op.address || ''}`;
  // 1. Full UK postcode (e.g. SS16 6RE, LS8 2AB, M4 1PD, SG12 8LG)
  const fullMatch = fullText.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})\b/i);
  if (fullMatch) return fullMatch[1].trim().toUpperCase();
  // 2. Outcode inside parentheses e.g. "Leeds (LS1)", "Bolton (BL1)", "Stockport (SK1)"
  const bracketMatch = fullText.match(/\(([A-Z]{1,2}[0-9][A-Z0-9]?)\)/i);
  if (bracketMatch) return bracketMatch[1].trim().toUpperCase();
  // 3. Fallback: match standalone outcode word
  const wordMatch = fullText.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?)\b/i);
  if (wordMatch) return wordMatch[1].trim().toUpperCase();
  return null;
}

// Global cache for geocoded coordinates to avoid redundant network lookups
const coordinatesCache = new Map<string, { lat: number; lon: number } | null>();

/**
 * Geocode a single postcode or outcode using postcodes.io
 */
async function fetchCoordinates(rawCode: string): Promise<{ lat: number; lon: number } | null> {
  const code = rawCode.trim().toUpperCase();
  const normalized = code.replace(/\s+/g, '');
  if (coordinatesCache.has(normalized)) {
    return coordinatesCache.get(normalized) || null;
  }

  // 1. Try full postcode lookup
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(code)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.result?.latitude && data.result?.longitude) {
        const coords = { lat: data.result.latitude, lon: data.result.longitude };
        coordinatesCache.set(normalized, coords);
        return coords;
      }
    }
  } catch {
    // continue to outcode fallback
  }

  // 2. Try outward code lookup (e.g. SK1, LS1, M2)
  const outcode = code.split(' ')[0];
  try {
    const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.result?.latitude && data.result?.longitude) {
        const coords = { lat: data.result.latitude, lon: data.result.longitude };
        coordinatesCache.set(normalized, coords);
        return coords;
      }
    }
  } catch {
    // ignore
  }

  coordinatesCache.set(normalized, null);
  return null;
}

/**
 * Bulk resolve coordinates for operators in the list
 */
async function resolveOperatorCoordinates(operators: Operator[]): Promise<Record<string, { lat: number; lon: number }>> {
  const result: Record<string, { lat: number; lon: number }> = {};
  const missingCodes: string[] = [];
  const opCodeMap: Record<string, string> = {};

  for (const op of operators) {
    const code = extractLocationCode(op);
    if (!code) continue;
    opCodeMap[op.id] = code;
    const norm = code.replace(/\s+/g, '');
    if (coordinatesCache.has(norm)) {
      const cached = coordinatesCache.get(norm);
      if (cached) result[op.id] = cached;
    } else {
      missingCodes.push(code);
    }
  }

  if (missingCodes.length > 0) {
    const fullPostcodes = missingCodes.filter((c) => /\s/.test(c) || c.length >= 5);
    const outcodes = missingCodes.filter((c) => !/\s/.test(c) && c.length < 5);

    // 1. Bulk query full postcodes
    if (fullPostcodes.length > 0) {
      try {
        const bulkRes = await fetch('https://api.postcodes.io/postcodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcodes: Array.from(new Set(fullPostcodes)).slice(0, 100) }),
        });
        if (bulkRes.ok) {
          const bulkData = await bulkRes.json();
          (bulkData.result || []).forEach(
            (item: { query: string; result: { latitude: number; longitude: number } | null }) => {
              const norm = item.query.replace(/\s+/g, '');
              if (item.result) {
                coordinatesCache.set(norm, { lat: item.result.latitude, lon: item.result.longitude });
              } else {
                // If full postcode wasn't found in bulk, queue its outward code
                outcodes.push(item.query.split(' ')[0]);
              }
            }
          );
        }
      } catch {
        // continue
      }
    }

    // 2. Resolve outcodes concurrently
    const uniqueOutcodes = Array.from(new Set(outcodes));
    await Promise.all(
      uniqueOutcodes.map(async (oc) => {
        const norm = oc.replace(/\s+/g, '');
        if (coordinatesCache.has(norm)) return;
        try {
          const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(oc)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.result?.latitude && data.result?.longitude) {
              coordinatesCache.set(norm, { lat: data.result.latitude, lon: data.result.longitude });
            }
          }
        } catch {
          // ignore
        }
      })
    );

    // 3. Assign resolved coordinates to operator ids
    for (const op of operators) {
      const code = opCodeMap[op.id];
      if (!code) continue;
      const norm = code.replace(/\s+/g, '');
      const coords = coordinatesCache.get(norm) || coordinatesCache.get(code.split(' ')[0]);
      if (coords) result[op.id] = coords;
    }
  }

  return result;
}

export function OperatorsSearchClient({ operators, currentRole }: OperatorsSearchClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');

  // Postcode radius search state (Iconless)
  const [postcodeInput, setPostcodeInput] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(20);
  const [activeRadiusSearch, setActiveRadiusSearch] = useState<{ postcode: string; radiusMiles: number } | null>(null);
  const [operatorDistances, setOperatorDistances] = useState<Record<string, number> | null>(null);
  const [postcodeError, setPostcodeError] = useState<string | null>(null);
  const [isSearchingPostcode, startPostcodeTransition] = useTransition();

  // Filtered and sorted operators
  const filtered = useMemo(() => {
    let list = operators.filter((op) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        op.name.toLowerCase().includes(q) ||
        (op.phone && op.phone.toLowerCase().includes(q)) ||
        (op.primary_role && op.primary_role.toLowerCase().includes(q)) ||
        (op.current_company && op.current_company.toLowerCase().includes(q)) ||
        (op.location && op.location.toLowerCase().includes(q)) ||
        (op.postcode && op.postcode.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'Active') {
        if (op.availability_status === 'Do Not Use') return false;
      } else if (statusFilter !== 'All') {
        if (op.availability_status !== statusFilter) return false;
      }

      // Postcode radius filter
      if (activeRadiusSearch && operatorDistances) {
        const dist = operatorDistances[op.id];
        if (dist === undefined || dist > activeRadiusSearch.radiusMiles) {
          return false;
        }
      }

      return true;
    });

    // If postcode radius search is active, sort by distance ascending (closest first)
    if (activeRadiusSearch && operatorDistances) {
      list = [...list].sort((a, b) => {
        const da = operatorDistances[a.id] ?? 999999;
        const db = operatorDistances[b.id] ?? 999999;
        return da - db;
      });
    }

    return list;
  }, [operators, searchTerm, statusFilter, activeRadiusSearch, operatorDistances]);

  const handlePostcodeSearch = () => {
    const pc = postcodeInput.trim();
    if (!pc) return;
    setPostcodeError(null);

    startPostcodeTransition(async () => {
      try {
        // 1. Geocode the searched postcode / outcode
        const targetCoords = await fetchCoordinates(pc);
        if (!targetCoords) {
          setPostcodeError(`Could not find coordinates for "${pc}". Please enter a valid UK postcode or area code (e.g. M2 3AE or SK1).`);
          return;
        }

        // 2. Resolve coordinates of all operators
        const opCoordsMap = await resolveOperatorCoordinates(operators);
        const distances: Record<string, number> = {};

        for (const op of operators) {
          const coords = opCoordsMap[op.id];
          if (coords) {
            const d = distanceMiles(targetCoords.lat, targetCoords.lon, coords.lat, coords.lon);
            distances[op.id] = d;
          }
        }

        setOperatorDistances(distances);
        setActiveRadiusSearch({
          postcode: pc.toUpperCase(),
          radiusMiles,
        });
        setPostcodeError(null);
      } catch (err) {
        console.error('Postcode search error:', err);
        setPostcodeError('Postcode lookup failed. Please check your internet connection and try again.');
      }
    });
  };

  const clearRadiusSearch = () => {
    setActiveRadiusSearch(null);
    setOperatorDistances(null);
    setPostcodeInput('');
    setPostcodeError(null);
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_TABS.forEach((tab) => {
      if (tab === 'Active') {
        counts[tab] = operators.filter((o) => o.availability_status !== 'Do Not Use').length;
      } else if (tab === 'All') {
        counts[tab] = operators.length;
      } else {
        counts[tab] = operators.filter((o) => o.availability_status === tab).length;
      }
    });
    return counts;
  }, [operators]);

  return (
    <div className="space-y-6">
      {/* Filter Tabs & Search / Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 pt-1">
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 w-full lg:w-auto -mx-1 px-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tabCounts[tab] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 max-w-full lg:max-w-lg">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search operators, phone, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none transition-colors shadow-sm"
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

      {/* Postcode Radius Search — Iconless */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Search by Postcode Radius
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Find operators within 10, 20, 30, or 50 miles of any UK site or postcode
            </p>
          </div>
          {activeRadiusSearch && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200">
                {activeRadiusSearch.postcode} ({activeRadiusSearch.radiusMiles} mi)
              </span>
              <button
                type="button"
                onClick={clearRadiusSearch}
                className="text-xs text-slate-500 hover:text-slate-900 font-semibold underline underline-offset-2 transition-colors"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={postcodeInput}
              onChange={(e) => setPostcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePostcodeSearch()}
              placeholder="Enter site or client postcode (e.g. M2 3AE, SG12 8LG, SK1)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
            />
          </div>
          <select
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-900 transition-colors"
          >
            <option value={10}>Within 10 miles</option>
            <option value={20}>Within 20 miles</option>
            <option value={30}>Within 30 miles</option>
            <option value={50}>Within 50 miles</option>
          </select>
          <button
            type="button"
            onClick={handlePostcodeSearch}
            disabled={!postcodeInput.trim() || isSearchingPostcode}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isSearchingPostcode ? 'Searching...' : 'Search Radius'}
          </button>
          {activeRadiusSearch && (
            <button
              type="button"
              onClick={clearRadiusSearch}
              className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>

        {postcodeError && (
          <p className="mt-2.5 text-xs text-rose-600 font-medium">{postcodeError}</p>
        )}

        {activeRadiusSearch && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              Showing <strong className="text-slate-900">{filtered.length}</strong> operator{filtered.length === 1 ? '' : 's'} within{' '}
              <strong className="text-indigo-600">{activeRadiusSearch.radiusMiles} miles</strong> of{' '}
              <strong className="text-slate-900">{activeRadiusSearch.postcode}</strong> (sorted by closest distance).
            </span>
          </div>
        )}
      </div>

      {/* Mobile & Tablet Operator Cards (< lg) */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white text-slate-400 text-xs">
            No operators found matching your criteria.
          </div>
        ) : (
          filtered.map((op) => {
            const distance = operatorDistances?.[op.id];
            return (
              <div key={op.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-slate-200">
                      {op.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{op.name}</h3>
                        {distance !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[10px] border border-indigo-100">
                            {distance.toFixed(1)} mi away
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{op.primary_role}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{op.phone || op.location || 'North West UK'}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold ${STATUS_COLOR[op.availability_status] || 'text-slate-500'}`}>
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
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
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
                  const distance = operatorDistances?.[op.id];
                  return (
                    <tr key={op.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-4 text-center">
                        <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200">
                            {op.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/operators/${op.id}`}
                                className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors"
                              >
                                {op.name}
                              </Link>
                              {distance !== undefined && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[10px] border border-indigo-100 whitespace-nowrap">
                                  {distance.toFixed(1)} mi away
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{op.phone || op.location || 'North West UK'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{op.primary_role}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold ${STATUS_COLOR[op.availability_status] || 'text-slate-500'}`}>
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
