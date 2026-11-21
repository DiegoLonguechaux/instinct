import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { ShopShell } from '@/components/shop/ShopShell';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Commande | INSTINCT', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ShopShell>
      <h1 className="mb-8 font-serif text-4xl uppercase sm:text-5xl">Commande</h1>
      <CheckoutForm />
    </ShopShell>
  );
}
