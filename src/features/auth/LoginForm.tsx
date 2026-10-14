'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Reply = { error?: string; step?: 'code'; verificationId?: string; channels?: { channel: string; masked: string }[]; user?: unknown };

async function post(body: object): Promise<{ ok: boolean; data: Reply }> {
  const response = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' }, body: JSON.stringify(body),
  }).catch(() => null);
  if (!response) return { ok: false, data: { error: 'The server could not be reached.' } };
  return { ok: response.ok, data: (await response.json().catch(() => ({}))) as Reply };
}

export function LoginForm({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<string>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<{ verificationId?: string; masked: string[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(body: object, onStep?: (data: Reply) => void) {
    setBusy(true);
    setError('');
    const { ok, data } = await post(body);
    setBusy(false);
    if (ok && data.user) return onDone();
    if (ok && data.step === 'code' && onStep) return onStep(data);
    setError(data.error ?? 'Sign-in failed.');
  }

  const signIn = (event: FormEvent) => { event.preventDefault(); void run({ mode: 'password', identifier: email.trim(), password }); };
  const sendCode = (event: FormEvent) => {
    event.preventDefault();
    void run({ mode: 'code-send', identifier: phone.trim() },
      (data) => setSent({ verificationId: data.verificationId, masked: (data.channels ?? []).map((c) => c.masked) }));
  };
  const verify = (event: FormEvent) => {
    event.preventDefault();
    void run({ mode: 'code-verify', identifier: phone.trim(), otp: code, verificationId: sent?.verificationId });
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(value) => { setTab(String(value)); setError(''); }}>
        <TabsList className="w-full">
          <TabsTrigger value="password">Email and password</TabsTrigger>
          <TabsTrigger value="code">Phone code</TabsTrigger>
        </TabsList>
        <TabsContent value="password">
          <form onSubmit={signIn} className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" autoComplete="username" value={email} onValueChange={setEmail} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input id="login-password" type="password" autoComplete="current-password" value={password} onValueChange={setPassword} required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
          </form>
        </TabsContent>
        <TabsContent value="code">
          {!sent ? (
            <form onSubmit={sendCode} className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="login-phone">Phone</Label>
                <Input id="login-phone" inputMode="numeric" autoComplete="tel" value={phone} onValueChange={setPhone} required />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>Send code</Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">Code sent to {sent.masked.join(' and ') || 'your phone'}.</p>
              <div className="space-y-1.5">
                <Label htmlFor="login-code">6-digit code</Label>
                <Input id="login-code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onValueChange={(value) => setCode(value.replace(/\D/g, ''))} required />
              </div>
              <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>Verify</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setSent(null); setCode(''); setError(''); }}>Use a different number</Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
