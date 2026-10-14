import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';
import { api } from '@/lib/api';
import {
  activeSchema, collectionsDaySchema, collectionsPlacesSchema, funnelSchema, geoSchema, growthSchema, overviewSchema, referralsSchema, retentionSchema, usageSchema,
  versionsSchema,
} from './schemas';

/** A GET of `/superadmin/<path>` with the given query values; the query key carries the path and the values. */
function useRead<T extends z.ZodTypeAny>(path: string, schema: T, params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  return useQuery({ queryKey: ['analytics', path, query], queryFn: () => api(`/superadmin/${path}/${query ? `?${query}` : ''}`, schema) as Promise<z.infer<T>> });
}

export const useOverview = () => useRead('overview', overviewSchema);
export const useGrowth = (range: Record<string, string>) => useRead('analytics/growth', growthSchema, range);
export const useFunnel = (range: Record<string, string>) => useRead('analytics/funnel', funnelSchema, range);
export const useActive = (days: string) => useRead('analytics/active', activeSchema, { days });
export const useRetention = (weeks: string) => useRead('analytics/retention', retentionSchema, { weeks });
export const useCollectionsByDay = (range: Record<string, string>) => useRead('analytics/collections', collectionsDaySchema, { ...range, group: 'day' });
export const useCollectionsByPlace = (group: 'state' | 'district' | 'route', range: Record<string, string>) =>
  useRead('analytics/collections', collectionsPlacesSchema, { ...range, group });
export const useUsage = () => useRead('analytics/usage', usageSchema);
export const useVersions = () => useRead('analytics/versions', versionsSchema);
export const useReferrals = () => useRead('analytics/referrals', referralsSchema);
export const useGeo = () => useRead('analytics/geo', geoSchema);
