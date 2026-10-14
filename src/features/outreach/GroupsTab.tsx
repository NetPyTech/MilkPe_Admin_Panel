'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { QueryState } from '@/components/QueryState';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDateTime, formatUnit } from '@/lib/format';
import { GroupEditor } from './GroupEditor';
import { useMeta, useSegments } from './queries';
import type { RuleDef, Rules, Segment } from './schemas';
import { z } from 'zod';

export function describeRules(rules: Rules, defs: RuleDef[]): string {
  return Object.entries(rules).map(([key, value]) => {
    const def = defs.find((d) => d.key === key);
    if (!def) return `${key}: ${value}`;
    if (def.type === 'flag') return def.label;
    const shown = def.type === 'choice' ? def.choices.find((c) => c.value === String(value))?.label ?? String(value) : String(value);
    return `${def.label}: ${shown}`;
  }).join(' · ');
}

export function GroupsTab() {
  const queryClient = useQueryClient();
  const meta = useMeta();
  const groups = useSegments();
  const [editing, setEditing] = useState<Segment | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Segment | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api(`/superadmin/segments/${id}/`, z.unknown(), { method: 'DELETE' }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['outreach', 'segments'] }); toast.success('Group deleted.'); },
  });
  const defs = meta.data?.segment_rules ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Saved sets of filters, with how many people each reaches now.</p>
        <Button onClick={() => setEditing('new')} disabled={!meta.data}>New group</Button>
      </div>
      <QueryState query={groups}>
        {(data) => data.results.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No groups yet. Create one to reuse it in announcements.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Filters</TableHead><TableHead className="text-right">People now</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {data.results.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="max-w-md text-xs text-muted-foreground">{describeRules(group.rules, defs)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUnit(String(group.count), 'count')}</TableCell>
                  <TableCell>{formatDateTime(group.updated_at)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(group)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(group)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryState>
      {editing && meta.data ? <GroupEditor defs={defs} group={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog open title={`Delete “${deleting.name}”?`} confirmLabel="Delete group" destructive
          effect="Announcements already written to this group keep their own copy of the filters and are not affected."
          onConfirm={async () => { await remove.mutateAsync(deleting.id); }} onClose={() => setDeleting(null)} />
      ) : null}
    </div>
  );
}
