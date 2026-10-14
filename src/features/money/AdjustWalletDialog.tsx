'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { formatInr } from '@/lib/format';
import { paymentRowSchema } from './schemas';

export type AdjustTarget = { id: string; name: string | null; phone_number: string; balance: string | null };

const AMOUNT = /^\d{1,6}(\.\d{1,2})?$/;
const validAmount = (text: string) => AMOUNT.test(text) && Number(text) >= 0.01 && Number(text) <= 100000;

/** Mount it only while it is open: each opening gets its own idempotency key, kept across retries so a repeated send cannot adjust twice. */
export function AdjustWalletDialog({ open, user, onClose }: { open: boolean; user: AdjustTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const who = user.name || user.phone_number;
  const valid = validAmount(amount) && reason.trim().length >= 3;
  const label = kind === 'credit' ? 'Credit wallet' : 'Debit wallet';

  async function send() {
    setBusy(true);
    setError('');
    try {
      await api('/superadmin/wallet-adjustments/', paymentRowSchema, {
        method: 'POST', body: { user_id: user.id, type: kind, amount, reason: reason.trim(), idempotency_key: idempotencyKey },
      });
      await Promise.all(['user', 'users', 'payments', 'revenue', 'balances'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success(`${kind === 'credit' ? 'Credited' : 'Debited'} ${formatInr(amount)} ${kind === 'credit' ? 'to' : 'from'} ${who}.`);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust wallet of {who}</DialogTitle>
          <DialogDescription>
            {validAmount(amount)
              ? `${kind === 'credit' ? 'Credit' : 'Debit'} ${formatInr(amount)} ${kind === 'credit' ? 'to' : 'from'} ${who}. Current balance: ${formatInr(user.balance)}.`
              : `Current balance: ${formatInr(user.balance)}. The user sees this in their wallet history as "Adjustment by MilkPe"; your reason stays internal.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="adjust-type">Type</Label>
            <select id="adjust-type" value={kind} onChange={(e) => setKind(e.target.value as 'credit' | 'debit')}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="credit">Credit (add money)</option>
              <option value="debit">Debit (take money)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-amount">Amount (₹)</Label>
            <Input id="adjust-amount" inputMode="decimal" value={amount} onValueChange={setAmount} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Textarea id="adjust-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being done? (kept in the audit log)" />
          </div>
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={kind === 'debit' ? 'destructive' : 'default'} onClick={send} disabled={!valid || busy}>{label}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
