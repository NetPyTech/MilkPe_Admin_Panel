'use client';
import { useState } from 'react';
import { LineChart } from '@/components/charts/LineChart';
import { RetentionGrid } from '@/components/charts/RetentionGrid';
import { StatTile } from '@/components/charts/StatTile';
import { QueryState } from '@/components/QueryState';
import { Label } from '@/components/ui/label';
import { formatDate, formatShortDay, formatUnit } from '@/lib/format';
import { useActive, useRetention } from './queries';

const since = (value: string | null) => (value ? `Active-user numbers exist since ${formatDate(`${value}T12:00:00+05:30`)}, when the app began reporting its activity.` : 'No app activity has been recorded yet.');

export function ActiveUsers() {
  const [days, setDays] = useState('30');
  const query = useActive(days);
  return (
    <QueryState query={query}>
      {(active) => (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatTile label="Active today" value={formatUnit(String(active.latest.dau), 'count')} />
            <StatTile label="Active in 7 days" value={formatUnit(String(active.latest.wau), 'count')} />
            <StatTile label="Active in 30 days" value={formatUnit(String(active.latest.mau), 'count')} />
            <StatTile label="Stickiness" value={active.latest.stickiness === null ? '—' : `${active.latest.stickiness}%`} note="today's users as a share of the month's" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="active-days">Show</Label>
            <select id="active-days" value={days} onChange={(e) => setDays(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="14">Last 14 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
            </select>
          </div>
          <LineChart title="Daily active users" series={[{ key: 'dau', label: 'Active users', color: 'var(--series-1)' }]}
            points={active.series.map((row) => ({ x: row.day, values: { dau: row.dau } }))} formatValue={(n) => formatUnit(String(n), 'count')} formatX={formatShortDay} />
          <p className="text-xs text-muted-foreground">{since(active.since)}</p>
        </div>
      )}
    </QueryState>
  );
}

export function Retention() {
  const [weeks, setWeeks] = useState('8');
  const query = useRetention(weeks);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="retention-weeks">Cohorts</Label>
        <select id="retention-weeks" value={weeks} onChange={(e) => setWeeks(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="4">Last 4 weeks</option><option value="8">Last 8 weeks</option><option value="12">Last 12 weeks</option><option value="26">Last 26 weeks</option>
        </select>
      </div>
      <QueryState query={query}>
        {(retention) => (
          <div className="space-y-3">
            <RetentionGrid cohorts={retention.cohorts} formatWeek={(week) => formatShortDay(week)} />
            <p className="text-xs text-muted-foreground">Each row is the users first seen that week; each cell is the share of them active that many weeks later. {since(retention.since)}</p>
          </div>
        )}
      </QueryState>
    </div>
  );
}
