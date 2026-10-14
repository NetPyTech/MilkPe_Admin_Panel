'use client';
import Link from 'next/link';
import { AnnouncementEditor } from '@/features/outreach/AnnouncementEditor';

export default function NewAnnouncementPage() {
  return (
    <div className="space-y-4">
      <Link href="/outreach" className="text-sm text-muted-foreground hover:underline">← Back to outreach</Link>
      <AnnouncementEditor id={null} />
    </div>
  );
}
