'use client';

import { NativeSelect } from "@/components/ui/native-select";
import { AdminModal } from '@/components/admin/admin-modal';
import { MerchNav } from '@/components/admin/merch-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  computeFee,
  formatPrice,
  LOW_STOCK_THRESHOLD,
  PAYMENT_LABELS,
  COUNTER_PAYMENT_METHODS,
  round2,
  variantsOf,
  type MerchItem,
  type PaymentMethod,
} from '@/lib/merch';
import {
  applyPendingStock,
  isNetworkError,
  loadQueue,
  loadSnapshot,
  saveQueue,
  saveSnapshot,
  type CaisseConcert as Concert,
  type CaisseSale as Sale,
  type PendingSale,
} from '@/lib/offline-sales';
import { cn } from '@/lib/utils';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Au-delà, on considère le réseau perdu : la vente part dans la file d'attente
// (le même clientId évite tout doublon si la première requête avait en fait abouti).
const REQUEST_TIMEOUT_MS = 15_000;
const SYNC_INTERVAL_MS = 20_000;

type CartLine = {
  key: string;
  merchId: string;
  title: string;
  size: string;
  quantity: number;
  // Chaîne pour pouvoir être éditée librement (prix libre, remise).
  unitPrice: string;
  available: number;
};

const parisDay = (date: Date) => date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}

async function postSale(sale: PendingSale) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch('/api/admin/merch/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        clientId: sale.clientId,
        paymentMethod: sale.paymentMethod,
        concertId: sale.concertId,
        items: sale.items.map(({ merchId, size, quantity, unitPrice }) => ({ merchId, size, quantity, unitPrice })),
      }),
    });
  } finally {
    clearTimeout(timer);
  }
}

