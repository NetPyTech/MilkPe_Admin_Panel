import { useQuery } from '@tanstack/react-query';
import { api, page } from '@/lib/api';
import { userDetailSchema, userRowSchema } from './schemas';

export const USER_FILTER_KEYS = ['search', 'role', 'language', 'is_active', 'has_logged_in', 'joined_from', 'joined_to', 'trial', 'plan', 'state', 'district', 'balance_below', 'inactive_days', 'page_size'] as const;

export const cursorOf = (url: string | null) => (url ? new URL(url).searchParams.get('cursor') ?? undefined : undefined);

export function useUsers(filters: Record<string, string>, cursor?: string) {
  const query = new URLSearchParams({ ...filters, ...(cursor ? { cursor } : {}) }).toString();
  return useQuery({ queryKey: ['users', query], queryFn: () => api(`/superadmin/users/${query ? `?${query}` : ''}`, page(userRowSchema)) });
}

export const useUser = (id: string) =>
  useQuery({ queryKey: ['user', id], queryFn: () => api(`/superadmin/users/${id}/`, userDetailSchema) });
