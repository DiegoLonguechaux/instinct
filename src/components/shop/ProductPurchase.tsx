'use client';

import { LOW_STOCK_THRESHOLD } from '@/lib/merch';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useCart } from './CartProvider';
import { shopButtonClass } from './styles';

type Variant = { size: string; quantity: number };

type ProductPurchaseProps = {
  merchId: string;
  variants: Variant[];
  /** Vendable en ligne ? Sinon on explique que c'est réservé aux concerts. */
  sellOnline: boolean;
};

export function ProductPurchase({ merchId, variants, sellOnline }: ProductPurchaseProps) {
  const { add, open, lines } = useCart();
  const hasSizes = variants.some((variant) => variant.size !== '');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const totalStock = variants.reduce((sum, variant) => sum + variant.quantity, 0);

  if (!sellOnline) {
    return (
      <p className="border border-instinct-foreground/30 p-4 text-sm text-instinct-foreground/80">
        Cet article est disponible uniquement lors de nos concerts.
      </p>
    );
  }

  if (totalStock === 0) {
    return (
      <p className="border border-instinct-foreground/30 p-4 text-sm font-semibold tracking-widest uppercase">
        Épuisé
      </p>
    );
  }

  const selected = variants.find((variant) => variant.size === size);
  // Ce qui est déjà dans le panier compte dans la limite.
  const inCart = lines.find((line) => line.merchId === merchId && line.size === size)?.quantity ?? 0;
  const remaining = selected ? Math.max(0, Math.min(selected.quantity, 10) - inCart) : 0;

  const handleAdd = () => {
    if (hasSizes && !selected) {
      setError('Choisissez une taille.');
      return;
    }
    if (remaining <= 0) {
      setError('Vous avez déjà le maximum disponible dans votre panier.');
      return;
    }
    add(merchId, size, Math.min(quantity, remaining));
    setError('');
    setQuantity(1);
    open();
  };

  return (
    <div className="space-y-6">
      {hasSizes && (
        <div>
          <p className="mb-3 text-sm font-semibold tracking-widest uppercase">Taille</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Taille">
            {variants.map((variant) => (
              <button
                key={variant.size}
                type="button"
                role="radio"
                aria-checked={size === variant.size}
                disabled={variant.quantity === 0}
                onClick={() => {
                  setSize(variant.size);
                  setQuantity(1);
                  setError('');
                }}
                className={cn(
                  'min-w-14 border px-4 py-3 text-sm font-semibold cursor-pointer',
                  size === variant.size
                    ? 'border-instinct-purple bg-instinct-purple text-instinct-bg'
                    : 'border-instinct-foreground/40 hover:border-instinct-purple',
                  variant.quantity === 0 && 'cursor-not-allowed line-through opacity-30 hover:border-instinct-foreground/40'
                )}
              >
                {variant.size}
              </button>
            ))}
          </div>
          {selected && selected.quantity <= LOW_STOCK_THRESHOLD && (
            <p className="mt-2 text-sm text-instinct-purple">Plus que {selected.quantity} en stock</p>
          )}
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold tracking-widest uppercase">Quantité</p>
        <div className="inline-flex items-center border border-instinct-foreground/40">
          <button
            type="button"
            aria-label="Diminuer la quantité"
            className="flex size-11 items-center justify-center hover:bg-instinct-foreground/10 cursor-pointer"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center tabular-nums">{quantity}</span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            className="flex size-11 items-center justify-center hover:bg-instinct-foreground/10 cursor-pointer"
            onClick={() => setQuantity((q) => Math.min(Math.max(remaining, 1), q + 1))}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button type="button" onClick={handleAdd} className={shopButtonClass + ' cursor-pointer'}>
        Ajouter au panier
      </button>
    </div>
  );
}
