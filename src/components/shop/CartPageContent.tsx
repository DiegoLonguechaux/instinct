'use client';

import { formatPrice } from '@/lib/merch';
import Link from 'next/link';
import { CartLines } from './CartLines';
import { useCart } from './CartProvider';
import { shopButtonClass } from './styles';
import { useCartDetails } from './useCartDetails';

export function CartPageContent() {
  const { ready } = useCart();
  const { cart, isLoading, error, notice } = useCartDetails();
  const isEmpty = ready && !isLoading && (cart?.lines.length ?? 0) === 0;

  if (!ready || (isLoading && !cart)) {
    return <p className="text-instinct-foreground/60">Chargement...</p>;
  }

  if (isEmpty) {
    return (
      <div className="py-12 text-center">
        <p className="text-instinct-foreground/70">Votre panier est vide.</p>
        <Link
          href="/#le-merch"
          className="mt-4 inline-block text-sm font-semibold tracking-widest text-instinct-purple uppercase underline"
        >
          Voir le merch
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        {notice && <p className="mb-4 border border-instinct-purple/60 p-3 text-sm">{notice}</p>}
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {cart && <CartLines lines={cart.lines} />}
      </div>

      {cart && (
        <aside className="h-fit border border-instinct-foreground/20 p-6">
          <h2 className="mb-4 font-serif text-2xl uppercase">Récapitulatif</h2>
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Sous-total</span>
            <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
          </div>
          <p className="mt-1 mb-6 text-xs text-instinct-foreground/60">
            Frais de livraison calculés à l’étape suivante.
          </p>
          <Link href="/commande" className={shopButtonClass}>
            Commander
          </Link>
        </aside>
      )}
    </div>
  );
}
