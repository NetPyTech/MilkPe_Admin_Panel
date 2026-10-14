import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentFilters } from '@/features/money/PaymentFilters';
import { UserFilters } from '@/features/users/UserFilters';

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

const cases = [
  ['UserFilters', 'Search', (values: Record<string, string>, onChange: () => void) => <UserFilters values={values} onChange={onChange} onClear={() => undefined} />],
  ['PaymentFilters', 'Search', (values: Record<string, string>, onChange: () => void) => <PaymentFilters values={values} onChange={onChange} onClear={() => undefined} />],
] as const;

describe.each(cases)('%s search box', (_name, label, make) => {
  it('follows the address when it changes while the screen stays open, and does not write the old text back', () => {
    const onChange = vi.fn();
    const { rerender } = render(make({ search: 'ramesh' }, onChange));
    expect(screen.getByLabelText(label)).toHaveValue('ramesh');
    rerender(make({}, onChange));                              // e.g. "Clear filters" elsewhere, or a link to the unfiltered list
    expect(screen.getByLabelText(label)).toHaveValue('');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onChange).not.toHaveBeenCalled();                   // nothing the person typed, so nothing is sent
    rerender(make({ search: 'seema' }, onChange));
    expect(screen.getByLabelText(label)).toHaveValue('seema');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('still sends what the person types, after a short pause', async () => {
    const onChange = vi.fn();
    render(make({}, onChange));
    await userEvent.type(screen.getByLabelText(label), ' Ramesh ', { delay: null });
    expect(onChange).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(400); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ search: 'Ramesh' });
  });

  it('keeps newer typing when an earlier search reaches the address late', async () => {
    const onChange = vi.fn();
    const { rerender } = render(make({}, onChange));
    await userEvent.type(screen.getByLabelText(label), 'ram', { delay: null });
    act(() => { vi.advanceTimersByTime(400); });
    expect(onChange).toHaveBeenLastCalledWith({ search: 'ram' });
    await userEvent.type(screen.getByLabelText(label), 'esh', { delay: null });   // still typing while the page change is under way
    rerender(make({ search: 'ram' }, onChange));                                  // the first search reaches the address
    expect(screen.getByLabelText(label)).toHaveValue('ramesh');
    act(() => { vi.advanceTimersByTime(400); });
    expect(onChange).toHaveBeenLastCalledWith({ search: 'ramesh' });              // and the newer text was still sent
    rerender(make({ search: 'ramesh' }, onChange));
    expect(screen.getByLabelText(label)).toHaveValue('ramesh');
  });
});
