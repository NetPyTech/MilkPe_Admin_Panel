import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/health.json';
import { ago, every, HealthView } from '@/features/health/HealthView';
import { healthSchema, type Health } from '@/features/health/schemas';

const healthy: Health = {
  checked_at: '2026-10-14T18:00:00Z', status: 'ok', alerts: [],
  jobs: [{ name: 'dispatch_announcements', label: 'Send scheduled announcements', command: 'python manage.py dispatch_announcements', expected_every_minutes: 1,
    last_started_at: '2026-10-14T17:59:00Z', last_ok_at: '2026-10-14T17:59:05Z', minutes_since_ok: 1, last_detail: '0 announcement(s) sent', status: 'ok' }],
  push: { owed: 0, announcements_sending: 0, announcements_stale: 0 }, announcements: { overdue: [] },
  payments: { stuck: 0, oldest_stuck_at: null }, nexus: { reachable: true, latency_ms: 12, detail: '' },
};

describe('HealthView', () => {
  it('says everything is running when nothing needs attention', () => {
    render(<HealthView data={healthy} />);
    expect(screen.getByText('Everything is running.')).toBeInTheDocument();
    expect(screen.getByText('Answering in 12 ms.')).toBeInTheDocument();
    expect(screen.getByText('Nothing is being sent.')).toBeInTheDocument();
    expect(screen.getAllByText('OK').length).toBeGreaterThan(0);
  });

  it('shows the real server answer, with its alerts and one row per job', () => {
    const data = healthSchema.parse(fixture);
    render(<HealthView data={data} />);
    expect(screen.getAllByRole('alert')).toHaveLength(data.alerts.length);
    expect(within(screen.getByRole('region', { name: 'Scheduled jobs' })).getAllByRole('row')).toHaveLength(data.jobs.length + 1);
    expect(screen.getByText(/Not answering/)).toBeInTheDocument();
  });

  it('names every problem: a failed job with its note, a never-run job, overdue announcements, stuck recharges', () => {
    render(<HealthView data={{
      ...healthy, status: 'attention',
      alerts: [{ key: 'nexus_down', severity: 'error', link: '/health', message: 'The calculation service (Nexus) is not answering: collections cannot be priced.' }],
      jobs: [
        { ...healthy.jobs[0], name: 'build_daily_metrics', label: 'Build the daily numbers', status: 'failed', last_detail: 'boom', minutes_since_ok: 1500 },
        { ...healthy.jobs[0], name: 'prune_activity', label: 'Remove old activity rows', status: 'never', last_ok_at: null, minutes_since_ok: null, last_started_at: null },
        { ...healthy.jobs[0], name: 'prune_admin_logs', label: 'Remove old admin logs', status: 'late', minutes_since_ok: 3000 },
      ],
      push: { owed: 3, announcements_sending: 1, announcements_stale: 1 },
      announcements: { overdue: [{ id: 'a1', title: 'Diwali offer', send_at: '2026-10-14T10:00:00Z' }] },
      payments: { stuck: 2, oldest_stuck_at: '2026-10-14T08:00:00Z' }, nexus: { reachable: false, latency_ms: null, detail: 'ConnectionError: refused' },
    }} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByText('Never ran')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Diwali offer' })).toHaveAttribute('href', '/outreach/announcements/a1');
    expect(screen.getByRole('link', { name: '2 pending over 30 minutes' })).toHaveAttribute('href', '/money?tab=payments&stuck=true');
    expect(screen.getByText(/3 pushes still owed, 1 stuck/)).toBeInTheDocument();
    expect(screen.getByText(/ConnectionError: refused/)).toBeInTheDocument();
    expect(screen.queryByText('Everything is running.')).not.toBeInTheDocument();
  });

  it('writes durations and intervals plainly', () => {
    expect(ago(null)).toBe('—');
    expect(ago(0)).toBe('just now');
    expect(ago(5)).toBe('5 min ago');
    expect(ago(90)).toBe('1 h 30 min ago');
    expect(ago(3000)).toBe('2 days ago');
    expect([every(1), every(1440), every(2880), every(15)]).toEqual(['every minute', 'daily', 'every 2 days', 'every 15 min']);
  });
});
