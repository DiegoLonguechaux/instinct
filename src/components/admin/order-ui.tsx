'use client';

import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/order-status';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type AdminOrder = {
  id: string;
  number: string;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string; note: string; by: string }[];
  items: { merchId: string; title: string; size: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  shippingCost: number;
  total: number;
  customer: { email: string; firstName: string; lastName: string; phone: string };
  delivery: {
    mode: 'relay' | 'home';
    label: string;
    offerCode: string;
    relayPoint: { code: string; network: string; name: string; street: string; postalCode: string; city: string } | null;
    address: { street: string; complement: string; postalCode: string; city: string } | null;
    weightGrams: number;
  };
  payment: { stripePaymentIntentId: string; stripeFee: number; paidAt: string | null; refundedAt: string | null };
  shipment: {
    boxtalOrderId: string;
    trackingNumber: string;
    trackingUrl: string;
    labelUrl: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  internalNote: string;
  createdAt: string;
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending_payment: 'bg-muted text-muted-foreground',
  paid: 'bg-amber-500/15 text-amber-400',
  preparing: 'bg-blue-500/15 text-blue-400',
  shipped: 'bg-violet-100 text-violet-800',
  delivered: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-muted text-foreground',
  refunded: 'bg-red-500/15 text-red-400',
  expired: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

const TABS = [
  { href: '/admin/commandes', label: 'Commandes' },
  { href: '/admin/commandes/reglages', label: 'Réglages boutique' },
];

export function OrdersNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Boutique en ligne">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'shrink-0 rounded-full border px-4 py-2 text-sm font-medium',
            pathname === tab.href ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
