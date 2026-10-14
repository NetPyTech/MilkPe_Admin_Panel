import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import list from '../fixtures/controls-deletion-list.json';
import { DeletionTable, NEXT } from '@/features/controls/DeletionTable';
import { deletionPageSchema, type DeletionRequest } from '@/features/controls/schemas';

const [base] = deletionPageSchema.parse(list).results;
const as = (status: DeletionRequest['status']): DeletionRequest => ({ ...base, status });

describe('DeletionTable', () => {
  it('offers exactly the decisions the server allows for each status', () => {
    expect(NEXT).toEqual({ requested: ['approve', 'reject'], approved: ['complete', 'reject'], rejected: [], done: [] });
  });

  it('shows who asked, why, and passes the chosen decision on', async () => {
    const onAct = vi.fn();
    render(<DeletionTable rows={[as('requested')]} onAct={onAct} />);
    expect(screen.getByText(base.reason)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close account' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onAct).toHaveBeenCalledWith(expect.objectContaining({ id: base.id }), 'approve');
  });

  it('closes an approved account from its own button, and a finished request has none', () => {
    const { unmount } = render(<DeletionTable rows={[as('approved')]} onAct={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Close account' })).toBeInTheDocument();
    unmount();
    render(<DeletionTable rows={[{ ...as('done'), decided_by: '+919', decided_at: '2026-10-15T05:00:00Z', note: 'Verified' }]} onAct={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/Verified/)).toBeInTheDocument();
  });

  it('says so when there is nothing to decide', () => {
    render(<DeletionTable rows={[]} onAct={vi.fn()} />);
    expect(screen.getByText('No requests here.')).toBeInTheDocument();
  });
});
