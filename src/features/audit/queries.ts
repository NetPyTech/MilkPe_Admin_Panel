import { useQuery } from '@tanstack/react-query';
import { api, page } from '@/lib/api';
import { auditRowSchema } from './schemas';

export const AUDIT_FILTER_KEYS = ['action', 'target_type', 'target_id', 'from', 'to', 'page_size'] as const;

export function useAudit(filters: Record<string, string>, cursor?: string) {
  const query = new URLSearchParams({ ...filters, ...(cursor ? { cursor } : {}) }).toString();
  return useQuery({ queryKey: ['audit', query], queryFn: () => api(`/superadmin/audit/${query ? `?${query}` : ''}`, page(auditRowSchema)) });
}
