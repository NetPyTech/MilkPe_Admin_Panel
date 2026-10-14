'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActiveUsers, Retention } from '@/features/analytics/EngagementTab';
import { FunnelTab } from '@/features/analytics/FunnelTab';
import { Collections, Geography } from '@/features/analytics/PlacesTab';
import { RangeBar, rangeOf } from '@/features/analytics/RangeBar';
import { TrendsTab } from '@/features/analytics/TrendsTab';
import { Referrals, Usage, Versions } from '@/features/analytics/UsageTab';
import { readFilters, withFilters } from '@/lib/filters';

const TABS = [['trends', 'Trends'], ['funnel', 'Funnel'], ['active', 'Active users'], ['retention', 'Retention'], ['collections', 'Collections'],
  ['usage', 'Usage'], ['versions', 'App versions'], ['referrals', 'Referrals'], ['geography', 'Geography']] as const;
const WITH_RANGE = new Set(['trends', 'funnel', 'collections']);

function GrowthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab') ?? 'trends';
  const values = readFilters(params, ['days', 'from', 'to']);
  const range = rangeOf(values);
  const change = useCallback((changes: Record<string, string | undefined>) => {
    router.replace(`/growth?${withFilters(new URLSearchParams(window.location.search), changes)}`);
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Growth</h1>
      <Tabs value={tab} onValueChange={(value) => change({ tab: String(value) })}>
        <TabsList className="flex-wrap">{TABS.map(([value, label]) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}</TabsList>
        {WITH_RANGE.has(tab) ? <div className="pt-4"><RangeBar values={values} onChange={change} /></div> : null}
        <TabsContent value="trends" className="pt-4"><TrendsTab range={range} /></TabsContent>
        <TabsContent value="funnel" className="pt-4"><FunnelTab range={range} /></TabsContent>
        <TabsContent value="active" className="pt-4"><ActiveUsers /></TabsContent>
        <TabsContent value="retention" className="pt-4"><Retention /></TabsContent>
        <TabsContent value="collections" className="pt-4"><Collections range={range} /></TabsContent>
        <TabsContent value="usage" className="pt-4"><Usage /></TabsContent>
        <TabsContent value="versions" className="pt-4"><Versions /></TabsContent>
        <TabsContent value="referrals" className="pt-4"><Referrals /></TabsContent>
        <TabsContent value="geography" className="pt-4"><Geography /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function GrowthPage() {
  return <Suspense fallback={null}><GrowthScreen /></Suspense>;
}
