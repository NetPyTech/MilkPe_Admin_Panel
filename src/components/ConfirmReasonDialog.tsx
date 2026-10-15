'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  open: boolean;
  title: string;
  effect: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
};

/** Every change that matters asks for a written reason and states exactly what will happen first. */
export function ConfirmReasonDialog({ open, title, effect, confirmLabel, destructive, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // A closed dialog forgets what was typed and any error: reopening it (even for the same action) never starts with an old reason, which
  // would otherwise be one click from the audit log.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {   // adjusting state while rendering, as React advises for state that follows a prop
    setWasOpen(open);
    if (!open) { setReason(''); setError(''); }
  }
  const trimmed = reason.trim();
  const valid = trimmed.length >= 3 && trimmed.length <= 500;

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm(trimmed);
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{effect}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-reason">Reason</Label>
          <Textarea id="confirm-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)}
            aria-describedby={error ? 'confirm-error' : undefined} placeholder="Why is this being done? (kept in the audit log)" />
        </div>
        {error ? <p id="confirm-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={confirm} disabled={!valid || busy}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
