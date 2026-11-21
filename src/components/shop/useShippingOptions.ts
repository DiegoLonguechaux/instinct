'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCart } from './CartProvider';

export type ShippingOptions = {
  relay: { available: boolean; cost: number };
  home: { available: boolean; cost: number };
};

/** Frais de port du panier courant (calculés côté serveur selon le poids). */
export function useShippingOptions() {
  const { lines, ready } = useCart();
  const [result, setResult] = useState<{ key: string; options: ShippingOptions | null; error: string } | null>(null);
  const key = useMemo(() => JSON.stringify(lines), [lines]);

  useEffect(() => {
    if (!ready || lines.length === 0) {
      return;
    }
    const controller = new AbortController();

    fetch('/api/shop/shipping-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as (ShippingOptions & { error?: string }) | null;
        if (!response.ok || !data) {
          return { key, options: null, error: data?.error ?? 'Impossible de calculer la livraison.' };
        }
        return { key, options: { relay: data.relay, home: data.home }, error: '' };
      })
      .then(setResult)
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setResult({ key, options: null, error: 'Impossible de calculer la livraison.' });
        }
      });

    return () => controller.abort();
  }, [key, lines, ready]);

  const current = result?.key === key ? result : null;
  return {
    options: current?.options ?? null,
    error: current?.error ?? '',
    isLoading: ready && lines.length > 0 && current === null,
  };
}
