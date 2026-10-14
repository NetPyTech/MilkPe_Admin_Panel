'use client';
import { BarList } from '@/components/charts/BarList';
import { QueryState } from '@/components/QueryState';
import { formatShortDay, formatUnit } from '@/lib/format';
import { useFunnel } from './queries';
import type { z } from 'zod';
import type { funnelSchema } from './schemas';

type Step = z.infer<typeof funnelSchema>['signup'][number];
const rows = (steps: Step[]) => steps.map((s) => ({ key: s.key, label: s.label, value: s.count, text: formatUnit(String(s.count), 'count'), note: s.rate === null ? undefined : `${s.rate}% of previous` }));

export function FunnelTab({ range }: { range: Record<string, string> }) {
  const query = useFunnel(range);
  return (
    <QueryState query={query}>
      {(funnel) => (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Email sign-ups: how far people got</h2>
            {funnel.signup_from > funnel.from ? (
              <p role="note" className="text-xs text-muted-foreground">Sign-up attempts are kept for 180 days, so this chart starts on {formatShortDay(funnel.signup_from)}.</p>
            ) : null}
            <BarList rows={rows(funnel.signup)} empty="No email sign-ups in this period." />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">New users: how far they got in the app</h2>
            <BarList rows={rows(funnel.activation)} empty="No new users in this period." />
          </section>
        </div>
      )}
    </QueryState>
  );
}
