import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth/LoginForm';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

describe('LoginForm', () => {
  it('signs in with email and password and goes to the app', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { user: { phone_number: '+91' } }));
    vi.stubGlobal('fetch', fetchMock);
    const done = vi.fn();
    render(<LoginForm onDone={done} />);
    await userEvent.type(screen.getByLabelText('Email'), 'owner@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ mode: 'password', identifier: 'owner@example.com', password: 'secret' });
  });
  it('shows the server message when the sign-in is refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(403, { error: 'This account is not an administrator.' })));
    render(<LoginForm onDone={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Email'), 'x@y.com');
    await userEvent.type(screen.getByLabelText('Password'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('This account is not an administrator.')).toBeInTheDocument();
  });
  it('phone-code mode asks for the 6-digit code after sending it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(200, { step: 'code', verificationId: 'v1', channels: [{ channel: 'phone', masked: '+91 ******0001' }] }))
      .mockResolvedValueOnce(reply(200, { user: { phone_number: '+91' } }));
    vi.stubGlobal('fetch', fetchMock);
    const done = vi.fn();
    render(<LoginForm onDone={done} />);
    await userEvent.click(screen.getByRole('tab', { name: /phone code/i }));
    await userEvent.type(screen.getByLabelText('Phone'), '9999900001');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    expect(await screen.findByText(/\+91 \*{6}0001/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('6-digit code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ mode: 'code-verify', identifier: '9999900001', otp: '123456', verificationId: 'v1' });
  });
});
