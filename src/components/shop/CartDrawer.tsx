'use client';

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/merch';
import Link from 'next/link';
import { CartLines } from './CartLines';
import { useCart } from './CartProvider';
import { useCartDetails } from './useCartDetails';

function DrawerBody() {
  const { close } = useCart();
  const { cart, isLoading, error, notice } = useCartDetails();
  const isEmpty = !isLoading && (cart?.lines.length ?? 0) === 0;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6">
        {notice && <p className="mb-2 border border-instinct-purple/60 p-3 text-sm">{notice}</p>}
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        {isLoading && !cart ? (
          <p className="py-8 text-sm text-instinct-foreground/60">Chargement...</p>
        ) : isEmpty ? (
          <div className="py-12 text-center">
            <p className="text-instinct-foreground/70">Votre panier est vide.</p>
            <Link
              href="/#le-merch"
              onClick={close}
              className="mt-4 inline-block text-sm font-semibold tracking-widest text-instinct-purple uppercase underline"
            >
              Voir le merch
            </Link>
          </div>
        ) : (
          cart && <CartLines lines={cart.lines} onNavigate={close} />
        )}
      </div>

      {!isEmpty && cart && (
        <div className="border-t border-instinct-foreground/15 px-6 py-5">
          <div className="mb-1 flex items-center justify-between text-lg font-semibold">
            <span>Sous-total</span>
            <span className="tabular-nums">{formatPrice(cart.subtotal)}</span>
          </div>
          <p className="mb-4 text-xs text-instinct-foreground/60">Frais de livraison calculés à l’étape suivante.</p>
          <Link
            href="/commande"
            onClick={close}
            className="block bg-instinct-purple py-3 text-center text-sm font-bold tracking-widest text-instinct-bg uppercase hover:opacity-90"
          >
            Commander
          </Link>
          <Link
            href="/panier"
            onClick={close}
            className="mt-3 block text-center text-sm tracking-widest uppercase underline hover:text-instinct-purple"
          >
            Voir le panier
          </Link>
        </div>
      )}
    </>
  );
}

export function CartDrawer() {
  const { isOpen, close } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-instinct-purple/0 bg-instinct-bg p-0 text-instinct-foreground sm:max-w-md"
      >
        <SheetTitle className="px-6 pt-6 pb-4 font-serif text-3xl text-instinct-foreground uppercase">
          Panier
        </SheetTitle>
        <SheetDescription className="sr-only">Articles de votre panier</SheetDescription>
        <DrawerBody />
      </SheetContent>
    </Sheet>
  );
}
