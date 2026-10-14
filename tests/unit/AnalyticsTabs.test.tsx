import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import a_overview from '../fixtures/analytics-overview.json';

const mocks = vi.hoisted(() => {
  const state = { override: null as null | Record<string, unknown> };
  const hook = (data: unknown) => () => state.override ?? { data, isPending: false, isError: false, isFetching: false, refetch: () => undefined };
  return { state, hook };
});
const state = mocks.state;

vi.mock('@/features/analytics/queries', async () => {
  const load = async (name: string) => (await import(`../fixtures/analytics-${name}.json`)).default;
  const { hook } = mocks;
  return {
    useOverview: hook(await load('overview')), useGrowth: hook(await load('growth')), useFunnel: hook(await load('funnel')),
    useActive: hook(await load('active')), useRetention: hook(await load('retention')), useCollectionsByDay: hook(await load('collections-day')),
    useCollectionsByPlace: hook(await load('collections-state')), useUsage: hook(await load('usage')), useVersions: hook(await load('versions')),
    useReferrals: hook(await load('referrals')), useGeo: hook(await load('geo')),
  };
});

import { ActiveUsers, Retention } from '@/features/analytics/EngagementTab';
import { FunnelTab } from '@/features/analytics/FunnelTab';
import { OverviewView } from '@/features/analytics/OverviewView';
import { Collections, Geography } from '@/features/analytics/PlacesTab';
import { rangeOf } from '@/features/analytics/RangeBar';
import { TrendsTab } from '@/features/analytics/TrendsTab';
import { Referrals, Usage, Versions } from '@/features/analytics/UsageTab';
import type { Overview } from '@/features/analytics/schemas';
import { ApiError } from '@/lib/api';

describe('range', () => {
  it('uses a preset until a custom from or to is given', () => {
    expect(rangeOf({})).toEqual({ days: '30' });
    expect(rangeOf({ days: '7' })).toEqual({ days: '7' });
    expect(rangeOf({ from: '2026-10-01', to: '2026-10-14', days: '7' })).toEqual({ from: '2026-10-01', to: '2026-10-14' });
  });
});

describe('Overview', () => {
  it('shows a tile per headline number with yesterday, today so far and the comparison', () => {
    render(<OverviewView data={a_overview as Overview} />);
    expect(screen.getByText('New users, yesterday')).toBeInTheDocument();
    expect(screen.getAllByText(/Today so far:/).length).toBe((a_overview as Overview).cards.length);
  });
  it('lists what needs attention, with a link when there is one', () => {
    const data: Overview = { ...(a_overview as Overview), alerts: [{ key: 'stuck_payments', severity: 'warn', link: '/money?tab=payments&stuck=true', message: '2 recharges pending for over 30 minutes' }] };
    render(<OverviewView data={data} />);
    expect(screen.getByRole('alert')).toHaveTextContent('2 recharges pending');
    expect(screen.getByRole('link', { name: 'Look into it' })).toHaveAttribute('href', '/money?tab=payments&stuck=true');
  });
  it('says when the nightly build has not run', () => {
    render(<OverviewView data={{ ...(a_overview as Overview), rollups_built_through: null }} />);
    expect(screen.getByText(/nightly build has not run yet/)).toBeInTheDocument();
  });
});

describe('Growth tabs', () => {
  it('Trends draws the three charts and the period totals', () => {
    render(<TrendsTab range={{ days: '30' }} />);
    expect(screen.getByText('New users per day')).toBeInTheDocument();
    expect(screen.getByText('New dairy owners and suppliers per day')).toBeInTheDocument();
    expect(screen.getByText('Dairies reaching their first milestone, per day')).toBeInTheDocument();
    expect(screen.getAllByRole('list', { name: 'Legend' })).toHaveLength(2);
  });
  it('Funnel shows both funnels with the rate of each step', () => {
    render(<FunnelTab range={{ days: '30' }} />);
    expect(screen.getByText('Signed in for the first time')).toBeInTheDocument();
    expect(screen.getByText('Email sign-ups: how far people got')).toBeInTheDocument();
    expect(screen.getAllByText(/of previous/).length).toBeGreaterThan(0);
  });
  it('Funnel says where the sign-up chart starts when the old sessions are gone, and says nothing when it covers the range', () => {
    const { rerender } = render(<FunnelTab range={{ days: '366' }} />);
    expect(screen.queryByRole('note')).toBeNull();                       // the fixture's sign-ups cover its whole range
    state.override = { data: { from: '2025-10-01', to: '2026-10-14', signup_from: '2026-04-17', signup: [], activation: [] }, isPending: false, isError: false, isFetching: false, refetch: () => undefined };
    rerender(<FunnelTab range={{ days: '366' }} />);
    expect(screen.getByRole('note')).toHaveTextContent('kept for 180 days');
    expect(screen.getByRole('note')).toHaveTextContent('17 Apr');
    state.override = null;
  });
  it('Active users shows DAU, WAU, MAU, stickiness and since when the numbers exist', () => {
    render(<ActiveUsers />);
    expect(screen.getByText('Active today')).toBeInTheDocument();
    expect(screen.getByText('Stickiness')).toBeInTheDocument();
    expect(screen.getByText(/Active-user numbers exist since/)).toBeInTheDocument();
  });
  it('Retention shows the cohort grid', () => {
    render(<Retention />);
    expect(screen.getByText('Week of')).toBeInTheDocument();
  });
  it('Collections defaults to the daily chart and can switch to a place breakdown', async () => {
    render(<Collections range={{ days: '30' }} />);
    expect(screen.getByText('Milk collected (kg) per day')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Group by'), 'state');
    expect(screen.getByText(/The top 50 by milk collected/)).toBeInTheDocument();
    expect(screen.getAllByText(/collections ·/).length).toBeGreaterThan(0);
  });
  it('Geography, usage, versions and referrals render their sections', () => {
    render(<><Geography /><Usage /><Versions /><Referrals /></>);
    expect(screen.getByText('Users by state')).toBeInTheDocument();
    expect(screen.getByText(/Role cards opened/)).toBeInTheDocument();
    expect(screen.getByText('Users with a known version')).toBeInTheDocument();
    expect(screen.getByText('Codes redeemed')).toBeInTheDocument();
  });
  it('shows the server message with Retry and the wait on a throttled answer', () => {
    state.override = { data: undefined, isPending: false, isError: true, isFetching: false, error: new ApiError('Request was throttled.', 429, null, 41), refetch: vi.fn() };
    render(<TrendsTab range={{ days: '30' }} />);
    expect(screen.getByText('Request was throttled.')).toBeInTheDocument();
    expect(screen.getByText(/Try again in 41s/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    state.override = null;
  });
});
