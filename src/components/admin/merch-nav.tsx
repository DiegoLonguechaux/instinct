'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/merch', label: 'Produits' },
  { href: '/admin/merch/caisse', label: 'Caisse' },
  { href: '/admin/merch/stock', label: 'Stock' },
  { href: '/admin/merch/statistiques', label: 'Statistiques' },
];

export function MerchNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Gestion du merch">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'shrink-0 rounded-full border px-4 py-2 text-sm font-medium',
            pathname === tab.href
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-foreground hover:bg-muted'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
