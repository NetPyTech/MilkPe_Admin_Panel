'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmReasonDialog } from '@/components/ConfirmReasonDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { changed, draftOf, summary, valueOf, type Draft } from './form';
import { FieldInput, ListFields, ObjectFields } from './SettingFields';
import { configRowSchema, type ConfigRow } from './schemas';

type Row = Record<string, string | boolean>;
const NOTE = 'The new value reaches every server within 30 seconds.';

/** Server field errors: `{ "PER_KG_RATE": ["..."] }`, or `value` for the whole thing. */
function errorsOf(failure: unknown): Record<string, string[]> {
  const detail = failure instanceof ApiError && failure.status === 400 && failure.body && typeof failure.body === 'object' ? (failure.body as { detail?: unknown }).detail : null;
  if (!detail || typeof detail !== 'object') return {};
  return Object.fromEntries(Object.entries(detail as Record<string, unknown>).map(([name, messages]) => [name, [messages].flat().map(String)]));
}

export function SettingCard({ row, onHistory }: { row: ConfigRow; onHistory: (row: ConfigRow) => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => draftOf(row));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const dirty = changed(row, draft);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['config'] });

  async function save(reason: string) {
    try {
      const saved = await api(`/superadmin/config/${row.key}/`, configRowSchema, { method: 'PUT', body: { value: valueOf(row, draft), reason } });
      setErrors({});
      setDraft(draftOf(saved));
      await refresh();
      toast.success(`${row.label} saved.`);
    } catch (failure) {
      setErrors(errorsOf(failure));
      throw failure;
    }
  }

  async function reset(reason: string) {
    const back = await api(`/superadmin/config/${row.key}/`, configRowSchema, { method: 'DELETE', body: { reason } });
    setErrors({});
    setDraft(draftOf(back));
    await refresh();
    toast.success(`${row.label} is back to its default.`);
  }

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label={row.label}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{row.label}</h3>
          <p className="text-sm text-muted-foreground">{row.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {row.source === 'db' ? <Badge>Changed</Badge> : <Badge variant="outline">Default</Badge>}
          {row.source === 'db' && row.updated_at ? <span>by {row.updated_by ?? 'unknown'}, {formatDateTime(row.updated_at)}</span> : null}
        </div>
      </div>

      {row.kind === 'list' ? (
        <ListFields prefix={row.key} fields={row.fields} draft={draft as Row[]} errors={errors} onChange={setDraft} />
      ) : row.kind === 'object' ? (
        <ObjectFields prefix={row.key} fields={row.fields} draft={draft as Row} errors={errors} onChange={setDraft} />
      ) : (
        <FieldInput id={row.key} field={{ name: 'value', label: row.label, type: row.kind === 'text' ? 'text' : row.kind, min: null, max: null, help: '' }}
          value={draft as string} error={errors.value} onChange={(value) => setDraft(String(value))} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setSaving(true)} disabled={!dirty}>Save {row.label}</Button>
        {dirty ? <Button variant="ghost" onClick={() => { setDraft(draftOf(row)); setErrors({}); }}>Discard</Button> : null}
        {row.source === 'db' ? <Button variant="outline" onClick={() => setResetting(true)}>Back to default</Button> : null}
        <Button variant="ghost" onClick={() => onHistory(row)}>History</Button>
        <span className="ml-auto text-xs text-muted-foreground">In use now: {summary(row)}</span>
      </div>

      <ConfirmReasonDialog open={saving} title={`Save ${row.label}`} effect={`This changes the setting for every dairy and supplier. ${NOTE}`}
        confirmLabel="Save" onConfirm={save} onClose={() => setSaving(false)} />
      <ConfirmReasonDialog open={resetting} title={`Reset ${row.label}`} effect={`The saved value is removed and the default (${summarise(row.default, row)}) is used again. ${NOTE}`}
        confirmLabel="Back to default" destructive onConfirm={reset} onClose={() => setResetting(false)} />
    </section>
  );
}

const summarise = (value: ConfigRow['value'], row: ConfigRow) => summary({ ...row, value });
