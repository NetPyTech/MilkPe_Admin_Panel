import { useQuery } from '@tanstack/react-query';
import { api, page } from '@/lib/api';
import { balancesSchema, paymentRowSchema, revenueSchema } from './schemas';

export const PAYMENT_FILTER_KEYS = ['status', 'category', 'type', 'from', 'to', 'search', 'stuck', 'user', 'page_size'] as const;

export function usePayments(filters: Record<string, string>, cursor?: string) {
  const query = new URLSearchParams({ ...filters, ...(cursor ? { cursor } : {}) }).toString();
  return useQuery({ queryKey: ['payments', query], queryFn: () => api(`/superadmin/payments/${query ? `?${query}` : ''}`, page(paymentRowSchema)) });
}

export function useRevenue(filters: Record<string, string>) {
  const query = new URLSearchParams(filters).toString();
  return useQuery({ queryKey: ['revenue', query], queryFn: () => api(`/superadmin/money/revenue/${query ? `?${query}` : ''}`, revenueSchema) });
}

export const useBalances = () =>
  useQuery({ queryKey: ['balances'], queryFn: () => api('/superadmin/money/balances/', balancesSchema) });
