'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearCheckoutState } from './checkoutStore';
import { useCart } from './CartProvider';

type PublicOrder = { number: string; total: number; state: 'pending' | 'paid' | 'failed' };

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 20;

const tokenFromUrl = () => new URLSearchParams(window.location.search).get('token') ?? '';

/** Page de retour de Stripe en cas de succès : attend que le webhook ait confirmé le paiement. */
export function ConfirmationContent() {
  const { clear } = useCart();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const token = tokenFromUrl();
    if (!token) {
      // Hors du corps synchrone de l'effet (évite un rendu en cascade).
      queueMicrotask(() => setNotFound(true));
      return;
    }

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/shop/orders/${encodeURIComponent(token)}`);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (response.ok) {
          const data = (await response.json()) as PublicOrder;
          if (cancelled) return;
          setOrder(data);
          if (data.state === 'paid') {
            // Le panier ne se vide qu'une fois le paiement réellement confirmé.
            clear();
            clearCheckoutState();
            return;
          }
          if (data.state === 'failed') return;
        }
      } catch {
        // Réseau capricieux : on réessaie au prochain tour.
      }

      if (attempts >= POLL_MAX_ATTEMPTS) {
        setTimedOut(true);
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // clear a une identité stable (useCallback) : l'effet ne se relance pas.
  }, [clear]);

  if (notFound) {
    return <p className="text-instinct-foreground/70">Commande introuvable.</p>;
  }

  if (order?.state === 'paid') {
    return (
      <div className="max-w-xl">
        <h1 className="font-serif text-4xl uppercase sm:text-5xl">Merci !</h1>
        <p className="mt-4 text-lg">Votre commande <strong>{order.number}</strong> est confirmée.</p>
        <p className="mt-2 text-instinct-foreground/70">
          Un email de confirmation vient de vous être envoyé. Vous recevrez le numéro de suivi dès l’expédition du colis.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-semibold tracking-widest text-instinct-purple uppercase underline">
          Retour au site
        </Link>
      </div>
    );
  }

  if (order?.state === 'failed') {
    return (
      <div className="max-w-xl">
        <h1 className="font-serif text-4xl uppercase">Paiement non abouti</h1>
        <p className="mt-4 text-instinct-foreground/70">Votre paiement n’a pas été validé et vous n’avez pas été débité.</p>
        <Link href="/panier" className="mt-8 inline-block text-sm font-semibold tracking-widest text-instinct-purple uppercase underline">
          Retour au panier
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-4xl uppercase">{timedOut ? 'Confirmation en cours' : 'Validation du paiement...'}</h1>
      <p className="mt-4 text-instinct-foreground/70">
        {timedOut
          ? 'La confirmation de votre paiement prend plus de temps que prévu. Pas d’inquiétude : si votre paiement a abouti, vous recevrez un email de confirmation dans quelques minutes. Ne payez pas une seconde fois.'
          : 'Nous vérifions votre paiement, cela ne prend que quelques secondes.'}
      </p>
    </div>
  );
}

/** Retour de Stripe après abandon : on libère aussitôt le stock réservé. */
export function CancelledContent() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const token = tokenFromUrl();
    if (!token) {
      return;
    }
    fetch(`/api/shop/orders/${encodeURIComponent(token)}`, { method: 'POST' })
      .catch(() => null)
      .finally(() => setDone(true));
  }, []);

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-4xl uppercase">Paiement annulé</h1>
      <p className="mt-4 text-instinct-foreground/70">
        {done ? 'Vous n’avez pas été débité. Votre panier est conservé.' : 'Annulation en cours...'}
      </p>
      <Link href="/panier" className="mt-8 inline-block text-sm font-semibold tracking-widest text-instinct-purple uppercase underline">
        Retour au panier
      </Link>
    </div>
  );
}
