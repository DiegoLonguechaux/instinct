import { RecapContent } from '@/components/shop/RecapContent';
import { ShopShell } from '@/components/shop/ShopShell';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Récapitulatif | INSTINCT', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ShopShell>
      <h1 className="mb-8 font-serif text-4xl uppercase sm:text-5xl">Récapitulatif de la commande</h1>
      <RecapContent />
    </ShopShell>
  );
}
