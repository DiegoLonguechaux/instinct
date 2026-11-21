'use client';

import { formatPrice } from '@/lib/merch';
import type { ResolvedLine } from '@/lib/shop';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from './CartProvider';

type CartLinesProps = {
  lines: ResolvedLine[];
  /** Appelé quand on clique sur un produit (ex. fermer le tiroir). */
  onNavigate?: () => void;
};

export function CartLines({ lines, onNavigate }: CartLinesProps) {
  const { setQuantity, remove } = useCart();

  return (
    <ul className="divide-y divide-instinct-foreground/15">
      {lines.map((line) => (
        <li key={line.key} className="flex gap-4 py-4">
          <Link
            href={`/merch/${line.slug}`}
            onClick={onNavigate}
            className="relative block h-24 w-20 shrink-0 overflow-hidden bg-instinct-foreground/10"
          >
            {line.image && (
              <Image src={line.image} alt={line.title} fill sizes="80px" className="object-cover" />
            )}
          </Link>

          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/merch/${line.slug}`}
                  onClick={onNavigate}
                  className="block truncate font-semibold hover:text-instinct-purple"
                >
                  {line.title}
                </Link>
                {line.size && <p className="text-sm text-instinct-foreground/60">Taille {line.size}</p>}
              </div>
              <p className="shrink-0 font-semibold tabular-nums">{formatPrice(line.unitPrice * line.quantity)}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center border border-instinct-foreground/30">
                <button
                  type="button"
                  aria-label="Diminuer la quantité"
                  className="flex size-9 items-center justify-center hover:bg-instinct-foreground/10"
                  onClick={() => setQuantity(line.merchId, line.size, line.quantity - 1)}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Augmenter la quantité"
                  disabled={line.quantity >= line.available}
                  className="flex size-9 items-center justify-center hover:bg-instinct-foreground/10 disabled:opacity-30"
                  onClick={() => setQuantity(line.merchId, line.size, line.quantity + 1)}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                type="button"
                aria-label={`Retirer ${line.title} du panier`}
                className="flex size-9 items-center justify-center text-instinct-foreground/60 hover:text-instinct-purple"
                onClick={() => remove(line.merchId, line.size)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
