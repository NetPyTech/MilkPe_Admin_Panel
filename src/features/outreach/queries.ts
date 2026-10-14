import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { announcementDetailSchema, announcementPageSchema, audienceCountSchema, metaSchema, segmentListSchema } from './schemas';

export const useMeta = () => useQuery({ queryKey: ['outreach', 'meta'], queryFn: () => api('/superadmin/announcements/meta/', metaSchema), staleTime: 5 * 60_000 });
export const useSegments = () => useQuery({ queryKey: ['outreach', 'segments'], queryFn: () => api('/superadmin/segments/', segmentListSchema) });

export function useAnnouncements(filters: Record<string, string>) {
  const query = new URLSearchParams(filters).toString();
  return useQuery({ queryKey: ['outreach', 'announcements', query], queryFn: () => api(`/superadmin/announcements/${query ? `?${query}` : ''}`, announcementPageSchema) });
}

export const useAnnouncement = (id: string | null) =>
  useQuery({ queryKey: ['outreach', 'announcement', id], enabled: !!id, queryFn: () => api(`/superadmin/announcements/${id}/`, announcementDetailSchema) });

export const fetchAudienceCount = (id: string) => api(`/superadmin/announcements/${id}/audience-count/`, audienceCountSchema);
