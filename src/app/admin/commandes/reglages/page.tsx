'use client';

import { OrdersNav } from '@/components/admin/order-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

type Bracket = { maxWeightGrams: string; relayPrice: string; homePrice: string };

type Form = {
  shopEnabled: boolean;
  packagingGrams: string;
  brackets: Bracket[];
  relayOfferCode: string;
  homeOfferCode: string;
  relayNetworks: string;
  parcelLengthCm: string;
  parcelWidthCm: string;
  parcelHeightCm: string;
};

type Status = { stripeConfigured: boolean; boxtalConfigured: boolean };

type Settings = {
  shopEnabled: boolean;
  packagingGrams: number;
  shippingBrackets: { maxWeightGrams: number; relayPrice: number; homePrice: number }[];
  relayOfferCode: string;
  homeOfferCode: string;
  relayNetworks: string[];
  parcelLengthCm: number;
  parcelWidthCm: number;
  parcelHeightCm: number;
} & Status;

const toForm = (s: Settings): Form => ({
  shopEnabled: s.shopEnabled,
  packagingGrams: String(s.packagingGrams),
  brackets: s.shippingBrackets.map((b) => ({
    maxWeightGrams: String(b.maxWeightGrams),
    relayPrice: String(b.relayPrice),
    homePrice: String(b.homePrice),
  })),
  relayOfferCode: s.relayOfferCode,
  homeOfferCode: s.homeOfferCode,
  relayNetworks: s.relayNetworks.join(', '),
  parcelLengthCm: String(s.parcelLengthCm),
  parcelWidthCm: String(s.parcelWidthCm),
  parcelHeightCm: String(s.parcelHeightCm),
});

const num = (value: string) => Number(value.replace(',', '.'));

