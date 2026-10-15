'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { validDayCount } from './form';
import { usePlanRefresh } from './refresh';
import { subscriptionDetailSchema, type SubscriptionRow } from './schemas';

/** Adds days to a subscription that has not ended; plans waiting behind it move back by as much. */
export function ExtendPlanDialog({ row, onClose }: { row: SubscriptionRow; onClose: () => void }) {
  const { afterHolderChange } = usePlanRefresh();
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const who = row.user.name || row.user.phone_number;
  const valid = validDayCount(days) && reason.trim().length >= 3;

  async function send() {
    setBusy(true);
    setError('');
    try {
      const result = await api(`/superadmin/subscriptions/${row.id}/extend/`, subscriptionDetailSchema, { method: 'POST', body: { days: Number(days), reason: reason.trim() } });
      await afterHolderChange();
      toast.success(`${row.plan.name} for ${who} now ends on ${formatDate(result.ends_at)}.`);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend {row.plan.name} for {who}</DialogTitle>
          <DialogDescription>
            {row.ends_at ? `It ends on ${formatDate(row.ends_at)}. ` : ''}The days you enter are added to that, and any plan waiting behind it starts later by as much.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="extend-days">Days to add</Label>
            <Input id="extend-days" inputMode="numeric" value={days} onValueChange={setDays} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extend-reason">Reason</Label>
            <Textarea id="extend-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being done? (kept in the audit log)" />
          </div>
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={!valid || busy}>Extend plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
