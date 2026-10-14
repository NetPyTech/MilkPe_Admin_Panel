'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnnouncementsTab } from '@/features/outreach/AnnouncementsTab';
import { GroupsTab } from '@/features/outreach/GroupsTab';

function OutreachScreen() {
  const router = useRouter();
  const tab = useSearchParams().get('tab') ?? 'announcements';
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Outreach</h1>
      <Tabs value={tab} onValueChange={(value) => router.replace(`/outreach?tab=${String(value)}`)}>
        <TabsList><TabsTrigger value="announcements">Announcements</TabsTrigger><TabsTrigger value="groups">Groups</TabsTrigger></TabsList>
        <TabsContent value="announcements" className="pt-4"><AnnouncementsTab /></TabsContent>
        <TabsContent value="groups" className="pt-4"><GroupsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default function OutreachPage() {
  return <Suspense fallback={null}><OutreachScreen /></Suspense>;
}