export default function CaissePage() {
  const [products, setProducts] = useState<MerchItem[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Ventes enregistrées sans réseau, pas encore envoyées (la source de vérité est le localStorage).
  const [queue, setQueue] = useState<PendingSale[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const flushingRef = useRef(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PaymentMethod | ''>('');
  const [concertId, setConcertId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [sizePickerFor, setSizePickerFor] = useState<MerchItem | null>(null);

  // Un identifiant par tentative de vente : si la requête part deux fois, le
  // serveur ne l'enregistre qu'une fois. Renouvelé après chaque succès.
  const clientIdRef = useRef(crypto.randomUUID());

  const applyConcerts = useCallback((list: Concert[]) => {
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    setConcerts(sorted);
    const today = parisDay(new Date());
    const todays = sorted.find((concert) => parisDay(new Date(concert.date)) === today);
    if (todays) {
      setConcertId(todays.id);
    }
  }, []);

  // Modifie la file à partir de ce qui est réellement stocké ; false si le navigateur refuse l'écriture.
  const updateQueue = useCallback((change: (current: PendingSale[]) => PendingSale[]) => {
    const next = change(loadQueue());
    const saved = saveQueue(next);
    if (saved) {
      setQueue(next);
    }
    return saved;
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [productsRes, salesRes] = await Promise.all([
        fetch('/api/admin/merch'),
        fetch('/api/admin/merch/sales?limit=8'),
      ]);
      if (!productsRes.ok || !salesRes.ok) {
        throw new Error('load failed');
      }
      const loadedProducts = (await productsRes.json()) as MerchItem[];
      const loadedSales = (await salesRes.json()) as Sale[];
      setProducts(loadedProducts);
      setSales(loadedSales);
      saveSnapshot({ products: loadedProducts, sales: loadedSales });
      setIsOffline(false);
    } catch (error) {
      // Sans réseau, on repart de la dernière copie du catalogue.
      const snapshot = loadSnapshot();
      if (snapshot && snapshot.products.length > 0) {
        setProducts(snapshot.products);
        setSales(snapshot.sales);
        if (isNetworkError(error)) {
          setIsOffline(true);
        } else {
          setFeedback({ text: 'Serveur indisponible : catalogue de la dernière connexion affiché.', isError: true });
        }
      } else {
        setFeedback({
          text: isNetworkError(error)
            ? 'Pas de réseau et aucune copie locale : ouvrez la caisse une fois avec du réseau.'
            : 'Erreur lors du chargement de la caisse.',
          isError: true,
        });
      }
    } finally {
      setQueue(loadQueue());
      setIsLoading(false);
    }
  }, []);

  // Envoie les ventes en attente dans l'ordre. S'arrête au premier problème de réseau ou de session ;
  // une vente refusée par le serveur est marquée en erreur et n'est plus renvoyée.
  const flushQueue = useCallback(async () => {
    if (flushingRef.current || loadQueue().every((sale) => sale.error)) {
      return;
    }
    flushingRef.current = true;
    setIsSyncing(true);

    let sent = 0;
    let stop: 'network' | 'auth' | 'server' | null = null;
    try {
      for (const sale of loadQueue()) {
        if (sale.error) {
          continue;
        }
        try {
          const response = await postSale(sale);
          if (response.ok) {
            updateQueue((current) => current.filter((item) => item.clientId !== sale.clientId));
            sent += 1;
          } else if (response.status === 401) {
            stop = 'auth';
            break;
          } else if (response.status >= 500) {
            stop = 'server';
            break;
          } else {
            const message = await readError(response, 'Vente refusée par le serveur.');
            updateQueue((current) =>
              current.map((item) => (item.clientId === sale.clientId ? { ...item, error: message } : item))
            );
          }
        } catch (error) {
          if (!isNetworkError(error)) {
            throw error;
          }
          stop = 'network';
          break;
        }
      }
    } finally {
      flushingRef.current = false;
      setIsSyncing(false);
    }

    if (stop === 'network') {
      setIsOffline(true);
    } else if (stop === 'auth') {
      setFeedback({ text: 'Session expirée : reconnectez-vous pour envoyer les ventes en attente.', isError: true });
    } else if (stop === 'server') {
      setFeedback({ text: 'Serveur indisponible : les ventes en attente seront renvoyées.', isError: true });
    }
    if (sent > 0) {
      setIsOffline(false);
      setFeedback({
        text: `${sent} vente${sent > 1 ? 's' : ''} envoyée${sent > 1 ? 's' : ''} au serveur.`,
        isError: false,
      });
      await loadAll();
    }
  }, [loadAll, updateQueue]);

  useEffect(() => {
    loadAll().then(() => flushQueue());

    // Les concerts ne servent qu'à étiqueter la vente : un échec n'est pas bloquant.
    fetch('/api/admin/concerts')
      .then((response) => (response.ok ? response.json() : []))
      .then((list: Concert[]) => {
        saveSnapshot({ concerts: list });
        applyConcerts(list);
      })
      .catch(() => applyConcerts(loadSnapshot()?.concerts ?? []));

    // Permet d'ouvrir la caisse sans réseau (copie de la page et des fichiers).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, [loadAll, flushQueue, applyConcerts]);

  // Retour du réseau : on envoie tout de suite ; tant qu'il reste des ventes, on réessaie régulièrement.
  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      void flushQueue();
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const timer = setInterval(() => void flushQueue(), SYNC_INTERVAL_MS);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(timer);
    };
  }, [flushQueue]);

  // Le catalogue affiché tient compte des ventes en attente (le serveur ne les a pas encore décomptées).
  const displayProducts = useMemo(() => applyPendingStock(products, queue), [products, queue]);
  const pendingCount = queue.filter((sale) => !sale.error).length;

  const availableFor = (product: MerchItem, size: string) =>
    variantsOf(product).find((variant) => variant.size === size)?.quantity ?? 0;

  const addToCart = (product: MerchItem, size: string) => {
    const key = `${product.id}:${size}`;
    const available = availableFor(product, size);
    setFeedback(null);

    setCart((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: Math.min(line.quantity + 1, available) } : line
        );
      }
      return [
        ...prev,
        {
          key,
          merchId: product.id,
          title: product.title,
          size,
          quantity: 1,
          unitPrice: String(product.price),
          available,
        },
      ];
    });
  };

  const onProductTap = (product: MerchItem) => {
    if (product.sizes.length > 0) {
      setSizePickerFor(product);
    } else {
      addToCart(product, '');
    }
  };

  const updateLine = (key: string, patch: Partial<CartLine>) =>
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const changeQuantity = (line: CartLine, delta: number) => {
    const next = line.quantity + delta;
    if (next < 1) {
      setCart((prev) => prev.filter((item) => item.key !== line.key));
    } else if (next <= line.available) {
      updateLine(line.key, { quantity: next });
    }
  };

  const parsePrice = (value: string) => Number(value.replace(',', '.'));

  const total = useMemo(
    () =>
      round2(
        cart.reduce((sum, line) => {
          const price = parsePrice(line.unitPrice);
          return sum + (Number.isFinite(price) ? price : 0) * line.quantity;
        }, 0)
      ),
    [cart]
  );
  const hasInvalidPrice = cart.some((line) => {
    const price = parsePrice(line.unitPrice);
    return line.unitPrice.trim() === '' || !Number.isFinite(price) || price < 0;
  });
  const fee = payment ? computeFee(payment, total) : 0;
  const canSubmit = cart.length > 0 && payment !== '' && !hasInvalidPrice && !isSubmitting;

  const submit = async () => {
    if (!canSubmit || !payment) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);

    const sale: PendingSale = {
      clientId: clientIdRef.current,
      paymentMethod: payment,
      concertId: concertId || undefined,
      items: cart.map((line) => ({
        merchId: line.merchId,
        title: line.title,
        size: line.size,
        quantity: line.quantity,
        unitPrice: parsePrice(line.unitPrice),
      })),
      total,
      createdAt: new Date().toISOString(),
    };

    try {
      let response: Response | null = null;
      try {
        response = await postSale(sale);
      } catch (error) {
        if (!isNetworkError(error)) {
          throw error;
        }
      }

      if (response) {
        if (!response.ok) {
          throw new Error(await readError(response, 'Erreur lors de l’enregistrement de la vente.'));
        }
        setFeedback({ text: `Vente enregistrée : ${formatPrice(total)} (${PAYMENT_LABELS[payment]}).`, isError: false });
      } else {
        // Pas de réseau : la vente est gardée sur cet appareil et partira au retour de la connexion.
        if (!updateQueue((current) => [...current, sale])) {
          throw new Error('Pas de réseau et stockage local indisponible : la vente n’a PAS été enregistrée.');
        }
        setIsOffline(true);
        setFeedback({
          text: `Vente enregistrée hors-ligne : ${formatPrice(total)} (${PAYMENT_LABELS[payment]}). Elle sera envoyée au retour du réseau.`,
          isError: false,
        });
      }

      setCart([]);
      setPayment('');
      clientIdRef.current = crypto.randomUUID();
      if (response) {
        await loadAll();
        void flushQueue();
      }
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : 'Erreur lors de l’enregistrement de la vente.',
        isError: true,
      });
      // Le stock a pu changer entre-temps (autre appareil) : on rafraîchit.
      await loadAll();
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSale = async (sale: Sale) => {
    if (!window.confirm(`Annuler cette vente de ${formatPrice(sale.total)} ? Le stock sera remis.`)) {
      return;
    }
    setFeedback(null);

    let response: Response;
    try {
      response = await fetch(`/api/admin/merch/sales/${sale.id}`, { method: 'DELETE' });
    } catch {
      setFeedback({ text: 'Pas de réseau : impossible d’annuler la vente pour le moment.', isError: true });
      return;
    }
    if (!response.ok) {
      setFeedback({ text: await readError(response, 'Erreur lors de l’annulation.'), isError: true });
      return;
    }
    setFeedback({ text: 'Vente annulée, stock remis.', isError: false });
    await loadAll();
  };

  return (
    <div className="container mx-auto px-4 pt-6 pb-48 md:py-10">
      <h1 className="mb-6 text-3xl font-bold">Merch - Caisse</h1>
      <MerchNav />

      {isOffline && (
        <p role="status" className="mb-4 rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-400">
          Hors-ligne : les ventes sont gardées sur cet appareil et envoyées dès le retour du réseau. Le stock affiché est
          celui de la dernière connexion.
        </p>
      )}

      {feedback && (
        <p
          role="status"
          className={cn(
            'mb-4 rounded-md px-3 py-2 text-sm',
            feedback.isError ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
          )}
        >
          {feedback.text}
        </p>
      )}

      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
          <section aria-label="Articles">
            {displayProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun article. Ajoutez-en dans l’onglet Produits.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {displayProducts.map((product) => {
                  const soldOut = product.totalStock === 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => onProductTap(product)}
                      className="flex min-h-24 flex-col justify-between rounded-lg border border-border p-3 text-left active:bg-muted enabled:hover:border-ring disabled:opacity-50"
                    >
                      <span className="font-medium leading-tight">{product.title}</span>
                      <span className="mt-2 flex items-end justify-between text-sm">
                        <span>{formatPrice(product.price)}</span>
                        <span
                          className={cn(
                            'text-xs',
                            soldOut
                              ? 'font-semibold text-red-400'
                              : product.totalStock <= LOW_STOCK_THRESHOLD
                                ? 'font-semibold text-amber-400'
                                : 'text-muted-foreground'
                          )}
                        >
                          {soldOut ? 'Épuisé' : `${product.totalStock} en stock`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {queue.length > 0 && (
              <>
                <div className="mt-10 mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Ventes en attente d’envoi ({queue.length})</h2>
                  {pendingCount > 0 && (
                    <Button type="button" variant="outline" size="sm" disabled={isSyncing} onClick={() => void flushQueue()}>
                      {isSyncing ? 'Envoi...' : 'Envoyer maintenant'}
                    </Button>
                  )}
                </div>
                <ul className="space-y-2">
                  {queue.map((sale) => (
                    <li
                      key={sale.clientId}
                      className={cn(
                        'flex items-start justify-between gap-3 rounded-lg border p-3 text-sm',
                        sale.error ? 'border-red-400/60' : 'border-amber-400/60'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {sale.items.map((item) => `${item.quantity}× ${item.title}${item.size ? ` ${item.size}` : ''}`).join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleString('fr-FR', {
                            timeZone: 'Europe/Paris',
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          · {PAYMENT_LABELS[sale.paymentMethod]}
                        </p>
                        {sale.error && (
                          <p className="mt-1 text-xs text-red-400">
                            Refusée par le serveur : {sale.error} À traiter à la main (la vente n’est pas enregistrée).
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="font-semibold">{formatPrice(sale.total)}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('Abandonner cette vente non envoyée ? Elle ne sera jamais enregistrée.')) {
                              updateQueue((current) => current.filter((item) => item.clientId !== sale.clientId));
                            }
                          }}
                        >
                          Abandonner
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h2 className="mt-10 mb-3 text-lg font-semibold">Dernières ventes</h2>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vente pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {sales.map((sale) => (
                  <li
                    key={sale.id}
                    className={cn(
                      'flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm',
                      sale.status === 'cancelled' && 'opacity-50'
                    )}
                  >
                    <div className="min-w-0">
                      <p className={cn('font-medium', sale.status === 'cancelled' && 'line-through')}>
                        {sale.items
                          .map((item) => `${item.quantity}× ${item.title}${item.size ? ` ${item.size}` : ''}`)
                          .join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleString('fr-FR', {
                          timeZone: 'Europe/Paris',
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {PAYMENT_LABELS[sale.paymentMethod]}
                        {sale.status === 'cancelled' && ' · annulée'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-semibold">{formatPrice(sale.total)}</span>
                      {sale.status === 'completed' && (
                        <Button type="button" variant="outline" size="sm" disabled={isOffline} onClick={() => cancelSale(sale)}>
                          Annuler
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-label="Panier"
            className="fixed inset-x-0 bottom-0 z-20 max-h-[75vh] overflow-y-auto border-t border-border bg-background p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:static lg:max-h-none lg:self-start lg:rounded-lg lg:border lg:shadow-none"
          >
            <h2 className="mb-3 text-lg font-semibold">Panier</h2>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Touchez un article pour l’ajouter.</p>
            ) : (
              <ul className="space-y-3">
                {cart.map((line) => (
                  <li key={line.key} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {line.title}
                        {line.size && <span className="ml-1 text-muted-foreground">({line.size})</span>}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Retirer ${line.title}`}
                        onClick={() => setCart((prev) => prev.filter((item) => item.key !== line.key))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Diminuer la quantité"
                          onClick={() => changeQuantity(line, -1)}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{line.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Augmenter la quantité"
                          disabled={line.quantity >= line.available}
                          onClick={() => changeQuantity(line, 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Input
                          inputMode="decimal"
                          aria-label={`Prix unitaire de ${line.title}`}
                          className="h-9 w-20 text-right"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                        />
                        <span>€</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Moyen de paiement">
              {COUNTER_PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  role="radio"
                  aria-checked={payment === method}
                  onClick={() => setPayment(method)}
                  className={cn(
                    'min-h-12 rounded-md border text-sm font-medium',
                    payment === method
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {PAYMENT_LABELS[method]}
                </button>
              ))}
            </div>

            {payment === 'sumup' && total > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Commission SumUp : {formatPrice(fee)} · net {formatPrice(round2(total - fee))}
              </p>
            )}

            {concerts.length > 0 && (
              <NativeSelect
                aria-label="Concert"
                value={concertId}
                onChange={(e) => setConcertId(e.target.value)}
                className="mt-3 h-10 w-full px-2"
              >
                <option value="">Hors concert</option>
                {concerts.map((concert) => (
                  <option key={concert.id} value={concert.id}>
                    {new Date(concert.date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })} – {concert.venue}
                  </option>
                ))}
              </NativeSelect>
            )}

            <Button type="button" className="mt-4 h-14 w-full text-base" disabled={!canSubmit} onClick={submit}>
              {isSubmitting ? 'Enregistrement...' : `Valider la vente · ${formatPrice(total)}`}
            </Button>
            {cart.length > 0 && payment === '' && (
              <p className="mt-2 text-center text-xs text-muted-foreground">Choisissez un moyen de paiement.</p>
            )}
          </section>
        </div>
      )}

      <AdminModal
        open={sizePickerFor !== null}
        title={sizePickerFor ? `${sizePickerFor.title} : taille` : ''}
        onClose={() => setSizePickerFor(null)}
        maxWidthClass="max-w-sm"
      >
        <div className="grid grid-cols-3 gap-3">
          {sizePickerFor &&
            variantsOf(sizePickerFor).map((variant) => {
              const inCart = cart.find((line) => line.key === `${sizePickerFor.id}:${variant.size}`)?.quantity ?? 0;
              const remaining = variant.quantity - inCart;
              return (
                <button
                  key={variant.size}
                  type="button"
                  disabled={remaining <= 0}
                  onClick={() => {
                    addToCart(sizePickerFor, variant.size);
                    setSizePickerFor(null);
                  }}
                  className="flex min-h-16 flex-col items-center justify-center rounded-md border border-border active:bg-muted enabled:hover:border-ring disabled:opacity-40"
                >
                  <span className="text-lg font-semibold">{variant.size}</span>
                  <span className="text-xs text-muted-foreground">{remaining > 0 ? `${remaining} dispo` : 'Épuisé'}</span>
                </button>
              );
            })}
        </div>
      </AdminModal>
    </div>
  );
}
