'use client';
import { LineChart, type Point } from '@/components/charts/LineChart';
import { QueryState } from '@/components/QueryState';
import { formatShortDay, formatUnit } from '@/lib/format';
import { useGrowth } from './queries';
import type { Growth } from './schemas';

const points = (growth: Growth, keys: string[]): Point[] =>
  growth.series.map((row) => ({ x: row.day, values: Object.fromEntries(keys.map((key) => [key, Number(row[key])])) }));
const count = (n: number) => formatUnit(String(n), 'count');

export function TrendsTab({ range }: { range: Record<string, string> }) {
  const query = useGrowth(range);
  return (
    <QueryState query={query}>
      {(growth) => (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {growth.metrics.map((metric) => (
              <div key={metric.slug} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{metric.label}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{formatUnit(growth.totals[metric.slug], metric.unit)}</div>
              </div>
            ))}
          </div>
          <LineChart title="New users per day" series={[{ key: 'signups_total', label: 'New users', color: 'var(--series-1)' }]}
            points={points(growth, ['signups_total'])} formatValue={count} formatX={formatShortDay} />
          <LineChart title="New dairy owners and suppliers per day"
            series={[{ key: 'signups_buyer', label: 'Dairy owners', color: 'var(--series-1)' }, { key: 'signups_seller', label: 'Suppliers', color: 'var(--series-2)' }]}
            points={points(growth, ['signups_buyer', 'signups_seller'])} formatValue={count} formatX={formatShortDay} />
          <LineChart title="Dairies reaching their first milestone, per day"
            series={[{ key: 'first_customer_added', label: 'Added their first supplier', color: 'var(--series-1)' }, { key: 'first_collection_recorded', label: 'Recorded their first collection', color: 'var(--series-3)' }]}
            points={points(growth, ['first_customer_added', 'first_collection_recorded'])} formatValue={count} formatX={formatShortDay} />
          <p className="text-xs text-muted-foreground">{growth.built_through ? `Daily figures are built through ${growth.built_through}; later days are counted live.` : 'The nightly build has not run yet, so every day is counted live.'}</p>
        </div>
      )}
    </QueryState>
  );
}
