'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState } from '@/components/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatUnit } from '@/lib/format';
import { AudiencePicker, DeliveryFields, TextsEditor } from './EditorParts';
import { emptyForm, formFromAnnouncement, payloadFromForm, problemsIn, type Form } from './form';
import { fetchAudienceCount, useAnnouncement, useMeta, useSegments } from './queries';
import { announcementDetailSchema, publishSchema, statusOnlySchema, type AnnouncementDetail, type Meta, type Segment } from './schemas';

const ANNOUNCEMENT = '/superadmin/announcements/';
const LOOK = { draft: 'secondary', scheduled: 'outline', sending: 'outline', sent: 'default', retracted: 'destructive' } as const;

function Stats({ a }: { a: AnnouncementDetail }) {
  const cells: [string, number][] = [['Reached', a.stats.recipients], ['Read', a.stats.read], ['Dismissed from Home', a.stats.dismissed], ['Hidden by their settings', a.stats.hidden_by_mute]];
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {cells.map(([label, value]) => (
        <div key={label} className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold tabular-nums">{formatUnit(String(value), 'count')}</div></div>
      ))}
    </div>
  );
}

function EditorForm({ announcement, meta, segments }: { announcement: AnnouncementDetail | null; meta: Meta; segments: Segment[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setFormState] = useState<Form>(() => (announcement ? formFromAnnouncement(announcement) : emptyForm()));
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<null | 'publish' | 'delete' | 'retract' | 'cancel'>(null);
  const [audience, setAudience] = useState<number | null>(null);
  const [audienceWarnings, setAudienceWarnings] = useState<string[]>([]);
  const setForm = (change: Partial<Form>) => setFormState((current) => ({ ...current, ...change }));

  const status = announcement?.status ?? 'draft';
  const id = announcement?.id ?? null;
  const readOnly = status === 'retracted';
  const lockedAll = status === 'sending' || status === 'sent' || readOnly;
  const problems = problemsIn(form, meta);
  const savedLanguages = announcement ? Object.keys(announcement.translations) : [];

  const refresh = () => Promise.all(['announcement', 'announcements'].map((key) => queryClient.invalidateQueries({ queryKey: ['outreach', key] })));

  /** Save what the form says; for a message already sent only its text and expiry can change. Returns the announcement id. */
  async function save(): Promise<string> {
    const body = payloadFromForm(form, savedLanguages);
    if (!id) {
      const created = await api(ANNOUNCEMENT, announcementDetailSchema.partial({ stats: true }), { method: 'POST', body });
      return created.id;
    }
    const sendable = lockedAll ? { translations: body.translations, expires_at: body.expires_at } : body;
    await api(`${ANNOUNCEMENT}${id}/`, announcementDetailSchema.partial({ stats: true }), { method: 'PATCH', body: sendable });
    return id;
  }

  const run = useMutation({
    mutationFn: async (action: 'save' | 'test' | 'publish') => {
      setError('');
      // Publishing was already saved when the confirmation opened (so the audience could be counted), and the form cannot change behind it.
      const savedId = action === 'publish' && id ? id : await save();
      if (action === 'test') await api(`${ANNOUNCEMENT}${savedId}/test/`, z.unknown(), { method: 'POST', body: {} });
      if (action === 'publish') {
        const send = payloadFromForm(form).send_at;
        await api(`${ANNOUNCEMENT}${savedId}/publish/`, publishSchema, { method: 'POST', body: send ? { send_at: send } : {} });
      }
      return { savedId, action };
    },
    onSuccess: async ({ savedId, action }) => {
      await refresh();
      toast.success(action === 'test' ? 'A test was sent to you.' : action === 'publish' ? 'Published.' : 'Saved.');
      if (!id) router.replace(`/outreach/announcements/${savedId}`);
    },
    onError: (failure: Error) => { setError(failure.message); setDialog(null); },
  });

  const act = useMutation({
    mutationFn: async (action: 'retract' | 'cancel' | 'delete') => {
      if (!id) return;
      if (action === 'delete') await api(`${ANNOUNCEMENT}${id}/`, z.unknown(), { method: 'DELETE' });
      else await api(`${ANNOUNCEMENT}${id}/${action}/`, statusOnlySchema, { method: 'POST', body: {} });
    },
    onSuccess: async (_, action) => {
      await refresh();
      toast.success({ retract: 'Retracted.', cancel: 'Schedule cancelled; it is a draft again.', delete: 'Draft deleted.' }[action]);
      if (action === 'delete') router.replace('/outreach');
    },
  });

  async function openPublish() {
    setError('');
    try {
      const savedId = await save();
      const counted = await fetchAudienceCount(savedId);
      setAudience(counted.count);
      setAudienceWarnings(counted.warnings);
      if (!id) router.replace(`/outreach/announcements/${savedId}`);
      setDialog('publish');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
    }
  }

  const when = form.schedule === 'later' ? `at ${form.sendDate} ${form.sendTime} (India time)` : 'now';
  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{announcement ? announcement.translations.en?.title || 'Announcement' : 'New announcement'}</h1>
        <Badge variant={LOOK[status]}>{status}</Badge>
        {announcement?.overdue ? <Badge variant="destructive">overdue: nothing is sending scheduled messages</Badge> : null}
        {announcement?.status === 'scheduled' && announcement.send_at ? <span className="text-sm text-muted-foreground">Goes out {formatDateTime(announcement.send_at)}</span> : null}
      </div>
      {announcement && status !== 'draft' && status !== 'scheduled' ? <Stats a={announcement} /> : null}
      {lockedAll && !readOnly ? <p className="text-sm text-muted-foreground">This has been sent: only its text and expiry can change (the text updates in people&apos;s inboxes). A push that went out cannot be recalled.</p> : null}
      {readOnly ? <p className="text-sm text-muted-foreground">This was retracted. It is hidden from everyone and can no longer be edited.</p> : null}

      <section className="space-y-4"><h2 className="text-sm font-medium">Who</h2><AudiencePicker form={form} setForm={setForm} meta={meta} segments={segments} disabled={lockedAll} /></section>
      <section className="space-y-4"><h2 className="text-sm font-medium">What</h2><TextsEditor form={form} setForm={setForm} meta={meta} disabled={readOnly} /></section>
      <section className="space-y-4"><h2 className="text-sm font-medium">How and when</h2><DeliveryFields form={form} setForm={setForm} meta={meta} lockedAll={lockedAll} lockedText={readOnly} /></section>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {!readOnly && problems.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => run.mutate('save')} disabled={run.isPending}>{status === 'draft' ? 'Save draft' : 'Save changes'}</Button>
          {!lockedAll ? <Button variant="outline" onClick={() => run.mutate('test')} disabled={run.isPending || problems.length > 0}>Send a test to me</Button> : null}
          {!lockedAll ? <Button onClick={openPublish} disabled={run.isPending || problems.length > 0}>Publish…</Button> : null}
          {status === 'scheduled' ? <Button variant="outline" onClick={() => setDialog('cancel')}>Cancel schedule</Button> : null}
          {status === 'draft' && id ? <Button variant="ghost" onClick={() => setDialog('delete')}>Delete draft</Button> : null}
          {status === 'sending' || status === 'sent' ? <Button variant="destructive" onClick={() => setDialog('retract')}>Retract</Button> : null}
        </div>
      ) : null}

      {dialog === 'publish' ? (
        <ConfirmDialog open title="Publish this announcement?" confirmLabel={form.schedule === 'later' ? 'Schedule' : 'Send now'}
          effect={`It will go to ${formatUnit(String(audience ?? 0), 'count')} ${audience === 1 ? 'person' : 'people'} ${when}${form.sendPush ? ', with a push notification' : ''}. People are chosen when it is sent.${audienceWarnings.length ? ` Note: ${audienceWarnings.join(' ')}` : ''}`}
          onConfirm={async () => { await run.mutateAsync('publish'); }} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === 'delete' ? <ConfirmDialog open title="Delete this draft?" confirmLabel="Delete draft" destructive effect="Nothing has been sent. The draft is removed for good." onConfirm={async () => { await act.mutateAsync('delete'); }} onClose={() => setDialog(null)} /> : null}
      {dialog === 'cancel' ? <ConfirmDialog open title="Cancel the schedule?" confirmLabel="Cancel schedule" effect="It goes back to a draft and nothing is sent." onConfirm={async () => { await act.mutateAsync('cancel'); }} onClose={() => setDialog(null)} /> : null}
      {dialog === 'retract' ? <ConfirmDialog open title="Retract this announcement?" confirmLabel="Retract" destructive effect="It disappears from everyone's inbox and Home screen. Pushes already delivered cannot be recalled. This cannot be undone." onConfirm={async () => { await act.mutateAsync('retract'); }} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

export function AnnouncementEditor({ id }: { id: string | null }) {
  const meta = useMeta();
  const segments = useSegments();
  const announcement = useAnnouncement(id);
  const failed = [meta, segments, ...(id ? [announcement] : [])].find((query) => query.isError);
  if (failed) {
    const error = failed.error as Error;
    return <ErrorState message={error.message} retryAfter={error instanceof ApiError ? error.retryAfter : null} onRetry={() => failed.refetch()} />;
  }
  if (!meta.data || !segments.data || (id && !announcement.data)) {
    return <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }
  return <EditorForm key={`${id}:${announcement.data?.status ?? 'new'}`} announcement={id ? announcement.data ?? null : null} meta={meta.data} segments={segments.data.results} />;
}
