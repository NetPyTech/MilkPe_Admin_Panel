import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsersTable } from '@/features/users/UsersTable';
import type { UserRow } from '@/features/users/schemas';

const row: UserRow = {
  id: 'u1', phone_number: '+919893100010', universal_id: '123456', name: 'Ramesh', email: 'r@example.com', language: 'pa', roles: ['buyer'],
  state: 'Punjab', district: 'Ludhiana', is_active: false, has_logged_in: true, date_joined: '2026-10-14T18:00:00Z',
  wallet_balance: '125.50', last_active: null,
};

describe('UsersTable', () => {
  it('shows the facts an owner scans for, formatted for India', () => {
    render(<UsersTable rows={[row]} />);
    expect(screen.getByRole('link', { name: /ramesh/i })).toHaveAttribute('href', '/users/u1');
    expect(screen.getByText('+919893100010')).toBeInTheDocument();
    expect(screen.getByText('₹125.50')).toBeInTheDocument();
    expect(screen.getByText(/Ludhiana, Punjab/)).toBeInTheDocument();
    expect(screen.getByText(/deactivated/i)).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // never active
  });
  it('says so when there is nobody', () => {
    render(<UsersTable rows={[]} />);
    expect(screen.getByText(/no users match/i)).toBeInTheDocument();
  });
  it('falls back to the phone number when a user has no name', () => {
    render(<UsersTable rows={[{ ...row, name: null, is_active: true }]} />);
    expect(screen.getByRole('link', { name: '+919893100010' })).toHaveAttribute('href', '/users/u1');
  });
});
