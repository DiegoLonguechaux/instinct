'use client';

import { MerchNav } from '@/components/admin/merch-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LOW_STOCK_THRESHOLD, variantsOf, type MerchItem } from '@/lib/merch';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';

type Movement = {
  id: string;
  merchTitle: string;
  size: string;
  delta: number;
  resultingQuantity: number;
  type: 'restock' | 'adjustment';
  reason: string;
  createdBy: string;
  createdAt: string;
};

export default function StockPage() {
  const [products, setProducts] = useState<MerchItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  // Quantité saisie par variante, clé `${produit}:${taille}`.
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState('');

  const load = useCallback(async () => {
    try {
      const [productsRes, movementsRes] = await Promise.all([
        fetch('/api/admin/merch'),
        fetch('/api/admin/merch/stock'),
      ]);
      if (!productsRes.ok || !movementsRes.ok) {
        throw new Error('load failed');
      }
      setProducts((await productsRes.json()) as MerchItem[]);
      setMovements((await movementsRes.json()) as Movement[]);
    } catch {
      setMessage('Erreur lors du chargement du stock.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async (product: MerchItem, size: string, mode: 'add' | 'set') => {
    const key = `${product.id}:${size}`;
    const raw = inputs[key] ?? '';
    if (raw.trim() === '') {
      setMessage('Saisissez une quantité.');
      return;
    }

    setBusyKey(key);
    setMessage('');
    try {
      const response = await fetch('/api/admin/merch/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchId: product.id, size, mode, quantity: Number(raw), reason }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Erreur lors de la mise à jour du stock.');
      }
      setInputs((prev) => ({ ...prev, [key]: '' }));
      setMessage(mode === 'add' ? 'Réassort enregistré.' : 'Inventaire corrigé.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du stock.');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Merch - Stock</h1>
      <MerchNav />

      {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}

      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <div className="mb-6 max-w-md space-y-1">
            <label htmlFor="reason" className="text-sm font-medium">
              Motif (optionnel, ajouté au journal)
            </label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Livraison, cadeau, perte, comptage..."
            />
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            « Ajouter » ajoute la quantité saisie au stock (réassort). « Définir » remplace le stock par
            la valeur saisie (correction après comptage).
          </p>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] items-start gap-4">
            {products.map((product) => (
              <section key={product.id} className="rounded-lg border border-border p-4">
                <h2 className="mb-3 font-semibold">{product.title}</h2>
                <ul className="space-y-3">
                  {variantsOf(product).map((variant) => {
                    const key = `${product.id}:${variant.size}`;
                    const isBusy = busyKey === key;
                    return (
                      <li key={key} className="space-y-2 rounded-md bg-muted/40 p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">{variant.size || 'Stock'}</span>
                          <span
                            className={cn(
                              'text-lg font-semibold tabular-nums',
                              variant.quantity === 0
                                ? 'text-red-400'
                                : variant.quantity <= LOW_STOCK_THRESHOLD && 'text-amber-400'
                            )}
                          >
                            {variant.quantity}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">en stock</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            placeholder="Qté"
                            aria-label={`Quantité ${product.title} ${variant.size}`}
                            className="h-9 min-w-0 flex-1"
                            value={inputs[key] ?? ''}
                            onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                          />
                          <Button type="button" size="sm" disabled={isBusy} onClick={() => apply(product, variant.size, 'add')}>
                            Ajouter
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => apply(product, variant.size, 'set')}
                          >
                            Définir
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <h2 className="mt-10 mb-3 text-lg font-semibold">Journal des mouvements</h2>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun mouvement manuel enregistré.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {movements.map((movement) => (
                <li key={movement.id} className="flex items-start justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium">
                      {movement.merchTitle}
                      {movement.size && ` (${movement.size})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {movement.type === 'restock' ? 'Réassort' : 'Inventaire'}
                      {movement.reason && ` · ${movement.reason}`} · {movement.createdBy} ·{' '}
                      {new Date(movement.createdAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn('font-semibold', movement.delta > 0 ? 'text-green-400' : 'text-red-400')}>
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                    </p>
                    <p className="text-xs text-muted-foreground">→ {movement.resultingQuantity}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
