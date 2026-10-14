'use client';
import Link from 'next/link';
import { use } from 'react';
import { AnnouncementEditor } from '@/features/outreach/AnnouncementEditor';

export default function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-4">
      <Link href="/outreach" className="text-sm text-muted-foreground hover:underline">← Back to outreach</Link>
      <AnnouncementEditor id={id} />
    </div>
  );
}
