'use client';

import { NativeSelect } from "@/components/ui/native-select";
import { MerchNav } from '@/components/admin/merch-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, PAYMENT_LABELS, type PaymentMethod } from '@/lib/merch';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type Stats = {
  totals: {
    sales: number;
    items: number;
    gross: number;
    fees: number;
    net: number;
    cost: number;
    profit: number;
    avgBasket: number;
  };
  byProduct: { title: string; quantity: number; revenue: number; profit: number; sizes: Record<string, number> }[];
  bySize: { size: string; quantity: number }[];
  byPayment: { method: PaymentMethod; sales: number; gross: number; fees: number }[];
  byDay: { date: string; gross: number; quantity: number }[];
  byConcert: { label: string; gross: number; quantity: number; sales: number }[];
};

type Concert = { id: string; date: string; venue: string };

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const isoDay = (date: Date) => date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoDay(date);
}

function formatDay(day: string) {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

/** Barre horizontale : une seule teinte, longueur proportionnelle à la valeur. */
function BarRow({ label, value, max, display, hint }: { label: string; value: number; max: number; display: string; hint?: string }) {
  return (
    <li className="grid grid-cols-[minmax(5rem,9rem)_1fr_auto] items-center gap-3 text-sm" title={hint ?? `${label} : ${display}`}>
      <span className="truncate">{label}</span>
      <span className="h-3 rounded-r bg-muted">
        <span
          className="block h-3 rounded-r bg-violet-600"
          style={{ width: `${max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0}%` }}
        />
      </span>
      <span className="text-right font-medium tabular-nums">{display}</span>
    </li>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-border p-4', className)}>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function StatistiquesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [concertId, setConcertId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/concerts')
      .then((response) => (response.ok ? response.json() : []))
      .then((list: Concert[]) => setConcerts([...list].sort((a, b) => b.date.localeCompare(a.date))))
      .catch(() => setConcerts([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (concertId) params.set('concertId', concertId);

    fetch(`/api/admin/merch/stats?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('stats failed');
        }
        return response.json() as Promise<Stats>;
      })
      .then((data) => {
        setStats(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError('Erreur lors du chargement des statistiques.');
        }
      });

    return () => controller.abort();
  }, [from, to, concertId]);

  const setRange = (start: string, end: string) => {
    setFrom(start);
    setTo(end);
  };

  const sizes = stats
    ? [...stats.bySize].sort((a, b) => {
        const ia = SIZE_ORDER.indexOf(a.size);
        const ib = SIZE_ORDER.indexOf(b.size);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
    : [];

  const kpis = stats
    ? [
        { label: 'Chiffre d’affaires', value: formatPrice(stats.totals.gross) },
        { label: 'Commissions SumUp', value: formatPrice(stats.totals.fees) },
        { label: 'Net encaissé', value: formatPrice(stats.totals.net) },
        { label: 'Bénéfice', value: formatPrice(stats.totals.profit), hint: 'Net − prix de revient' },
        { label: 'Articles vendus', value: String(stats.totals.items) },
        { label: 'Ventes', value: String(stats.totals.sales) },
        { label: 'Panier moyen', value: formatPrice(stats.totals.avgBasket) },
      ]
    : [];

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Merch - Statistiques</h1>
      <MerchNav />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRange('', '')}>
            Tout
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRange(daysAgo(7), '')}>
            7 jours
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRange(daysAgo(30), '')}>
            30 jours
          </Button>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Du</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Au</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Concert</span>
          <NativeSelect
            value={concertId}
            onChange={(e) => setConcertId(e.target.value)}
            className="px-2"
          >
            <option value="">Tous</option>
            {concerts.map((concert) => (
              <option key={concert.id} value={concert.id}>
                {new Date(concert.date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })} – {concert.venue}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {!stats ? (
        !error && <p>Chargement...</p>
      ) : stats.totals.sales === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune vente sur cette période.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-border p-3" title={kpi.hint}>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Articles vendus par modèle">
              <ul className="space-y-2">
                {stats.byProduct.map((product) => (
                  <BarRow
                    key={product.title}
                    label={product.title}
                    value={product.quantity}
                    max={stats.byProduct[0].quantity}
                    display={String(product.quantity)}
                    hint={`${product.title} : ${product.quantity} vendus, ${formatPrice(product.revenue)}`}
                  />
                ))}
              </ul>
            </Card>

            <Card title="Articles vendus par taille">
              {sizes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun article avec taille vendu.</p>
              ) : (
                <ul className="space-y-2">
                  {sizes.map((entry) => (
                    <BarRow
                      key={entry.size}
                      label={entry.size}
                      value={entry.quantity}
                      max={Math.max(...sizes.map((s) => s.quantity))}
                      display={String(entry.quantity)}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Chiffre d’affaires par jour">
            <div className="overflow-x-auto">
              <div className="flex h-44 items-end gap-2" style={{ minWidth: `${stats.byDay.length * 3}rem` }}>
                {stats.byDay.map((day) => {
                  const max = Math.max(...stats.byDay.map((d) => d.gross));
                  return (
                    <div
                      key={day.date}
                      className="flex h-full w-10 flex-1 flex-col justify-end"
                      title={`${formatDay(day.date)} : ${formatPrice(day.gross)}, ${day.quantity} article(s)`}
                    >
                      <span className="mb-1 text-center text-[10px] text-muted-foreground tabular-nums">
                        {Math.round(day.gross)} €
                      </span>
                      <span
                        className="block rounded-t bg-violet-600"
                        style={{ height: `${max > 0 ? Math.max((day.gross / max) * 80, 2) : 0}%` }}
                      />
                      <span className="mt-1 text-center text-[10px] text-muted-foreground">{formatDay(day.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Moyens de paiement">
              <ul className="space-y-2">
                {stats.byPayment.map((entry) => (
                  <BarRow
                    key={entry.method}
                    label={PAYMENT_LABELS[entry.method]}
                    value={entry.gross}
                    max={Math.max(...stats.byPayment.map((p) => p.gross))}
                    display={formatPrice(entry.gross)}
                    hint={`${PAYMENT_LABELS[entry.method]} : ${entry.sales} vente(s), commission ${formatPrice(entry.fees)}`}
                  />
                ))}
              </ul>
            </Card>

            <Card title="Par concert">
              <ul className="space-y-2">
                {stats.byConcert.map((entry) => (
                  <BarRow
                    key={entry.label}
                    label={entry.label}
                    value={entry.gross}
                    max={stats.byConcert[0].gross}
                    display={formatPrice(entry.gross)}
                    hint={`${entry.label} : ${entry.sales} vente(s), ${entry.quantity} article(s)`}
                  />
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Détail par modèle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Modèle</th>
                    <th className="py-2 pr-4 text-right font-medium">Vendus</th>
                    <th className="py-2 pr-4 font-medium">Tailles</th>
                    <th className="py-2 pr-4 text-right font-medium">CA</th>
                    <th className="py-2 text-right font-medium">Bénéfice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.byProduct.map((product) => (
                    <tr key={product.title}>
                      <td className="py-2 pr-4 font-medium">{product.title}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{product.quantity}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {Object.entries(product.sizes)
                          .sort(([a], [b]) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b))
                          .map(([size, quantity]) => `${size}×${quantity}`)
                          .join(' · ') || '-'}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatPrice(product.revenue)}</td>
                      <td className="py-2 text-right tabular-nums">{formatPrice(product.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
