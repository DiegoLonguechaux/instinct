import { CartPageContent } from '@/components/shop/CartPageContent';
import { ShopShell } from '@/components/shop/ShopShell';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Panier | INSTINCT' };
export const dynamic = 'force-dynamic';

export default function CartPage() {
  return (
    <ShopShell>
      <h1 className="mb-8 font-serif text-4xl uppercase sm:text-5xl">Panier</h1>
      <CartPageContent />
    </ShopShell>
  );
}
