'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QueryState } from '@/components/QueryState';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, formatUnit } from '@/lib/format';
import { withFilters } from '@/lib/filters';
import { describeRules } from './GroupsTab';
import { useAnnouncements, useMeta } from './queries';
import type { Announcement, RuleDef } from './schemas';

export function audienceLabel(a: Announcement, defs: RuleDef[]): string {
  const { type, phones, rules } = a.audience;
  if (type === 'users') return `${phones.length} listed phone number${phones.length === 1 ? '' : 's'}`;
  if (type === 'segment') return `Group: ${describeRules(rules, defs) || 'filters'}`;
  return { all: 'Everyone', buyers: 'Dairy owners', sellers: 'Suppliers' }[type] ?? type;
}

const LOOK = { draft: 'secondary', scheduled: 'outline', sending: 'outline', sent: 'default', retracted: 'destructive' } as const;
const pageOf = (url: string | null) => (url ? new URL(url).searchParams.get('page') ?? '1' : undefined);

export function AnnouncementsTab() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const page = params.get('page') ?? '';
  const meta = useMeta();
  const list = useAnnouncements({ ...(status ? { status } : {}), ...(page ? { page } : {}) });
  const defs = meta.data?.segment_rules ?? [];
  const change = (changes: Record<string, string | undefined>) => router.replace(`/outreach?${withFilters(new URLSearchParams(window.location.search), changes)}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ann-status">Status</Label>
          <select id="ann-status" value={status} onChange={(e) => change({ status: e.target.value || undefined })}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            <option value="">All</option>
            {(meta.data?.statuses ?? []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <Link href="/outreach/announcements/new" className={buttonVariants()}>New announcement</Link>
      </div>
      <QueryState query={list}>
        {(data) => data.results.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No announcements{status ? ' with this status' : ''}. Write one to reach your users.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Message</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead>Send time</TableHead><TableHead className="text-right">Reached</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/outreach/announcements/${a.id}`} className="font-medium underline-offset-4 hover:underline">{a.translations.en?.title || '(no title yet)'}</Link>
                      <div className="text-xs text-muted-foreground">{a.kind}{a.missing_languages.length ? ` · English only for ${a.missing_languages.length} languages` : ''}</div>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs">{audienceLabel(a, defs)}</TableCell>
                    <TableCell className="space-x-1"><Badge variant={LOOK[a.status]}>{a.status}</Badge>{a.overdue ? <Badge variant="destructive">overdue</Badge> : null}</TableCell>
                    <TableCell>{formatDateTime(a.sent_at ?? a.send_at)}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.recipient_count === null ? '—' : formatUnit(String(a.recipient_count), 'count')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" disabled={!data.previous} onClick={() => change({ page: pageOf(data.previous) === '1' ? undefined : pageOf(data.previous) })}>Previous</Button>
              <span className="self-center text-xs text-muted-foreground">{formatUnit(String(data.count), 'count')} in total</span>
              <Button variant="outline" size="sm" disabled={!data.next} onClick={() => change({ page: pageOf(data.next) })}>Next</Button>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
