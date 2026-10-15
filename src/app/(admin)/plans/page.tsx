'use client';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmReasonDialog } from '@/components/ConfirmReasonDialog';
import { ErrorState } from '@/components/ErrorState';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExtendPlanDialog } from '@/features/plans/ExtendPlanDialog';
import { OverviewCards } from '@/features/plans/OverviewCards';
import { PlansTable } from '@/features/plans/PlansTable';
import { usePlanRefresh } from '@/features/plans/refresh';
import { SUBSCRIPTION_FILTER_KEYS, usePlans, useSubscriptionOverview, useSubscriptions } from '@/features/plans/queries';
import { planSchema, subscriptionDetailSchema, type Plan, type SubscriptionRow } from '@/features/plans/schemas';
import { SubscriptionFilters } from '@/features/plans/SubscriptionFilters';
import { SubscriptionsTable } from '@/features/plans/SubscriptionsTable';
import { UsageDialog } from '@/features/plans/UsageDialog';
import { cursorOf } from '@/features/users/queries';
import { api, ApiError } from '@/lib/api';
import { readFilters, withFilters } from '@/lib/filters';

const Loading = () => <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
const failure = (error: Error, retry?: () => void) => <ErrorState message={error.message} retryAfter={error instanceof ApiError ? error.retryAfter : null} onRetry={retry} />;

type PlanChoice = { plan: Plan; verb: 'sale' | 'delete' };

