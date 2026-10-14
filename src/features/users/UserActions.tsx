'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmReasonDialog } from '@/components/ConfirmReasonDialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { userRowSchema, type UserRow } from './schemas';

type Choice = { id: string; verb: 'deactivate' | 'reactivate'; label: string; who: string; effect: string; destructive: boolean; done: string };

/** What the dialog says is fixed when it opens: the change itself flips the user's state, and the closing dialog must not change its wording. */
function choiceFor(user: UserRow): Choice {
  const who = user.name || user.phone_number;
  return user.is_active
    ? { id: user.id, verb: 'deactivate', label: 'Deactivate', who, destructive: true, done: `${who} deactivated.`,
        effect: `${who} will be signed out of the app at their next request, stop receiving notifications, and drop out of every announcement audience.` }
    : { id: user.id, verb: 'reactivate', label: 'Reactivate', who, destructive: false, done: `${who} reactivated.`,
        effect: `${who} will be able to sign in and use the app again. Their phone registers for notifications again when they open the app.` };
}

export function UserActions({ user }: { user: UserRow }) {
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [open, setOpen] = useState(false);
  const current = choiceFor(user);

  async function confirm(reason: string) {
    if (!choice) return;
    await api(`/superadmin/users/${choice.id}/${choice.verb}/`, userRowSchema, { method: 'POST', body: { reason } });
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['user', choice.id] }), queryClient.invalidateQueries({ queryKey: ['users'] })]);
    toast.success(choice.done);
  }

  return (
    <>
      <Button variant={current.destructive ? 'destructive' : 'default'} onClick={() => { setChoice(current); setOpen(true); }}>{current.label}</Button>
      {choice ? (
        <ConfirmReasonDialog open={open} title={`${choice.label} ${choice.who}`} effect={choice.effect} confirmLabel={choice.label}
          destructive={choice.destructive} onConfirm={confirm} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
