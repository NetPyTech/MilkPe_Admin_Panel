'use client';
import { QueryState } from '@/components/QueryState';
import { useOverview } from '@/features/analytics/queries';
import { OverviewView } from '@/features/analytics/OverviewView';

export default function OverviewPage() {
  const overview = useOverview();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Overview</h1>
      <QueryState query={overview}>{(data) => <OverviewView data={data} />}</QueryState>
    </div>
  );
}
