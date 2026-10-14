import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import type { Health, Job } from './schemas';

const STATUS: Record<Job['status'], { label: string; variant: 'secondary' | 'outline' | 'destructive' | 'default' }> = {
  ok: { label: 'OK', variant: 'secondary' },
  late: { label: 'Late', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  never: { label: 'Never ran', variant: 'outline' },
};

/** `90` as "1 h 30 min ago": a duration the server measured, only written out here. */
export function ago(minutes: number | null) {
  if (minutes === null) return '—';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''} ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export function every(minutes: number) {
  if (minutes === 1) return 'every minute';
  return minutes % 1440 === 0 ? (minutes === 1440 ? 'daily' : `every ${minutes / 1440} days`) : `every ${minutes} min`;
}

function Card({ title, state, children }: { title: string; state: 'ok' | 'attention'; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-1 rounded-lg border p-4">
      <h3 className="flex items-center justify-between gap-2 text-sm font-medium">
        {title}
        <Badge variant={state === 'ok' ? 'secondary' : 'destructive'}>{state === 'ok' ? 'OK' : 'Needs attention'}</Badge>
      </h3>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export function HealthView({ data }: { data: Health }) {
  const { jobs, push, announcements, payments, nexus } = data;
  return (
    <div className="space-y-6">
      {data.alerts.length ? (
        <ul className="space-y-2">
          {data.alerts.map((alert) => (
            <li key={alert.key} role="alert" className={`rounded-lg border px-4 py-2 text-sm ${alert.severity === 'error' ? 'border-destructive/40 bg-destructive/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
              ⚠ {alert.message}
            </li>
          ))}
        </ul>
      ) : <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm">Everything is running.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Calculation service" state={nexus.reachable ? 'ok' : 'attention'}>
          {nexus.reachable ? `Answering in ${nexus.latency_ms} ms.` : `Not answering. ${nexus.detail}`}
        </Card>
        <Card title="Push notifications" state={push.owed === 0 && push.announcements_stale === 0 ? 'ok' : 'attention'}>
          {push.announcements_sending === 0 ? 'Nothing is being sent.' : `${push.announcements_sending} announcement${push.announcements_sending === 1 ? '' : 's'} sending, ${push.owed} push${push.owed === 1 ? '' : 'es'} still owed${push.announcements_stale ? `, ${push.announcements_stale} stuck` : ''}.`}
        </Card>
        <Card title="Scheduled announcements" state={announcements.overdue.length === 0 ? 'ok' : 'attention'}>
          {announcements.overdue.length === 0 ? 'None are overdue.' : (
            <ul>{announcements.overdue.map((row) => <li key={row.id}><Link className="underline underline-offset-4" href={`/outreach/announcements/${row.id}`}>{row.title || 'Untitled'}</Link>, due {formatDateTime(row.send_at)}</li>)}</ul>
          )}
        </Card>
        <Card title="Recharges" state={payments.stuck === 0 ? 'ok' : 'attention'}>
          {payments.stuck === 0 ? 'None are stuck.' : (
            <>
              <Link className="underline underline-offset-4" href="/money?tab=payments&stuck=true">{payments.stuck} pending over 30 minutes</Link>
              {payments.oldest_stuck_at ? `, the oldest since ${formatDateTime(payments.oldest_stuck_at)}.` : '.'}
            </>
          )}
        </Card>
      </div>

      <section className="space-y-2" aria-label="Scheduled jobs">
        <h2 className="text-base font-semibold">Scheduled jobs</h2>
        <p className="text-sm text-muted-foreground">Each is a cron line on the server. “Never ran” usually means it has not been scheduled yet.</p>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Job</TableHead><TableHead>Expected</TableHead><TableHead>Last good run</TableHead><TableHead>Status</TableHead><TableHead>Note</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.name}>
                <TableCell>
                  <div className="font-medium">{job.label}</div>
                  <code className="text-xs text-muted-foreground">{job.command}</code>
                </TableCell>
                <TableCell>{every(job.expected_every_minutes)}</TableCell>
                <TableCell>{ago(job.minutes_since_ok)}{job.last_ok_at ? <div className="text-xs text-muted-foreground">{formatDateTime(job.last_ok_at)}</div> : null}</TableCell>
                <TableCell><Badge variant={STATUS[job.status].variant}>{STATUS[job.status].label}</Badge></TableCell>
                <TableCell className="max-w-64 whitespace-normal break-words text-sm text-muted-foreground">{job.last_detail || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <p className="text-xs text-muted-foreground">Checked {formatDateTime(data.checked_at)}. Refreshes every minute.</p>
    </div>
  );
}
