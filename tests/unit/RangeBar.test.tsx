import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { RangeBar, rangeOf } from '@/features/analytics/RangeBar';
import { withFilters } from '@/lib/filters';

/** The way the Growth page drives it: the values live in the address, and an empty value is dropped from it. */
function InAddress({ start = '' }: { start?: string }) {
  const [search, setSearch] = useState(start);
  const params = new URLSearchParams(search);
  const values = Object.fromEntries(params.entries());
  return (
    <>
      <RangeBar values={values} onChange={(changes) => setSearch(withFilters(new URLSearchParams(search), changes))} />
      <output aria-label="query">{JSON.stringify(rangeOf(values))}</output>
    </>
  );
}

describe('RangeBar', () => {
  it('goes back to the default period when the address is replaced by a plain link to the page', async () => {
    function Harness() {
      const [search, setSearch] = useState('days=90');
      const values = Object.fromEntries(new URLSearchParams(search).entries());
      return (
        <>
          <RangeBar values={values} onChange={(changes) => setSearch(withFilters(new URLSearchParams(search), changes))} />
          <button onClick={() => setSearch('')}>Growth link</button>
          <output aria-label="query">{JSON.stringify(rangeOf(values))}</output>
        </>
      );
    }
    render(<Harness />);
    await userEvent.selectOptions(screen.getByLabelText('Period'), 'custom');
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Growth link'));
    expect(screen.getByLabelText('Period')).toHaveValue('30');
    expect(screen.queryByLabelText('From')).toBeNull();
    expect(JSON.parse(screen.getByLabelText('query').textContent ?? '{}')).toEqual({ days: '30' });
  });

  it('choosing Custom range from a preset shows the From and To fields, and the charts keep the last period until dates are picked', async () => {
    render(<InAddress start="days=90" />);
    expect(screen.queryByLabelText('From')).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Period'), 'custom');
    expect(screen.getByLabelText('Period')).toHaveValue('custom');
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(JSON.parse(screen.getByLabelText('query').textContent ?? '{}')).toEqual({ days: '30' });   // nothing picked yet: the default period
  });

  it('dates picked in the custom range become the period', async () => {
    render(<InAddress start="days=90" />);
    await userEvent.selectOptions(screen.getByLabelText('Period'), 'custom');
    await userEvent.type(screen.getByLabelText('From'), '2026-09-01');
    await userEvent.type(screen.getByLabelText('To'), '2026-09-30');
    expect(JSON.parse(screen.getByLabelText('query').textContent ?? '{}')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(screen.getByLabelText('Period')).toHaveValue('custom');
  });

  it('going back to a preset hides the dates and uses the preset', async () => {
    render(<InAddress start="from=2026-09-01&to=2026-09-30" />);
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-01');
    await userEvent.selectOptions(screen.getByLabelText('Period'), '7');
    expect(screen.queryByLabelText('From')).toBeNull();
    expect(JSON.parse(screen.getByLabelText('query').textContent ?? '{}')).toEqual({ days: '7' });
  });
});
