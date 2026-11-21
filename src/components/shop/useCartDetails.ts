'use client';

import type { ResolvedCart } from '@/lib/shop';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from './CartProvider';

const EMPTY_CART: ResolvedCart = { lines: [], subtotal: 0, weightGrams: 0, hasIssues: false };

/**
 * Détails fiables du panier (prix, titres, stock) récupérés auprès du
 * serveur. Si le serveur a retiré ou réduit des lignes (article épuisé, plus
 * vendu...), le panier local est aligné et un message l'explique.
 */
export function useCartDetails() {
  const { lines, ready, replaceAll } = useCart();
  // Résultat tagué par le panier qu'il décrit : permet de savoir s'il est à jour
  // sans état "loading" à basculer dans l'effet.
  const [result, setResult] = useState<{ key: string; cart: ResolvedCart } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const key = useMemo(() => JSON.stringify(lines), [lines]);
  const isEmpty = ready && lines.length === 0;

  useEffect(() => {
    if (!ready || lines.length === 0) {
      return;
    }

    const controller = new AbortController();

    fetch('/api/shop/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('validate failed');
        }
        return (await response.json()) as ResolvedCart;
      })
      .then((resolved) => {
        setResult({ key, cart: resolved });
        setError('');

        if (resolved.hasIssues) {
          const removed = resolved.lines.filter((line) => line.status === 'unavailable');
          const adjusted = resolved.lines.filter((line) => line.status === 'adjusted');
          setNotice(
            [
              ...removed.map((line) => `« ${line.title} » n’est plus disponible et a été retiré.`),
              ...adjusted.map((line) => `La quantité de « ${line.title} » a été ajustée au stock disponible.`),
            ].join(' ')
          );

          // On aligne le panier local sur la réalité : au prochain passage tout est cohérent.
          replaceAll(
            resolved.lines
              .filter((line) => line.status !== 'unavailable')
              .map((line) => ({ merchId: line.merchId, size: line.size, quantity: line.quantity }))
          );
        }
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError('Impossible de charger le panier. Réessayez.');
        }
      });

    return () => controller.abort();
  }, [key, lines, ready, replaceAll]);

  return {
    cart: isEmpty ? EMPTY_CART : (result?.cart ?? null),
    isLoading: !ready || (!isEmpty && result?.key !== key && !error),
    error,
    notice,
  };
}
