import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BarList } from '@/components/charts/BarList';
import { LineChart } from '@/components/charts/LineChart';
import { RetentionGrid } from '@/components/charts/RetentionGrid';
import { compact, inkOn, niceScale } from '@/components/charts/scale';
import { StatTile } from '@/components/charts/StatTile';

const points = [
  { x: '2026-10-12', values: { a: 2, b: 1 } }, { x: '2026-10-13', values: { a: 5, b: 0 } }, { x: '2026-10-14', values: { a: 12, b: 3 } },
];
const one = [{ key: 'a', label: 'New users', color: 'var(--series-1)' }];
const two = [...one, { key: 'b', label: 'Suppliers', color: 'var(--series-2)' }];
const props = { points, formatValue: (n: number) => `${n} users`, formatX: (x: string) => x.slice(5) };

describe('scale helpers', () => {
  it('rounds the top to a clean number and compacts big ticks', () => {
    expect(niceScale(12)).toEqual({ top: 15, ticks: [0, 5, 10, 15] });
    expect(niceScale(0)).toEqual({ top: 1, ticks: [0, 1] });
    expect(niceScale(1000).top).toBe(1000);
  });
  it('compacts', () => { expect(compact(900)).toBe('900'); expect(compact(1500)).toMatch(/1\.5/); });
  it('picks readable ink', () => { expect(inkOn('#0d366b')).toBe('#ffffff'); expect(inkOn('#cde2fb')).toBe('#0b0b0b'); });
});

describe('LineChart', () => {
  it('draws one line per series, no legend for a single series', () => {
    const { container } = render(<LineChart title="New users per day" series={one} {...props} />);
    expect(container.querySelectorAll('path[stroke="var(--series-1)"]')).toHaveLength(1);
    expect(screen.queryByRole('list', { name: 'Legend' })).toBeNull();
    expect(screen.getByRole('img', { name: /New users per day/ })).toBeInTheDocument();
  });
  it('has a legend for two series and one line each', () => {
    const { container } = render(<LineChart title="Signups" series={two} {...props} />);
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent('Suppliers');
    expect(container.querySelectorAll('path[stroke^="var(--series-"]')).toHaveLength(2);
  });
  it('reads each day from the keyboard, listing every series', () => {
    render(<LineChart title="Signups" series={two} {...props} />);
    const chart = screen.getByRole('img');
    fireEvent.focus(chart);
    expect(screen.getByRole('status')).toHaveTextContent('12 users');
    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(screen.getByRole('status')).toHaveTextContent('5 users');
    expect(screen.getByRole('status')).toHaveTextContent('0 users');
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('offers the same numbers as a table', async () => {
    render(<LineChart title="Signups" series={two} {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('10-14')).toBeInTheDocument();
    expect(screen.getByText('12 users')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show chart' }));
    expect(screen.queryByRole('table')).toBeNull();
  });
  it('says so when there is nothing to draw', () => {
    render(<LineChart title="x" series={one} {...props} points={points.map((p) => ({ ...p, values: { a: 0, b: 0 } }))} />);
    expect(screen.getByText(/nothing recorded/i)).toBeInTheDocument();
    expect(screen.getByText('x')).toBeInTheDocument(); // the title stays
    render(<LineChart title="x" series={one} {...props} points={[]} />);
    expect(screen.getAllByText(/nothing recorded/i)).toHaveLength(2);
  });
});

describe('BarList', () => {
  it('sizes bars against the largest and puts the value at the tip', () => {
    const { container } = render(<BarList rows={[{ key: 'a', label: 'Punjab', value: 20, text: '20 kg' }, { key: 'b', label: 'Gujarat', value: 10, text: '10 kg', note: '1 dairy' }]} />);
    const bars = container.querySelectorAll<HTMLElement>('[data-bar]');
    expect([bars[0].style.width, bars[1].style.width]).toEqual(['100%', '50%']);
    expect(screen.getByText('20 kg')).toBeInTheDocument();
    expect(screen.getByText('1 dairy')).toBeInTheDocument();
  });
  it('shows an empty message', () => {
    render(<BarList rows={[]} empty="No collections." />);
    expect(screen.getByText('No collections.')).toBeInTheDocument();
  });
});

describe('StatTile', () => {
  it('shows a rise as up, a fall as down and a missing comparison plainly', () => {
    const { rerender } = render(<StatTile label="New users" value="12" change="+25.0" changeLabel="vs 7-day average" />);
    expect(screen.getByText(/▲ \+25\.0% vs 7-day average/)).toBeInTheDocument();
    rerender(<StatTile label="New users" value="12" change="-40.0" changeLabel="vs 7-day average" />);
    expect(screen.getByText(/▼ -40\.0%/)).toBeInTheDocument();
    rerender(<StatTile label="New users" value="12" change={null} />);
    expect(screen.getByText(/no comparison yet/)).toBeInTheDocument();
  });
});

describe('RetentionGrid', () => {
  it('prints every cell and dashes the weeks that have not happened', () => {
    render(<RetentionGrid formatWeek={(w) => w} cohorts={[{ week: '2026-10-05', size: 4, retained: ['100.0', '50.0', null] }, { week: '2026-10-12', size: 2, retained: ['100.0', null, null] }]} />);
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByText('4')).toBeInTheDocument();
  });
  it('says so when nobody has been seen', () => {
    render(<RetentionGrid formatWeek={(w) => w} cohorts={[{ week: '2026-10-05', size: 0, retained: [null, null] }]} />);
    expect(screen.getByText(/no users have been seen/i)).toBeInTheDocument();
  });
});
