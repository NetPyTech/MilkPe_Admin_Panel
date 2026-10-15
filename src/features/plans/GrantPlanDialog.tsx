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
import { limitsText, validDayCount } from './form';
import { SELECT_CLASS } from '@/lib/styles';
import { usePlans } from './queries';
import { usePlanRefresh } from './refresh';
import { subscriptionRowSchema } from './schemas';

/** Gives a dairy a plan without payment. A plan that is off sale can be given too (a private, one-off plan). It starts after the free trial and any plan the dairy has. */
export function GrantPlanDialog({ userId, who, onClose }: { userId: string; who: string; onClose: () => void }) {
  const { afterHolderChange } = usePlanRefresh();
  const plans = usePlans();
  const [planId, setPlanId] = useState('');
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const chosen = plans.data?.results.find((plan) => plan.id === planId);
  const validDays = days === '' || validDayCount(days);
  const valid = !!chosen && validDays && reason.trim().length >= 3;

  async function send() {
    setBusy(true);
    setError('');
    try {
      const row = await api(`/superadmin/users/${userId}/subscription-grant/`, subscriptionRowSchema, {
        method: 'POST', body: { plan_id: planId, ...(days ? { days: Number(days) } : {}), reason: reason.trim() },
      });
      await afterHolderChange();
      toast.success(row.starts_at ? `${row.plan.name} given to ${who}: ${formatDate(row.starts_at)} to ${formatDate(row.ends_at)}.` : `${row.plan.name} given to ${who}.`);
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
          <DialogTitle>Give a plan to {who}</DialogTitle>
          <DialogDescription>No payment is taken. It starts when the free trial and any plan they already have end. Their wallet is not used while it runs.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="grant-plan">Plan</Label>
            <select id="grant-plan" className={SELECT_CLASS} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Choose a plan…</option>
              {plans.data?.results.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.is_active ? '' : ' (off sale)'}</option>)}
            </select>
            {plans.isPending ? <p className="text-xs text-muted-foreground">Loading the plans…</p> : null}
            {plans.isError ? <p role="alert" className="text-sm text-destructive">The plans could not be loaded: {plans.error.message} <button type="button" className="underline" onClick={() => plans.refetch()}>Try again</button></p> : null}
            {chosen ? <p className="text-xs text-muted-foreground">{chosen.duration_days} days · {limitsText(chosen)}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grant-days">Days (optional)</Label>
            <Input id="grant-days" inputMode="numeric" placeholder={chosen ? `${chosen.duration_days} (the plan's length)` : ''} value={days} onValueChange={setDays} />
            <p className="text-xs text-muted-foreground">Leave empty for the plan’s own length, or enter 1 to 3650 days.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grant-reason">Reason</Label>
            <Textarea id="grant-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being done? (kept in the audit log)" />
          </div>
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={!valid || busy}>Give plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
