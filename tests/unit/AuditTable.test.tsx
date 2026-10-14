import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuditTable } from '@/features/audit/AuditTable';

describe('AuditTable', () => {
  it('shows who did what to whom and the change', () => {
    render(<AuditTable rows={[{
      id: 'a1', actor: { id: 'x', phone_number: '+919999900001' }, action: 'user.deactivate', target_type: 'user', target_id: 'u1',
      reason: 'Fraud report 42', before: { is_active: true }, after: { is_active: false }, ip: '1.2.3.4', created_at: '2026-10-14T18:00:00Z' }]} />);
    expect(screen.getByText('user.deactivate')).toBeInTheDocument();
    expect(screen.getByText('Fraud report 42')).toBeInTheDocument();
    expect(screen.getByText('is_active: true → false')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /u1/ })).toHaveAttribute('href', '/users/u1');
  });
  it('handles a missing actor', () => {
    render(<AuditTable rows={[{ id: 'a2', actor: null, action: 'config.update', target_type: 'config', target_id: 'TRIAL_PERIOD_DAYS',
      reason: '', before: {}, after: {}, ip: '', created_at: '2026-10-14T18:00:00Z' }]} />);
    expect(screen.getByText(/removed account/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('says so when nothing has been changed', () => {
    render(<AuditTable rows={[]} />);
    expect(screen.getByText(/nothing has been changed/i)).toBeInTheDocument();
  });
});
