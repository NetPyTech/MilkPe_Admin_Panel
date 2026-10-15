import { useQuery } from '@tanstack/react-query';
import { api, page } from '@/lib/api';
import { overviewSchema, planListSchema, planSchema, subscriptionDetailSchema, subscriptionRowSchema } from './schemas';

export const SUBSCRIPTION_FILTER_KEYS = ['state', 'source', 'plan', 'user', 'ending_within', 'stuck', 'from', 'to', 'search', 'page_size'] as const;

export const usePlans = () =>
  useQuery({ queryKey: ['plans'], queryFn: () => api('/superadmin/subscription-plans/', planListSchema) });

export const usePlan = (id: string) =>
  useQuery({ queryKey: ['plan', id], queryFn: () => api(`/superadmin/subscription-plans/${id}/`, planSchema) });

export function useSubscriptions(filters: Record<string, string>, cursor?: string) {
  const query = new URLSearchParams({ ...filters, ...(cursor ? { cursor } : {}) }).toString();
  return useQuery({ queryKey: ['subscriptions', query], queryFn: () => api(`/superadmin/subscriptions/${query ? `?${query}` : ''}`, page(subscriptionRowSchema)) });
}

export const useSubscription = (id: string | null) =>
  useQuery({ queryKey: ['subscription', id], enabled: !!id, queryFn: () => api(`/superadmin/subscriptions/${id}/`, subscriptionDetailSchema) });

export const useSubscriptionOverview = () =>
  useQuery({ queryKey: ['subscription-overview'], queryFn: () => api('/superadmin/subscriptions/overview/', overviewSchema) });
