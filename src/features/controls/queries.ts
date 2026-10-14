import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { configHistorySchema, configListSchema, deletionPageSchema } from './schemas';

export const useConfig = () => useQuery({ queryKey: ['config'], queryFn: () => api('/superadmin/config/', configListSchema) });

export const useConfigHistory = (key: string | null) =>
  useQuery({ queryKey: ['config', 'history', key], enabled: !!key, queryFn: () => api(`/superadmin/config/${key}/history/`, configHistorySchema) });

export function useDeletionRequests(status: string) {
  const query = status ? `?status=${status}` : '';
  return useQuery({ queryKey: ['deletions', status], queryFn: () => api(`/superadmin/deletion-requests/${query}`, deletionPageSchema) });
}
