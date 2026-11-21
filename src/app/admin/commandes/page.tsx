'use client';

import { NativeSelect } from "@/components/ui/native-select";
import { formatDateTime, OrdersNav, StatusBadge, type AdminOrder } from '@/components/admin/order-ui';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/merch';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/order-status';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (debouncedQuery) params.set('q', debouncedQuery);

    fetch(`/api/admin/orders?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('load failed');
        return (await response.json()) as AdminOrder[];
      })
      .then((list) => {
        setOrders(list);
        setError('');
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError('Erreur lors du chargement des commandes.');
        }
      });

    return () => controller.abort();
  }, [status, debouncedQuery]);

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Commandes</h1>
      <OrdersNav />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Statut</span>
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2"
          >
            <option value="">Commandes payées et en cours</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="min-w-56 flex-1 text-sm sm:max-w-xs">
          <span className="mb-1 block text-xs text-muted-foreground">Recherche (n°, nom, email)</span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-9" placeholder="INS-2026-0001" />
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {orders === null ? (
        !error && <p>Chargement...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune commande.</p>
      ) : (
        <>
          {/* Mobile : cartes */}
          <ul className="space-y-3 md:hidden">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/commandes/${order.id}`} className="block rounded-lg border border-border p-3 active:bg-muted">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{order.number}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm">{order.customer.firstName} {order.customer.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt)} · {order.delivery.label} · {formatPrice(order.total)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop : tableau */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">N°</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Livraison</th>
                  <th className="py-2 pr-4 text-right font-medium">Total</th>
                  <th className="py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted">
                    <td className="py-2 pr-4 font-medium">
                      <Link href={`/admin/commandes/${order.id}`} className="underline">{order.number}</Link>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
                    <td className="py-2 pr-4">{order.customer.firstName} {order.customer.lastName}</td>
                    <td className="py-2 pr-4">{order.delivery.label}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatPrice(order.total)}</td>
                    <td className="py-2"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
