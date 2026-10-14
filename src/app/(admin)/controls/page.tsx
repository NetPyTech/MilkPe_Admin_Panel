'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeletionTab } from '@/features/controls/DeletionTab';
import { HistoryDialog } from '@/features/controls/HistoryDialog';
import { useConfig } from '@/features/controls/queries';
import type { ConfigRow } from '@/features/controls/schemas';
import { SettingCard } from '@/features/controls/SettingCard';
import { ApiError } from '@/lib/api';

function Settings() {
  const config = useConfig();
  const [history, setHistory] = useState<ConfigRow | null>(null);
  if (config.isPending) return <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>;
  if (config.isError) return <ErrorState message={config.error.message} retryAfter={config.error instanceof ApiError ? config.error.retryAfter : null} onRetry={() => config.refetch()} />;
  const groups = [...new Set(config.data.results.map((row) => row.group))];
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Changing a setting affects every dairy and supplier. Each change needs a written reason, is kept in the audit log and reaches every server within 30 seconds.</p>
      {groups.map((group) => (
        <section key={group} className="space-y-3" aria-label={group}>
          <h2 className="text-base font-semibold">{group}</h2>
          {config.data.results.filter((row) => row.group === group).map((row) => <SettingCard key={`${row.key}-${row.updated_at}`} row={row} onHistory={setHistory} />)}
        </section>
      ))}
      <HistoryDialog row={history} onClose={() => setHistory(null)} />
    </div>
  );
}

function ControlsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab') ?? 'settings';
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Controls</h1>
      <Tabs value={tab} onValueChange={(value) => router.replace(`/controls?tab=${String(value)}`)}>
        <TabsList><TabsTrigger value="settings">Settings</TabsTrigger><TabsTrigger value="deletions">Account deletion</TabsTrigger></TabsList>
        <TabsContent value="settings" className="pt-4"><Settings /></TabsContent>
        <TabsContent value="deletions" className="pt-4"><DeletionTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function ControlsPage() {
  return <Suspense fallback={null}><ControlsScreen /></Suspense>;
}
