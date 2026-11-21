'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartProvider';

export function CartButton() {
  const { count, ready, open } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={ready && count > 0 ? `Ouvrir le panier (${count} article${count > 1 ? 's' : ''})` : 'Ouvrir le panier'}
      className="relative text-instinct-foreground transition-colors hover:text-instinct-purple"
    >
      <ShoppingBag className="size-6" />
      {ready && count > 0 && (
        <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-instinct-purple text-[11px] font-bold text-instinct-bg">
          {count}
        </span>
      )}
    </button>
  );
}
