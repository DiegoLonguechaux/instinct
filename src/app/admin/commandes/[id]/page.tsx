'use client';

import { formatDateTime, StatusBadge, type AdminOrder } from '@/components/admin/order-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/merch';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Feedback = { text: string; isError: boolean } | null;

async function call(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as
    | { order?: AdminOrder; warning?: string; error?: string }
    | AdminOrder
    | null;
  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? 'Une erreur est survenue.');
  }
  return data;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  const load = useCallback(async () => {
    try {
      setOrder((await call(`/api/admin/orders/${id}`, 'GET')) as AdminOrder);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Erreur de chargement.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Exécute une action serveur et affiche le résultat (ou l'erreur) en haut de page.
  const run = async (label: string, action: () => Promise<unknown>, success: string) => {
    setBusy(label);
    setFeedback(null);
    try {
      const data = (await action()) as { order?: AdminOrder | null; warning?: string };
      if (data?.order) setOrder(data.order);
      setFeedback({ text: data?.warning ? `${success} ${data.warning}` : success, isError: Boolean(data?.warning) });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Une erreur est survenue.', isError: true });
      await load();
    } finally {
      setBusy('');
    }
  };

  if (loadError) return <div className="container mx-auto px-4 py-10 text-red-400">{loadError}</div>;
  if (!order) return <div className="container mx-auto px-4 py-10">Chargement...</div>;

  const status = (action: 'prepare' | 'ship' | 'deliver', extra?: object) =>
    call(`/api/admin/orders/${order.id}/status`, 'POST', { action, ...extra });

  const canPrepare = order.status === 'paid';
  const canShip = order.status === 'paid' || order.status === 'preparing';
  const canDeliver = order.status === 'shipped';
  const canLabel = canShip && !order.shipment.boxtalOrderId;
  // 'pending' = création en cours (verrou posé pendant l'appel à Boxtal).
  const hasLabel = Boolean(order.shipment.boxtalOrderId) && order.shipment.boxtalOrderId !== 'pending';
  const canRefund = ['paid', 'preparing', 'shipped', 'delivered'].includes(order.status);
  const destination =
    order.delivery.mode === 'relay' && order.delivery.relayPoint
      ? `${order.delivery.relayPoint.name}, ${order.delivery.relayPoint.street}, ${order.delivery.relayPoint.postalCode} ${order.delivery.relayPoint.city}`
      : order.delivery.address
        ? `${order.delivery.address.street}${order.delivery.address.complement ? `, ${order.delivery.address.complement}` : ''}, ${order.delivery.address.postalCode} ${order.delivery.address.city}`
        : '';

  return (
    <div className="container mx-auto px-4 py-10">
      <Link href="/admin/commandes" className="text-sm text-muted-foreground underline">← Toutes les commandes</Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{order.number}</h1>
        <StatusBadge status={order.status} />
      </div>

      {feedback && (
        <p role="status" className={`mb-4 rounded-md px-3 py-2 text-sm ${feedback.isError ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
          {feedback.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 font-semibold">Articles à préparer</h2>
            <ul className="divide-y divide-border text-sm">
              {order.items.map((item) => (
                <li key={`${item.merchId}-${item.size}`} className="flex justify-between gap-3 py-2">
                  <span>
                    <strong>{item.quantity} ×</strong> {item.title}
                    {item.size && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{item.size}</span>}
                  </span>
                  <span className="tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><dt>Sous-total</dt><dd className="tabular-nums">{formatPrice(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Livraison</dt><dd className="tabular-nums">{formatPrice(order.shippingCost)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total payé</dt><dd className="tabular-nums">{formatPrice(order.total)}</dd></div>
              {order.payment.stripeFee > 0 && (
                <div className="flex justify-between text-muted-foreground"><dt>Frais Stripe</dt><dd className="tabular-nums">{formatPrice(order.payment.stripeFee)}</dd></div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-border p-4 text-sm">
            <h2 className="mb-3 font-semibold">Client et livraison</h2>
            <p>{order.customer.firstName} {order.customer.lastName}</p>
            <p><a className="underline" href={`mailto:${order.customer.email}`}>{order.customer.email}</a> · <a className="underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></p>
            <p className="mt-3 font-medium">{order.delivery.mode === 'relay' ? 'Point relais' : 'À domicile'}</p>
            <p>{destination}</p>
            {order.delivery.relayPoint && <p className="text-xs text-muted-foreground">Code point relais : {order.delivery.relayPoint.code} ({order.delivery.relayPoint.network})</p>}
            <p className="mt-1 text-xs text-muted-foreground">Poids estimé du colis : {order.delivery.weightGrams} g</p>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 font-semibold">Historique</h2>
            <ol className="space-y-2 text-sm">
              {[...order.statusHistory].reverse().map((entry, index) => (
                <li key={index} className="flex flex-wrap gap-x-3">
                  <span className="text-muted-foreground">{formatDateTime(entry.at)}</span>
                  <StatusBadge status={entry.status} />
                  <span className="text-muted-foreground">{entry.note}{entry.by && ` · ${entry.by}`}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 font-semibold">Expédition</h2>

            {hasLabel && (
              // Lien servi par notre API : elle redemande à Boxtal un lien PDF frais (celui de Boxtal expire).
              <a href={`/api/admin/orders/${order.id}/label`} target="_blank" rel="noreferrer" className="mb-3 block rounded-md border border-border py-2 text-center text-sm font-medium hover:bg-muted">
                Ouvrir le bordereau (PDF)
              </a>
            )}
            {order.shipment.trackingNumber && (
              <p className="mb-3 text-sm">
                Suivi :{' '}
                {order.shipment.trackingUrl ? (
                  <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="underline">{order.shipment.trackingNumber}</a>
                ) : (
                  order.shipment.trackingNumber
                )}
              </p>
            )}

            <div className="space-y-2">
              {canPrepare && (
                <Button className="w-full" variant="outline" disabled={Boolean(busy)} onClick={() => run('prepare', () => status('prepare'), 'Commande en préparation.')}>
                  Marquer en préparation
                </Button>
              )}
              {canLabel && (
                <Button className="w-full" disabled={Boolean(busy)} onClick={() => run('label', () => call(`/api/admin/orders/${order.id}/label`, 'POST'), 'Étiquette créée.')}>
                  {busy === 'label' ? 'Création...' : 'Créer l’étiquette Boxtal'}
                </Button>
              )}
              {hasLabel && !order.shipment.trackingNumber && (
                <Button className="w-full" variant="outline" disabled={Boolean(busy)} onClick={() => run('refresh', () => call(`/api/admin/orders/${order.id}/label`, 'PATCH'), 'Suivi actualisé.')}>
                  {busy === 'refresh' ? 'Actualisation...' : 'Récupérer le suivi'}
                </Button>
              )}
            </div>

            {canShip && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Quand le colis est remis au transporteur (le client reçoit un mail de suivi) :</p>
                {!order.shipment.trackingNumber && (
                  <>
                    <Input aria-label="Numéro de suivi" placeholder="N° de suivi (optionnel)" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                    <Input aria-label="Lien de suivi" placeholder="Lien de suivi (optionnel)" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
                  </>
                )}
                <Button
                  className="w-full"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    run('ship', () => status('ship', { trackingNumber: trackingNumber || undefined, trackingUrl: trackingUrl || undefined }), 'Commande marquée comme expédiée, le client a été prévenu.')
                  }
                >
                  Marquer expédiée
                </Button>
              </div>
            )}

            {canDeliver && (
              <Button className="mt-4 w-full" variant="outline" disabled={Boolean(busy)} onClick={() => run('deliver', () => status('deliver'), 'Commande marquée comme livrée.')}>
                Marquer livrée
              </Button>
            )}
          </section>

          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-3 font-semibold">Note interne</h2>
            <textarea
              aria-label="Note interne"
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              value={note ?? order.internalNote}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button className="mt-2" size="sm" variant="outline" disabled={note === null || Boolean(busy)} onClick={() => run('note', async () => ({ order: (await call(`/api/admin/orders/${order.id}`, 'PATCH', { internalNote: note })) as AdminOrder }), 'Note enregistrée.').then(() => setNote(null))}>
              Enregistrer la note
            </Button>
          </section>

          {canRefund && (
            <section className="rounded-lg border border-red-200 p-4">
              <h2 className="mb-3 font-semibold text-red-400">Annuler et rembourser</h2>
              <p className="mb-3 text-xs text-muted-foreground">Rembourse intégralement le client via Stripe (port compris), retire la vente des statistiques et le prévient par mail.</p>
              <div className="flex flex-col gap-2">
                {(['restock', 'norestock'] as const).map((choice) => (
                  <Button
                    key={choice}
                    variant="destructive"
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      const restock = choice === 'restock';
                      if (!window.confirm(`Rembourser ${formatPrice(order.total)} à ${order.customer.firstName} ${order.customer.lastName} ?${restock ? ' Les articles seront remis en stock.' : ''}`)) return;
                      run('refund', () => call(`/api/admin/orders/${order.id}/refund`, 'POST', { restock }), 'Commande remboursée.');
                    }}
                  >
                    {choice === 'restock' ? 'Rembourser et remettre en stock' : 'Rembourser sans remettre en stock'}
                  </Button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
