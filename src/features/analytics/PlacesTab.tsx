'use client';
import { useState } from 'react';
import { BarList } from '@/components/charts/BarList';
import { LineChart } from '@/components/charts/LineChart';
import { QueryState } from '@/components/QueryState';
import { Label } from '@/components/ui/label';
import { formatShortDay, formatUnit } from '@/lib/format';
import { useCollectionsByDay, useCollectionsByPlace, useGeo } from './queries';

const SELECT = 'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
const METRICS = [['collections_kg', 'Milk collected (kg)', 'kg'], ['collections_count', 'Number of collections', 'count'], ['collections_amount', 'Value of collections', 'rupees'], ['active_dairies', 'Active dairies', 'count']] as const;

function ByDay({ range }: { range: Record<string, string> }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number][0]>('collections_kg');
  const query = useCollectionsByDay(range);
  const [, label, unit] = METRICS.find((m) => m[0] === metric)!;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="coll-metric">Measure</Label>
        <select id="coll-metric" className={SELECT} value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}>
          {METRICS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
      </div>
      <QueryState query={query}>
        {(data) => (
          <LineChart title={`${label} per day`} series={[{ key: metric, label, color: 'var(--series-1)' }]}
            points={data.series.map((row) => ({ x: row.day, values: { [metric]: Number(row[metric]) } }))}
            formatValue={(n) => formatUnit(String(n), unit)} formatX={formatShortDay} />
        )}
      </QueryState>
    </div>
  );
}

function ByPlace({ group, range }: { group: 'state' | 'district' | 'route'; range: Record<string, string> }) {
  const query = useCollectionsByPlace(group, range);
  return (
    <QueryState query={query}>
      {(data) => (
        <BarList empty="No collections in this period."
          rows={data.rows.map((r) => ({ key: r.key, label: r.label, value: Number(r.kg), text: formatUnit(r.kg, 'kg'), note: `${formatUnit(String(r.collections), 'count')} collections · ${r.dairies} ${r.dairies === 1 ? 'dairy' : 'dairies'}` }))} />
      )}
    </QueryState>
  );
}

export function Collections({ range }: { range: Record<string, string> }) {
  const [group, setGroup] = useState<'day' | 'state' | 'district' | 'route'>('day');
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="coll-group">Group by</Label>
        <select id="coll-group" className={SELECT} value={group} onChange={(e) => setGroup(e.target.value as typeof group)}>
          <option value="day">Day</option><option value="state">State</option><option value="district">District</option><option value="route">Route</option>
        </select>
      </div>
      {group === 'day' ? <ByDay range={range} /> : <ByPlace group={group} range={range} />}
      {group !== 'day' ? <p className="text-xs text-muted-foreground">The top 50 by milk collected. Places are limited to periods of 93 days or less.</p> : null}
    </div>
  );
}

export function Geography() {
  const query = useGeo();
  return (
    <QueryState query={query}>
      {(geo) => (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Users by state</h2>
            <BarList rows={geo.states.map((s) => ({ key: s.state, label: s.state, value: s.users, text: formatUnit(String(s.users), 'count'), note: `${formatUnit(String(s.dairies), 'count')} dairies` }))} />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Districts with the most dairies</h2>
            <BarList empty="No district recorded yet." rows={geo.districts.map((d) => ({ key: `${d.state}-${d.district}`, label: `${d.district}, ${d.state}`, value: d.dairies, text: formatUnit(String(d.dairies), 'count') }))} />
          </section>
        </div>
      )}
    </QueryState>
  );
}