function PlansTab() {
  const { afterPlanChange } = usePlanRefresh();
  const plans = usePlans();
  const [choice, setChoice] = useState<PlanChoice | null>(null);
  const [open, setOpen] = useState(false);

  async function confirm(reason: string) {
    if (!choice) return;
    const { plan, verb } = choice;
    if (verb === 'delete') {
      await api(`/superadmin/subscription-plans/${plan.id}/`, z.null(), { method: 'DELETE', body: { reason } });
      toast.success(`${plan.name} deleted.`);
    } else {
      await api(`/superadmin/subscription-plans/${plan.id}/`, planSchema, { method: 'PATCH', body: { is_active: !plan.is_active, reason } });
      toast.success(plan.is_active ? `${plan.name} is off sale.` : `${plan.name} is on sale.`);
    }
    await afterPlanChange();
  }
  const pick = (plan: Plan, verb: PlanChoice['verb']) => { setChoice({ plan, verb }); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Plans dairies can buy. While a dairy holds one, collection fees are not taken from its wallet, up to the milk limits you set. A dairy with no plan pays from its wallet as before.
        </p>
        <Link href="/plans/new" className={buttonVariants()}>New plan</Link>
      </div>
      {plans.isPending ? <Loading /> : plans.isError ? failure(plans.error, () => plans.refetch()) : (
        <PlansTable rows={plans.data.results} onToggleSale={(plan) => pick(plan, 'sale')} onDelete={(plan) => pick(plan, 'delete')} />
      )}
      {choice ? (
        <ConfirmReasonDialog
          key={`${choice.plan.id}:${choice.verb}`}
          open={open}
          title={choice.verb === 'delete' ? `Delete ${choice.plan.name}?` : choice.plan.is_active ? `Take ${choice.plan.name} off sale?` : `Put ${choice.plan.name} on sale?`}
          effect={choice.verb === 'delete'
            ? 'No payment or gift was ever made on this plan, so it is removed for good.'
            : choice.plan.is_active
              ? 'Dairies can no longer buy it. Dairies that already hold it keep it until it ends.'
              : 'Dairies can buy it again from the Plans screen of the app.'}
          confirmLabel={choice.verb === 'delete' ? 'Delete plan' : choice.plan.is_active ? 'Take off sale' : 'Put on sale'}
          destructive={choice.verb === 'delete'} onConfirm={confirm} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

type Action = { verb: 'cancel' | 'extend' | 'usage'; row: SubscriptionRow };

/** What cancelling does, said for this subscription: a gift took no money, so there is nothing to return. */
function cancelEffect(row: SubscriptionRow) {
  if (row.state === 'pending') return 'The purchase is closed. If the customer pays anyway, the plan still starts.';
  const refund = row.source === 'grant' ? 'This was a gift, so no money was taken.' : 'Nothing is refunded here: return the money through Razorpay yourself.';
  return row.state === 'upcoming'
    ? `It will never start. ${refund}`
    : `It ends today. A plan waiting behind it starts at once; with none waiting, the dairy’s wallet pays the fee again. ${refund}`;
}

function SubscriptionsTab() {
  const router = useRouter();
  const params = useSearchParams();
  const { afterHolderChange: refresh } = usePlanRefresh();
  const filters = readFilters(params, SUBSCRIPTION_FILTER_KEYS);
  const overview = useSubscriptionOverview();
  const plans = usePlans();
  const rows = useSubscriptions(filters, params.get('cursor') ?? undefined);
  const [action, setAction] = useState<Action | null>(null);
  const [open, setOpen] = useState(false);
  const [settling, setSettling] = useState<ReadonlySet<string>>(new Set());   // every reconcile still running, not only the latest
  const change = useCallback((changes: Record<string, string | undefined>) => {
    router.replace(`/plans?${withFilters(new URLSearchParams(window.location.search), changes)}`);
  }, [router]);

  const reconcile = useMutation({
    mutationFn: (row: SubscriptionRow) => api(`/superadmin/subscriptions/${row.id}/reconcile/`, subscriptionDetailSchema, { method: 'POST', body: {} }),
    onMutate: (row) => setSettling((current) => new Set(current).add(row.id)),
    onSuccess: async (result) => {
      toast.success(result.state === 'active' ? 'Payment settled and the plan started.' : 'Payment settled. The plan is confirmed and starts later.');
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: (_data, _error, row) => setSettling((current) => { const next = new Set(current); next.delete(row.id); return next; }),
  });

  async function cancel(reason: string) {
    if (!action) return;
    await api(`/superadmin/subscriptions/${action.row.id}/cancel/`, subscriptionDetailSchema, { method: 'POST', body: { reason } });
    toast.success('Subscription cancelled.');
    await refresh();
  }

  const who = action ? action.row.user.name || action.row.user.phone_number : '';
  return (
    <div className="space-y-4">
      {overview.isPending ? <Skeleton className="h-20 w-full" /> : overview.isError ? failure(overview.error, () => overview.refetch()) : <OverviewCards data={overview.data} />}
      <SubscriptionFilters values={filters} plans={plans.data?.results ?? []} onChange={change} onClear={() => router.replace('/plans?tab=subscriptions')} />
      {rows.isPending ? <Loading /> : rows.isError ? failure(rows.error, () => rows.refetch()) : (
        <>
          <SubscriptionsTable rows={rows.data.results} busyIds={settling}
            onDetails={(row) => { setAction({ verb: 'usage', row }); setOpen(true); }}
            onExtend={(row) => { setAction({ verb: 'extend', row }); setOpen(true); }}
            onCancel={(row) => { setAction({ verb: 'cancel', row }); setOpen(true); }}
            onReconcile={(row) => reconcile.mutate(row)} />
          <div className="flex justify-between">
            <Button variant="outline" size="sm" disabled={!rows.data.previous} onClick={() => change({ cursor: cursorOf(rows.data.previous) })}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!rows.data.next} onClick={() => change({ cursor: cursorOf(rows.data.next) })}>Next</Button>
          </div>
        </>
      )}
      {action?.verb === 'usage' && open ? <UsageDialog row={action.row} onClose={() => setOpen(false)} /> : null}
      {action?.verb === 'extend' && open ? <ExtendPlanDialog row={action.row} onClose={() => setOpen(false)} /> : null}
      {action?.verb === 'cancel' ? (
        <ConfirmReasonDialog key={action.row.id} open={open} destructive title={`Cancel ${action.row.plan.name} for ${who}?`} confirmLabel="Cancel subscription"
          effect={cancelEffect(action.row)}
          onConfirm={cancel} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

function PlansScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab') === 'subscriptions' ? 'subscriptions' : 'plans';   // anything else (a stale or mistyped link) opens the Plans tab
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Plans</h1>
      <Tabs value={tab} onValueChange={(value) => router.replace(`/plans?tab=${String(value)}`)}>
        <TabsList><TabsTrigger value="plans">Plans</TabsTrigger><TabsTrigger value="subscriptions">Subscriptions</TabsTrigger></TabsList>
        <TabsContent value="plans" className="pt-4"><PlansTab /></TabsContent>
        <TabsContent value="subscriptions" className="pt-4"><SubscriptionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function PlansPage() {
  return <Suspense fallback={null}><PlansScreen /></Suspense>;
}