export default function ShopSettingsPage() {
  const [form, setForm] = useState<Form | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/shop-settings')
      .then(async (response) => {
        if (!response.ok) throw new Error('load failed');
        return (await response.json()) as Settings;
      })
      .then((settings) => {
        setForm(toForm(settings));
        setStatus({ stripeConfigured: settings.stripeConfigured, boxtalConfigured: settings.boxtalConfigured });
      })
      .catch(() => setMessage({ text: 'Erreur lors du chargement des réglages.', isError: true }));
  }, []);

  if (!form) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className={message?.isError ? 'text-red-400' : ''}>{message?.text ?? 'Chargement...'}</p>
      </div>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((previous) => (previous ? { ...previous, [key]: value } : previous));
  const setBracket = (index: number, field: keyof Bracket, value: string) =>
    set('brackets', form.brackets.map((bracket, i) => (i === index ? { ...bracket, [field]: value } : bracket)));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/shop-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopEnabled: form.shopEnabled,
          packagingGrams: num(form.packagingGrams),
          shippingBrackets: form.brackets.map((b) => ({
            maxWeightGrams: num(b.maxWeightGrams),
            relayPrice: num(b.relayPrice),
            homePrice: num(b.homePrice),
          })),
          relayOfferCode: form.relayOfferCode.trim(),
          homeOfferCode: form.homeOfferCode.trim(),
          relayNetworks: form.relayNetworks.split(',').map((n) => n.trim()).filter(Boolean),
          parcelLengthCm: num(form.parcelLengthCm),
          parcelWidthCm: num(form.parcelWidthCm),
          parcelHeightCm: num(form.parcelHeightCm),
        }),
      });
      const data = (await response.json().catch(() => null)) as (Settings & { error?: string }) | null;
      if (!response.ok || !data) throw new Error(data?.error ?? 'Erreur lors de l’enregistrement.');

      setForm(toForm(data));
      setStatus({ stripeConfigured: data.stripeConfigured, boxtalConfigured: data.boxtalConfigured });
      setMessage({ text: 'Réglages enregistrés.', isError: false });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Réglages de la boutique</h1>
      <OrdersNav />

      {message && (
        <p role="status" className={`mb-4 rounded-md px-3 py-2 text-sm ${message.isError ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
          {message.text}
        </p>
      )}

      <form onSubmit={save} className="max-w-3xl space-y-8">
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="font-semibold">Ouverture</h2>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.shopEnabled} onChange={(e) => set('shopEnabled', e.target.checked)} />
            <span>Boutique ouverte (les clients peuvent commander et payer en ligne)</span>
          </label>
          <ul className="space-y-1 text-sm">
            <li className={status?.stripeConfigured ? 'text-green-400' : 'text-amber-400'}>
              {status?.stripeConfigured ? '✓ Stripe configuré' : '⚠ Stripe non configuré (STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET dans .env.local) : les paiements échoueront.'}
            </li>
            <li className={status?.boxtalConfigured ? 'text-green-400' : 'text-amber-400'}>
              {status?.boxtalConfigured ? '✓ Boxtal configuré' : '⚠ Boxtal non configuré (BOXTAL_ACCESS_KEY et BOXTAL_SECRET_KEY) : pas de points relais ni d’étiquettes.'}
            </li>
          </ul>
        </section>

        <section className="space-y-4 rounded-lg border border-border p-4">
          <div>
            <h2 className="font-semibold">Frais de port</h2>
            <p className="text-sm text-muted-foreground">
              Recopiez votre grille tarifaire Boxtal. Chaque tranche s’applique jusqu’à son poids maximum (colis compris) ; le poids du colis est celui des articles plus l’emballage.
            </p>
          </div>

          <div className="max-w-48 space-y-1">
            <Label htmlFor="packaging">Poids de l’emballage (g)</Label>
            <Input id="packaging" inputMode="numeric" value={form.packagingGrams} onChange={(e) => set('packagingGrams', e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground sm:grid">
              <span>Jusqu’à (g)</span><span>Point relais (€)</span><span>Domicile (€)</span><span className="w-20" />
            </div>
            {form.brackets.map((bracket, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Input aria-label="Poids maximum en grammes" inputMode="numeric" placeholder="500" value={bracket.maxWeightGrams} onChange={(e) => setBracket(index, 'maxWeightGrams', e.target.value)} />
                <Input aria-label="Prix point relais" inputMode="decimal" placeholder="4,90" value={bracket.relayPrice} onChange={(e) => setBracket(index, 'relayPrice', e.target.value)} />
                <Input aria-label="Prix domicile" inputMode="decimal" placeholder="7,90" value={bracket.homePrice} onChange={(e) => setBracket(index, 'homePrice', e.target.value)} />
                <Button type="button" variant="outline" size="sm" className="col-span-3 sm:col-span-1" onClick={() => set('brackets', form.brackets.filter((_, i) => i !== index))}>
                  Retirer
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set('brackets', [...form.brackets, { maxWeightGrams: '', relayPrice: '', homePrice: '' }])}>
              Ajouter une tranche
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border p-4">
          <div>
            <h2 className="font-semibold">Boxtal</h2>
            <p className="text-sm text-muted-foreground">À copier depuis votre compte Boxtal (catalogue des offres de transport). Laissez « domicile » vide pour ne proposer que les points relais.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="relayOffer">Code d’offre point relais</Label>
              <Input id="relayOffer" value={form.relayOfferCode} onChange={(e) => set('relayOfferCode', e.target.value)} placeholder="ex. MONR-CpourToi" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="homeOffer">Code d’offre domicile</Label>
              <Input id="homeOffer" value={form.homeOfferCode} onChange={(e) => set('homeOfferCode', e.target.value)} placeholder="ex. CHRP-Chrono13" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="networks">Réseaux de points relais proposés (séparés par des virgules)</Label>
              <Input id="networks" value={form.relayNetworks} onChange={(e) => set('relayNetworks', e.target.value)} placeholder="MONR" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Dimensions du colis standard (cm)</p>
            <div className="grid max-w-md grid-cols-3 gap-2">
              <Input aria-label="Longueur" inputMode="numeric" value={form.parcelLengthCm} onChange={(e) => set('parcelLengthCm', e.target.value)} />
              <Input aria-label="Largeur" inputMode="numeric" value={form.parcelWidthCm} onChange={(e) => set('parcelWidthCm', e.target.value)} />
              <Input aria-label="Hauteur" inputMode="numeric" value={form.parcelHeightCm} onChange={(e) => set('parcelHeightCm', e.target.value)} />
            </div>
          </div>
        </section>

        <Button type="submit" disabled={isSaving}>{isSaving ? 'Enregistrement...' : 'Enregistrer les réglages'}</Button>
      </form>
    </div>
  );
}
