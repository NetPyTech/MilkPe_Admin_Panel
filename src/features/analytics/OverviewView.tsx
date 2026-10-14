import Link from 'next/link';
import { StatTile } from '@/components/charts/StatTile';
import { formatDate, formatUnit } from '@/lib/format';
import type { Overview } from './schemas';

export function OverviewView({ data }: { data: Overview }) {
  return (
    <div className="space-y-6">
      {data.alerts.length ? (
        <ul className="space-y-2">
          {data.alerts.map((alert) => (
            <li key={alert.key} role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
              <span>⚠ {alert.message}</span>
              {alert.link ? <Link href={alert.link} className="underline underline-offset-4">Look into it</Link> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.cards.map((card) => (
          <StatTile key={card.key} label={`${card.label}, yesterday`} value={formatUnit(card.yesterday, card.unit)}
            note={`Today so far: ${formatUnit(card.today, card.unit)}`} change={card.yesterday_vs_avg} changeLabel="vs the 7-day average" />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {data.rollups_built_through ? `Daily figures built through ${formatDate(`${data.rollups_built_through}T12:00:00+05:30`)}; today is counted live.` : 'The nightly build has not run yet; every figure is counted live.'}
      </p>
    </div>
  );
}
