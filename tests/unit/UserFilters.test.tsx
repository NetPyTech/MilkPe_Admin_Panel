import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserFilters } from '@/features/users/UserFilters';

describe('UserFilters', () => {
  it('filters dairies by the state of their free trial and can clear it', async () => {
    const onChange = vi.fn();
    render(<UserFilters values={{}} onChange={onChange} onClear={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Free trial'), 'ending');
    expect(onChange).toHaveBeenCalledWith({ trial: 'ending' });
    await userEvent.selectOptions(screen.getByLabelText('Free trial'), '');
    expect(onChange).toHaveBeenLastCalledWith({ trial: undefined });
  });
  it('shows the trial filter that is in the address', () => {
    render(<UserFilters values={{ trial: 'ended' }} onChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByLabelText('Free trial')).toHaveValue('ended');
  });
});
