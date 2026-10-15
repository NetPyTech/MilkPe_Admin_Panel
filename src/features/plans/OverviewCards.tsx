import { formatInr, formatUnit } from '@/lib/format';
import type { SubscriptionOverview } from './schemas';

export function OverviewCards({ data }: { data: SubscriptionOverview }) {
  const cards: [string, string, string?][] = [
    ['Running now', formatUnit(String(data.active), 'count'), data.active_granted ? `${data.active_granted} of them gifts` : undefined],
    ['Waiting to start', formatUnit(String(data.upcoming), 'count')],
    ['Ending within 7 days', formatUnit(String(data.ending_within_7_days), 'count')],
    ['Bought in 30 days', formatUnit(String(data.bought_30_days), 'count'), `${formatInr(data.revenue_30_days)} received`],
    ['Stuck payments', formatUnit(String(data.stuck_payments), 'count'), data.stuck_payments ? 'Reconcile them below' : undefined],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(([label, value, note]) => (
        <div key={label} className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold tabular-nums">{value}</div>
          {note ? <div className="text-xs text-muted-foreground">{note}</div> : null}
        </div>
      ))}
    </div>
  );
}
