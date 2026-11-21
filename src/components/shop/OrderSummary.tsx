'use client';

import { formatPrice } from '@/lib/merch';
import type { ResolvedLine } from '@/lib/shop';
import Image from 'next/image';

type OrderSummaryProps = {
  lines: ResolvedLine[];
  subtotal: number;
  /** undefined tant que le mode de livraison n'est pas choisi. */
  shippingCost?: number;
  footer?: React.ReactNode;
};

export function OrderSummary({ lines, subtotal, shippingCost, footer }: OrderSummaryProps) {
  const total = subtotal + (shippingCost ?? 0);

  return (
    <aside className="h-fit border border-instinct-foreground/20 p-6">
      <h2 className="mb-4 font-serif text-2xl uppercase">Votre commande</h2>

      <ul className="space-y-4">
        {lines.map((line) => (
          <li key={line.key} className="flex gap-3">
            <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-instinct-foreground/10">
              {line.image && <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-semibold">{line.title}</p>
              <p className="text-instinct-foreground/60">
                {line.size && `Taille ${line.size} · `}Qté {line.quantity}
              </p>
            </div>
            <p className="text-sm tabular-nums">{formatPrice(line.unitPrice * line.quantity)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-2 border-t border-instinct-foreground/20 pt-4 text-sm">
        <div className="flex justify-between">
          <dt>Sous-total</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Livraison</dt>
          <dd className="tabular-nums">{shippingCost === undefined ? 'À choisir' : formatPrice(shippingCost)}</dd>
        </div>
        <div className="flex justify-between border-t border-instinct-foreground/20 pt-3 text-lg font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{shippingCost === undefined ? formatPrice(subtotal) : formatPrice(total)}</dd>
        </div>
      </dl>

      {footer}
    </aside>
  );
}
