import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { configHistorySchema, configListSchema, deletionPageSchema } from './schemas';

export const useConfig = () => useQuery({ queryKey: ['config'], queryFn: () => api('/superadmin/config/', configListSchema) });

export const useConfigHistory = (key: string | null) =>
  useQuery({ queryKey: ['config', 'history', key], enabled: !!key, queryFn: () => api(`/superadmin/config/${key}/history/`, configHistorySchema) });

/** One page of the deletion queue (the backend pages by number; page 1 is the default). */
export function useDeletionRequests(status: string, page = 1) {
  const query = new URLSearchParams({ ...(status ? { status } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
  return useQuery({ queryKey: ['deletions', status, page], queryFn: () => api(`/superadmin/deletion-requests/${query ? `?${query}` : ''}`, deletionPageSchema) });
}
