'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { formatUnit } from '@/lib/format';
import { cleanRules, RuleBuilder } from './RuleBuilder';
import { previewSchema, segmentSchema, type RuleDef, type Rules, type Segment } from './schemas';

/** The people a set of filters reaches, counted by the server as the filters change. */
export function usePreview(rules: Rules) {
  const ready = cleanRules(rules);
  const [settled, setSettled] = useState(ready);
  const key = JSON.stringify(ready);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(JSON.parse(key) as Rules), 350);
    return () => clearTimeout(timer);
  }, [key]);
  return useQuery({
    queryKey: ['outreach', 'preview', JSON.stringify(settled)], enabled: Object.keys(settled).length > 0, retry: false,
    queryFn: () => api('/superadmin/segments/preview/', previewSchema, { method: 'POST', body: { rules: settled } }),
  });
}

export function PreviewPanel({ rules }: { rules: Rules }) {
  const preview = usePreview(rules);
  if (Object.keys(cleanRules(rules)).length === 0) return <p className="text-sm text-muted-foreground">Add a filter to see who it reaches.</p>;
  if (preview.isPending) return <p className="text-sm text-muted-foreground">Counting…</p>;
  if (preview.isError) return <p role="alert" className="text-sm text-destructive">{preview.error instanceof ApiError ? preview.error.message : 'Could not count.'}</p>;
  const { count, sample, warnings } = preview.data;
  return (
    <div className="space-y-2 rounded-lg border p-3" aria-live="polite">
      <p className="text-sm"><span className="text-xl font-semibold tabular-nums">{formatUnit(String(count), 'count')}</span> {count === 1 ? 'person' : 'people'} match now</p>
      {warnings.map((note) => <p key={note} role="note" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">⚠ {note}</p>)}
      {sample.length ? <ul className="text-xs text-muted-foreground">{sample.map((u) => <li key={u.id}>{u.name || 'No name'} · {u.phone_number} · {u.language}</li>)}</ul> : null}
    </div>
  );
}

export function GroupEditor({ defs, group, onClose }: { defs: RuleDef[]; group: Segment | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(group?.name ?? '');
  const [rules, setRules] = useState<Rules>(group?.rules ?? {});
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => api(group ? `/superadmin/segments/${group.id}/` : '/superadmin/segments/', segmentSchema, { method: group ? 'PATCH' : 'POST', body: { name: name.trim(), rules: cleanRules(rules) } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['outreach', 'segments'] });
      toast.success(group ? 'Group saved.' : 'Group created.');
      onClose();
    },
    onError: (failure: Error) => setError(failure.message),
  });
  const ready = name.trim().length > 0 && Object.keys(cleanRules(rules)).length > 0;
  return (
    <Dialog open onOpenChange={(next) => { if (!next && !save.isPending) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit group' : 'New group'}</DialogTitle>
          <DialogDescription>A group is a set of filters. Announcements copy them when they are written, so changing a group later never changes a message already planned.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Name</Label>
            <Input id="group-name" value={name} maxLength={80} onValueChange={setName} placeholder="e.g. Dairies in their last trial week" />
          </div>
          <RuleBuilder defs={defs} rules={rules} onChange={setRules} />
          <PreviewPanel rules={rules} />
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => { setError(''); save.mutate(); }} disabled={!ready || save.isPending}>{group ? 'Save group' : 'Create group'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
