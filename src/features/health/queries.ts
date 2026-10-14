import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { healthSchema } from './schemas';

/** Refreshes every minute so a stopped job shows up without anyone reloading. */
export const useHealth = () =>
  useQuery({ queryKey: ['health'], queryFn: () => api('/superadmin/health/', healthSchema), refetchInterval: 60_000 });
