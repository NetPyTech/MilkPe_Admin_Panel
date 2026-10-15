import { useQueryClient } from '@tanstack/react-query';

/** The data a change to a plan's terms or sale status touches: the plan lists and the numbers built from them. */
const CATALOGUE = ['plans', 'plan', 'subscriptions', 'subscription', 'subscription-overview'];
/** A change to who holds a plan (give, extend, cancel, settle) also touches the dairy's page, the Users list (filtered by plan), revenue and the Overview alerts. */
const HOLDERS = [...CATALOGUE, 'user', 'users', 'revenue', 'analytics'];

/** One place that says what to reload after each kind of change, so the screens cannot drift apart. */
export function usePlanRefresh() {
  const queryClient = useQueryClient();
  const run = (keys: string[]) => () => Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
  return { afterPlanChange: run(CATALOGUE), afterHolderChange: run(HOLDERS) };
}
