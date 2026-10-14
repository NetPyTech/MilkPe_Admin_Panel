'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BalancesCards } from '@/features/money/BalancesCards';
import { PaymentFilters } from '@/features/money/PaymentFilters';
import { PaymentsTable } from '@/features/money/PaymentsTable';
import { PAYMENT_FILTER_KEYS, useBalances, usePayments, useRevenue } from '@/features/money/queries';
import { paymentRowSchema } from '@/features/money/schemas';
import { RevenueTable } from '@/features/money/RevenueTable';
import { cursorOf } from '@/features/users/queries';
import { api, ApiError } from '@/lib/api';
import { readFilters, withFilters } from '@/lib/filters';

const Loading = () => <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
const failure = (error: Error) => <ErrorState message={error.message} retryAfter={error instanceof ApiError ? error.retryAfter : null} />;

function Payments() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const filters = readFilters(params, PAYMENT_FILTER_KEYS);
  const payments = usePayments(filters, params.get('cursor') ?? undefined);
  const change = useCallback((changes: Record<string, string | undefined>) => {
    router.replace(`/money?${withFilters(new URLSearchParams(window.location.search), changes)}`);
  }, [router]);
  const reconcile = useMutation({
    mutationFn: (id: string) => api(`/superadmin/payments/${id}/reconcile/`, paymentRowSchema, { method: 'POST', body: {} }),
    onSuccess: async () => {
      toast.success('Payment settled and the wallet credited.');
      await Promise.all(['payments', 'balances', 'revenue', 'user'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="space-y-4">
      <PaymentFilters values={filters} onChange={change} onClear={() => router.replace('/money')} />
      {payments.isPending ? <Loading /> : payments.isError ? <ErrorState message={payments.error.message} onRetry={() => payments.refetch()} /> : (
        <>
          <PaymentsTable rows={payments.data.results} onReconcile={(id) => reconcile.mutate(id)} busyId={reconcile.isPending ? reconcile.variables : null} />
          <div className="flex justify-between">
            <Button variant="outline" size="sm" disabled={!payments.data.previous} onClick={() => change({ cursor: cursorOf(payments.data.previous) })}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!payments.data.next} onClick={() => change({ cursor: cursorOf(payments.data.next) })}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Revenue() {
  const [range, setRange] = useState<Record<string, string>>({ group: 'day' });
  const revenue = useRevenue(range);
  const set = (key: string, value: string) => setRange((current) => ({ ...current, [key]: value }));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4">
        <div className="space-y-1.5"><Label htmlFor="r-from">From</Label><Input id="r-from" type="date" value={range.from ?? ''} onValueChange={(v) => set('from', v)} /></div>
        <div className="space-y-1.5"><Label htmlFor="r-to">To</Label><Input id="r-to" type="date" value={range.to ?? ''} onValueChange={(v) => set('to', v)} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="r-group">Group by</Label>
          <select id="r-group" value={range.group} onChange={(e) => set('group', e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
          </select>
        </div>
        <p className="self-end text-xs text-muted-foreground">Recharges are money in; fees are the balance being used; bonuses and payouts are a cost. They are shown apart, never added up.</p>
      </div>
      {revenue.isPending ? <Loading /> : revenue.isError ? failure(revenue.error) : <RevenueTable data={revenue.data} />}
    </div>
  );
}

function Balances() {
  const balances = useBalances();
  return balances.isPending ? <Loading /> : balances.isError ? failure(balances.error) : <BalancesCards data={balances.data} />;
}

function MoneyScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab') ?? 'payments';
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Money</h1>
      <Tabs value={tab} onValueChange={(value) => router.replace(`/money?tab=${String(value)}`)}>
        <TabsList><TabsTrigger value="payments">Payments</TabsTrigger><TabsTrigger value="revenue">Revenue</TabsTrigger><TabsTrigger value="balances">Balances</TabsTrigger></TabsList>
        <TabsContent value="payments" className="pt-4"><Payments /></TabsContent>
        <TabsContent value="revenue" className="pt-4"><Revenue /></TabsContent>
        <TabsContent value="balances" className="pt-4"><Balances /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function MoneyPage() {
  return <Suspense fallback={null}><MoneyScreen /></Suspense>;
}
