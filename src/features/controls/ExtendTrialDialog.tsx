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
import { formatDate } from '@/lib/format';
import { trialExtensionSchema } from './schemas';

export const MAX_EXTENSION = 365;
const validDays = (text: string) => /^\d{1,3}$/.test(text) && Number(text) >= 1 && Number(text) <= MAX_EXTENSION;

/** Lengthens one dairy's free trial. The days are added to any earlier extension; the server holds the total to 365. */
export function ExtendTrialDialog({ open, userId, who, extraDays, endsAt, remaining, onClose }: {
  open: boolean; userId: string; who: string; extraDays: number; endsAt: string | null; remaining: number | null; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = validDays(days) && reason.trim().length >= 3;

  async function send() {
    setBusy(true);
    setError('');
    try {
      const result = await api(`/superadmin/users/${userId}/trial-extension/`, trialExtensionSchema, { method: 'POST', body: { days: Number(days), reason: reason.trim() } });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['user', userId] }), queryClient.invalidateQueries({ queryKey: ['users'] })]);
      toast.success(`${who}'s trial now ends on ${formatDate(result.trial_ends_at)}.`);
      setDays('');
      setReason('');
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
          <DialogTitle>Extend trial of {who}</DialogTitle>
          <DialogDescription>
            {remaining === 0
              ? `The free trial has already ended${endsAt ? ` (on ${formatDate(endsAt)})` : ''}. The days you enter start today.`
              : `${endsAt ? `The free trial ends on ${formatDate(endsAt)}` : 'The free trial has no end date yet'}${extraDays ? ` (already extended by ${extraDays} days)` : ''}. The days you enter are added to that.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trial-days">Days to add</Label>
            <Input id="trial-days" inputMode="numeric" value={days} onValueChange={setDays} />
            <p className="text-xs text-muted-foreground">1 to {MAX_EXTENSION}. A trial can be extended by {MAX_EXTENSION} days in total.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trial-reason">Reason</Label>
            <Textarea id="trial-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being done? (kept in the audit log)" />
          </div>
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={!valid || busy}>Extend trial</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
