'use client';

import { formatPrice } from '@/lib/merch';
import { normalizeFrenchPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';
import { useCheckoutState } from './checkoutStore';
import { useCart } from './CartProvider';
import { OrderSummary } from './OrderSummary';
import { shopButtonClass } from './styles';
import { useCartDetails } from './useCartDetails';
import { useShippingOptions } from './useShippingOptions';

export function RecapContent() {
  const { ready, lines } = useCart();
  const { cart, isLoading: cartLoading, notice } = useCartDetails();
  const { options, isLoading: shippingLoading } = useShippingOptions();
  const [state] = useCheckoutState();
  const [accepted, setAccepted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');

  if (!ready || (cartLoading && !cart) || shippingLoading) {
    return <p className="text-instinct-foreground/60">Chargement...</p>;
  }

  const { customer, mode, relayPoint, address } = state;
  const hasDelivery = mode === 'relay' ? Boolean(relayPoint) : mode === 'home' && Boolean(address.street);
  const isComplete = Boolean(customer.email && customer.firstName && normalizeFrenchPhone(customer.phone) && hasDelivery);

  if (!cart || cart.lines.length === 0 || !isComplete || !options) {
    return (
      <div className="py-12 text-center">
        <p className="text-instinct-foreground/70">
          {cart && cart.lines.length > 0 ? 'Il manque des informations pour finaliser votre commande.' : 'Votre panier est vide.'}
        </p>
        <Link
          href={cart && cart.lines.length > 0 ? '/commande' : '/#le-merch'}
          className="mt-4 inline-block text-sm font-semibold tracking-widest text-instinct-purple uppercase underline"
        >
          {cart && cart.lines.length > 0 ? 'Retour à la commande' : 'Voir le merch'}
        </Link>
      </div>
    );
  }

  const shippingCost = mode === 'relay' ? options.relay.cost : options.home.cost;
  const total = cart.subtotal + shippingCost;

  const pay = async () => {
    setError('');
    setIsPaying(true);

    try {
      const response = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          customer,
          delivery: mode === 'relay' ? { mode, relayPoint } : { mode, address },
          acceptTerms: true,
        }),
      });
      const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;

      if (!response.ok || !data?.url) {
        throw new Error(data?.error ?? 'Le paiement est momentanément indisponible.');
      }
      // Redirection vers la page de paiement hébergée par Stripe : on ne quitte pas l'état "en cours".
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le paiement est momentanément indisponible.');
      setIsPaying(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-8">
        {notice && <p className="border border-instinct-purple/60 p-3 text-sm">{notice}</p>}

        <section className="border border-instinct-foreground/20 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-serif text-xl uppercase">Coordonnées</h2>
            <Link href="/commande" className="text-sm underline hover:text-instinct-purple">Modifier</Link>
          </div>
          <p className="mt-3">{customer.firstName} {customer.lastName}</p>
          <p className="text-instinct-foreground/70">{customer.email}</p>
          <p className="text-instinct-foreground/70">{customer.phone}</p>
        </section>

        <section className="border border-instinct-foreground/20 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-serif text-xl uppercase">{mode === 'relay' ? 'Livraison en point relais' : 'Livraison à domicile'}</h2>
            <Link href="/commande" className="text-sm underline hover:text-instinct-purple">Modifier</Link>
          </div>
          {mode === 'relay' && relayPoint ? (
            <p className="mt-3">
              {relayPoint.name}
              <br />
              <span className="text-instinct-foreground/70">{relayPoint.street}, {relayPoint.postalCode} {relayPoint.city}</span>
            </p>
          ) : (
            <p className="mt-3">
              {address.street}
              {address.complement && <>, {address.complement}</>}
              <br />
              <span className="text-instinct-foreground/70">{address.postalCode} {address.city}</span>
            </p>
          )}
          <p className="mt-3 text-sm text-instinct-foreground/60">Frais de livraison : {formatPrice(shippingCost)}</p>
        </section>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-4 accent-[#9D75A6]" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>
            J’ai lu et j’accepte les{' '}
            <Link href="/cgv" target="_blank" className="underline hover:text-instinct-purple">conditions générales de vente</Link>
            {' '}et la{' '}
            <Link href="/confidentialite" target="_blank" className="underline hover:text-instinct-purple">politique de confidentialité</Link>.
          </span>
        </label>

        {error && (
          <p role="alert" className="border border-red-400/60 p-3 text-sm text-red-300">
            {error}{' '}
            <Link href="/panier" className="underline">Voir le panier</Link>
          </p>
        )}
      </div>

      <OrderSummary
        lines={cart.lines}
        subtotal={cart.subtotal}
        shippingCost={shippingCost}
        footer={
          <>
            <button type="button" onClick={pay} disabled={!accepted || isPaying} className={cn(shopButtonClass, 'mt-6')}>
              {isPaying ? 'Redirection...' : `Payer ${formatPrice(total)}`}
            </button>
            <p className="mt-3 text-center text-xs text-instinct-foreground/50">
              Paiement sécurisé par Stripe. Le stock est réservé pendant 30 minutes.
            </p>
          </>
        }
      />
    </div>
  );
}
