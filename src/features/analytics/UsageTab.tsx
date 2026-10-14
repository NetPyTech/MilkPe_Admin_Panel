'use client';
import Link from 'next/link';
import { BarList } from '@/components/charts/BarList';
import { StatTile } from '@/components/charts/StatTile';
import { QueryState } from '@/components/QueryState';
import { formatInr, formatUnit } from '@/lib/format';
import { useReferrals, useUsage, useVersions } from './queries';

const count = (n: number) => formatUnit(String(n), 'count');

export function Usage() {
  const query = useUsage();
  return (
    <QueryState query={query}>
      {(usage) => (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Role cards opened, last {usage.days} days</h2>
            <BarList empty="No role card has been opened." rows={usage.workspaces.map((w) => ({ key: w.workspace, label: w.workspace, value: w.taps, text: count(w.taps), note: `${count(w.users)} users` }))} />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Notifications read, last {usage.days} days</h2>
            <BarList empty="No notifications were sent." rows={usage.notifications.map((n) => ({ key: n.category, label: n.category, value: Number(n.read_rate ?? 0), text: n.read_rate === null ? '—' : `${n.read_rate}%`, note: `${count(n.read)} of ${count(n.sent)} read` }))} />
          </section>
        </div>
      )}
    </QueryState>
  );
}

export function Versions() {
  const query = useVersions();
  return (
    <QueryState query={query}>
      {(versions) => (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatTile label="Users with a known version" value={count(versions.users)} note={`last ${versions.days} days`} />
            <StatTile label="Version not reported" value={count(versions.unknown)} note="older app or no activity yet" />
            <StatTile label={versions.minimum ? `Below ${versions.minimum}` : 'Minimum version'} value={versions.minimum ? count(versions.below_minimum) : 'not set'}
              note={versions.below_minimum_share === null ? undefined : `${versions.below_minimum_share}% of known users`} />
          </div>
          <BarList empty="No app version has been reported yet." rows={versions.versions.map((v) => ({ key: v.version, label: v.version, value: v.users, text: count(v.users) }))} />
          <p className="text-xs text-muted-foreground">Users still below the minimum version are the ones who will be forced to update when it is raised.</p>
        </div>
      )}
    </QueryState>
  );
}

export function Referrals() {
  const query = useReferrals();
  return (
    <QueryState query={query}>
      {(referrals) => (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatTile label="Codes redeemed" value={count(referrals.redeemed)} />
            <StatTile label="Rewards paid" value={formatInr(referrals.rewards_paid)} />
            <StatTile label="Recorded a collection" value={count(referrals.referred_with_collection)} note={referrals.conversion === null ? undefined : `${referrals.conversion}% of those referred`} />
          </div>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Top referrers</h2>
            <BarList empty="Nobody has referred anyone yet." rows={referrals.top_referrers.map((r) => ({
              key: r.user_id, label: r.name || r.phone_number, value: r.referred, text: count(r.referred),
            }))} />
            <p className="text-xs text-muted-foreground">Open a referrer from <Link href="/users" className="underline underline-offset-4">Users</Link> to see who they referred.</p>
          </section>
        </div>
      )}
    </QueryState>
  );
}
