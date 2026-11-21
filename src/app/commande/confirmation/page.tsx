import { ConfirmationContent } from '@/components/shop/OrderStatusContent';
import { ShopShell } from '@/components/shop/ShopShell';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Confirmation | INSTINCT', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ShopShell>
      <ConfirmationContent />
    </ShopShell>
  );
}
