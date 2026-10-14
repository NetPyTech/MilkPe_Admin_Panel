'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-muted/30 p-4 md:block">
      <div className="mb-6 px-2 text-lg font-semibold">MilkPe Admin</div>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
              className={`block rounded-md px-3 py-2 text-sm ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
