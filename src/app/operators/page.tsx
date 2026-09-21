import { DataStore, syncFromSupabase } from '@/lib/store';
import { CreateOperatorModal } from '@/components/CreateOperatorModal';
import { OperatorsSearchClient } from '@/components/OperatorsSearchClient';

export const revalidate = 0;

export default async function OperatorsPage() {
  await syncFromSupabase();
  const currentRole = DataStore.getSessionRole();
  const allOperators = DataStore.getOperators(false);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Operators
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage and collaborate within your organization&apos;s plant operators and civil engineering teams
          </p>
        </div>
        <div>
          <CreateOperatorModal currentRole={currentRole} />
        </div>
      </div>

      {/* Dynamic Search + Filter + Postcode Radius — all client-side */}
      <OperatorsSearchClient operators={allOperators} currentRole={currentRole} />
    </div>
  );
}
