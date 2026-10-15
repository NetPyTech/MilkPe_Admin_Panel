import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { ConfirmReasonDialog } from '@/components/ConfirmReasonDialog';

const setup = (onConfirm = vi.fn().mockResolvedValue(undefined)) => {
  const onClose = vi.fn();
  render(<ConfirmReasonDialog open title="Deactivate Ramesh" effect="Ramesh will be signed out and cannot use the app until reactivated." confirmLabel="Deactivate" onConfirm={onConfirm} onClose={onClose} />);
  return { onConfirm, onClose };
};

describe('ConfirmReasonDialog reopened', () => {
  it('starts empty again, even for the same action, so an old reason is never one click from the audit log', async () => {
    const props = { title: 'Delete plan', effect: 'It is removed.', confirmLabel: 'Delete plan', onConfirm: vi.fn(), onClose: vi.fn() };
    const { rerender } = render(<ConfirmReasonDialog open {...props} />);
    await userEvent.type(screen.getByLabelText(/reason/i), 'meant for something else');
    rerender(<ConfirmReasonDialog open={false} {...props} />);
    rerender(<ConfirmReasonDialog open {...props} />);
    expect(screen.getByLabelText(/reason/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Delete plan' })).toBeDisabled();
  });
});

describe('ConfirmReasonDialog', () => {
  it('states the effect and will not confirm without a reason', async () => {
    const { onConfirm } = setup();
    expect(screen.getByText(/will be signed out/)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Deactivate' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/reason/i), 'ab');
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/reason/i), 'c');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('abc');
  });
  it('closes after success', async () => {
    const { onClose } = setup();
    await userEvent.type(screen.getByLabelText(/reason/i), 'Fraud report 42');
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
  it('keeps the dialog open and shows the server message on a refusal', async () => {
    const { onClose } = setup(vi.fn().mockRejectedValue(new ApiError('This account is already deactivated.', 409)));
    await userEvent.type(screen.getByLabelText(/reason/i), 'Fraud report 42');
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(await screen.findByText('This account is already deactivated.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
  it('counts a reason of only spaces as empty', async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/reason/i), '     ');
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeDisabled();
  });
});
