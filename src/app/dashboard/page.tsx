import { DataStore, syncFromSupabase } from '@/lib/store';
import { BoardView } from '@/components/BoardView';

export const revalidate = 0; // dynamic data

export default async function DashboardPage() {
  await syncFromSupabase();
  const jobs = DataStore.getJobs(true);
  const operators = DataStore.getOperators(false);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <BoardView jobs={jobs} operators={operators} />
    </div>
  );
}
