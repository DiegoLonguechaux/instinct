'use client';

import { formatPrice } from '@/lib/merch';
import { normalizeFrenchPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartProvider';
import { type RelayPointSelection, useCheckoutState } from './checkoutStore';
import { OrderSummary } from './OrderSummary';
import { RelayMapLoader } from './RelayMapLoader';
import { inputClass, labelClass, shopButtonClass } from './styles';
import { useCartDetails } from './useCartDetails';
import { useShippingOptions } from './useShippingOptions';

type FoundPoint = RelayPointSelection & {
  distanceMeters: number | null;
  latitude: number | null;
  longitude: number | null;
};

type SearchResponse = {
  points?: FoundPoint[];
  searched?: { postalCode: string; city: string };
  center?: { lat: number; lng: number } | null;
  error?: string;
};

const formatDistance = (meters: number | null) =>
  meters === null ? '' : meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

export function CheckoutForm() {
  const router = useRouter();
  const { ready } = useCart();
  const { cart, isLoading: cartLoading, notice } = useCartDetails();
  const { options, error: shippingError, isLoading: shippingLoading } = useShippingOptions();
  const [state, update] = useCheckoutState();

  const [searchPostal, setSearchPostal] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [points, setPoints] = useState<FoundPoint[] | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [formError, setFormError] = useState('');

  if (!ready || (cartLoading && !cart)) {
    return <p className="text-instinct-foreground/60">Chargement...</p>;
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-instinct-foreground/70">Votre panier est vide.</p>
        <Link href="/#le-merch" className="mt-4 inline-block text-sm font-semibold tracking-widest text-instinct-purple uppercase underline">
          Voir le merch
        </Link>
      </div>
    );
  }

  const setCustomer = (field: keyof typeof state.customer, value: string) =>
    update((previous) => ({ ...previous, customer: { ...previous.customer, [field]: value } }));
  const setAddress = (field: keyof typeof state.address, value: string) =>
    update((previous) => ({ ...previous, address: { ...previous.address, [field]: value } }));

  const shippingCost =
    state.mode === 'relay' ? options?.relay.cost : state.mode === 'home' ? options?.home.cost : undefined;

  const fetchRelays = async (query: URLSearchParams) => {
    setSearchError('');
    setPoints(null);
    setIsSearching(true);
    try {
      const response = await fetch(`/api/shop/relay-points?${query}`);
      const data = (await response.json().catch(() => null)) as SearchResponse | null;
      if (!response.ok || !data?.points) {
        throw new Error(data?.error ?? 'Impossible de charger les points relais.');
      }
      setPoints(data.points);
      setCenter(data.center ?? null);
      if (data.searched) {
        // Une recherche par position remplit les champs : on voit où on cherche et on peut corriger.
        setSearchPostal(data.searched.postalCode);
        setSearchCity(data.searched.city);
      }
      if (data.points.length === 0) {
        setSearchError('Aucun point relais trouvé près de cette adresse.');
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Impossible de charger les points relais.');
    } finally {
      setIsSearching(false);
    }
  };

  const searchRelays = () => {
    if (!/^\d{5}$/.test(searchPostal) || !searchCity.trim()) {
      setPoints(null);
      setSearchError('Saisissez un code postal (5 chiffres) et une ville.');
      return;
    }
    return fetchRelays(new URLSearchParams({ postalCode: searchPostal, city: searchCity.trim() }));
  };

  /** `silent` : recherche automatique à l'ouverture, sans message d'erreur si la position est refusée. */
  const locateMe = (silent = false) => {
    if (!('geolocation' in navigator)) {
      if (!silent) setSearchError('La localisation n’est pas disponible sur cet appareil. Saisissez votre code postal.');
      return;
    }

    setSearchError('');
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Arrondi à ~100 m : suffisant pour trouver un relais, inutile d'envoyer plus précis.
        void fetchRelays(
          new URLSearchParams({
            lat: position.coords.latitude.toFixed(3),
            lng: position.coords.longitude.toFixed(3),
          })
        );
      },
      () => {
        setIsSearching(false);
        if (!silent) {
          setSearchError('Localisation refusée ou indisponible. Saisissez votre code postal et votre ville.');
        }
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  };

  const selectPoint = (point: FoundPoint) => {
    update((previous) => ({
      ...previous,
      relayPoint: {
        code: point.code,
        network: point.network,
        name: point.name,
        street: point.street,
        postalCode: point.postalCode,
        city: point.city,
      },
    }));
    // Un clic sur la carte doit faire apparaître le point dans la liste.
    document.getElementById(`relay-${point.code}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const chooseMode = (mode: 'relay' | 'home') => {
    const opening = mode === 'relay' && state.mode !== 'relay' && points === null && !isSearching && !state.relayPoint;
    update((previous) => ({ ...previous, mode }));
    if (opening) {
      locateMe(true);
    }
  };

  const goToRecap = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const { customer, address } = state;

    if (!customer.firstName.trim() || !customer.lastName.trim()) {
      return setFormError('Indiquez votre prénom et votre nom.');
    }
    if (!/^\S+@\S+\.\S+$/.test(customer.email.trim())) {
      return setFormError('Adresse email invalide.');
    }
    if (!normalizeFrenchPhone(customer.phone)) {
      return setFormError('Numéro de téléphone invalide (numéro français attendu, ex. 06 12 34 56 78).');
    }
    if (!state.mode) {
      return setFormError('Choisissez un mode de livraison.');
    }
    if (state.mode === 'relay' && !state.relayPoint) {
      return setFormError('Choisissez un point relais.');
    }
    if (state.mode === 'home' && (address.street.trim().length < 3 || !/^\d{5}$/.test(address.postalCode) || !address.city.trim())) {
      return setFormError('Adresse de livraison incomplète.');
    }

    router.push('/commande/recapitulatif');
  };

  return (
    <form onSubmit={goToRecap} className="grid gap-10 lg:grid-cols-[1fr_24rem]" noValidate>
      <div className="space-y-10">
        {notice && <p className="border border-instinct-purple/60 p-3 text-sm">{notice}</p>}

        <section>
          <h2 className="mb-4 font-serif text-2xl uppercase">1. Vos coordonnées</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>Prénom</label>
              <input id="firstName" autoComplete="given-name" className={inputClass} value={state.customer.firstName} onChange={(e) => setCustomer('firstName', e.target.value)} />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>Nom</label>
              <input id="lastName" autoComplete="family-name" className={inputClass} value={state.customer.lastName} onChange={(e) => setCustomer('lastName', e.target.value)} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" type="email" autoComplete="email" className={inputClass} value={state.customer.email} onChange={(e) => setCustomer('email', e.target.value)} />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Téléphone</label>
              <input id="phone" type="tel" autoComplete="tel" className={inputClass} placeholder="06 12 34 56 78" value={state.customer.phone} onChange={(e) => setCustomer('phone', e.target.value)} />
              <p className="mt-1 text-xs text-instinct-foreground/50">Le transporteur vous prévient par SMS de l’arrivée du colis.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-serif text-2xl uppercase">2. Livraison (France)</h2>

          {shippingLoading && <p className="text-sm text-instinct-foreground/60">Calcul des frais de port...</p>}
          {shippingError && <p role="alert" className="border border-red-400/60 p-3 text-sm text-red-300">{shippingError}</p>}

          {options && (
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mode de livraison">
              {([
                ['relay', 'En point relais', options.relay],
                ['home', 'À domicile', options.home],
              ] as const).map(([mode, label, option]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={state.mode === mode}
                  disabled={!option.available}
                  onClick={() => chooseMode(mode)}
                  className={cn(
                    'flex items-center justify-between border p-4 text-left cursor-pointer',
                    state.mode === mode ? 'border-instinct-purple bg-instinct-purple/10' : 'border-instinct-foreground/30 hover:border-instinct-purple',
                    !option.available && 'cursor-not-allowed opacity-40 hover:border-instinct-foreground/30'
                  )}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="tabular-nums">{option.available ? formatPrice(option.cost) : 'Indisponible'}</span>
                </button>
              ))}
            </div>
          )}

          {state.mode === 'relay' && (
            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={() => locateMe()}
                disabled={isSearching}
                className="w-full border border-instinct-purple px-6 py-3 text-sm font-semibold tracking-widest text-instinct-purple uppercase hover:bg-instinct-purple/10 disabled:opacity-40 sm:w-auto cursor-pointer"
              >
                {isSearching ? 'Recherche...' : 'Autour de moi'}
              </button>

              <div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
                <div>
                  <label htmlFor="searchPostal" className={labelClass}>Code postal</label>
                  <input id="searchPostal" inputMode="numeric" maxLength={5} autoComplete="postal-code" className={inputClass} value={searchPostal} onChange={(e) => setSearchPostal(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <label htmlFor="searchCity" className={labelClass}>Ville</label>
                  <input id="searchCity" autoComplete="address-level2" className={inputClass} value={searchCity} onChange={(e) => setSearchCity(e.target.value)} />
                </div>
                <button type="button" onClick={searchRelays} disabled={isSearching} className="border border-instinct-foreground/40 px-6 py-3 text-sm font-semibold tracking-widest uppercase hover:border-instinct-purple disabled:opacity-40 cursor-pointer">
                  {isSearching ? 'Recherche...' : 'Rechercher'}
                </button>
              </div>

              {searchError && <p role="alert" className="text-sm text-red-300">{searchError}</p>}

              {state.relayPoint && (
                <p className="border border-instinct-purple p-3 text-sm">
                  <span className="font-semibold">Point relais choisi :</span> {state.relayPoint.name}, {state.relayPoint.street}, {state.relayPoint.postalCode} {state.relayPoint.city}
                </p>
              )}

            </div>
          )}

          {state.mode === 'home' && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="street" className={labelClass}>Adresse</label>
                <input id="street" autoComplete="address-line1" className={inputClass} value={state.address.street} onChange={(e) => setAddress('street', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="complement" className={labelClass}>Complément (optionnel)</label>
                <input id="complement" autoComplete="address-line2" className={inputClass} value={state.address.complement} onChange={(e) => setAddress('complement', e.target.value)} />
              </div>
              <div>
                <label htmlFor="postalCode" className={labelClass}>Code postal</label>
                <input id="postalCode" inputMode="numeric" maxLength={5} autoComplete="postal-code" className={inputClass} value={state.address.postalCode} onChange={(e) => setAddress('postalCode', e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label htmlFor="city" className={labelClass}>Ville</label>
                <input id="city" autoComplete="address-level2" className={inputClass} value={state.address.city} onChange={(e) => setAddress('city', e.target.value)} />
              </div>
            </div>
          )}
        </section>

        {formError && <p role="alert" className="border border-red-400/60 p-3 text-sm text-red-300">{formError}</p>}
      </div>

      {/* Mobile : le récapitulatif passe en dernier (order-3), après la carte, pour que la recherche
          de point relais et ses résultats se suivent. Dès `lg`, ordre naturel : colonne de droite. */}
      <div className="order-3 lg:order-none">
        <OrderSummary
          lines={cart.lines}
          subtotal={cart.subtotal}
          shippingCost={shippingCost}
          footer={
            <button type="submit" className={cn(shopButtonClass, 'mt-6 cursor-pointer')}>
              Continuer
            </button>
          }
        />
      </div>

      {/* Carte et liste sur toute la largeur de la page, côte à côte dès la tablette, l'une sous l'autre sur mobile. */}
      {state.mode === 'relay' && points && points.length > 0 && (
        <div className="order-2 space-y-4 lg:order-none lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <RelayMapLoader
              points={points}
              selectedCode={state.relayPoint?.code ?? null}
              center={center}
              onSelect={(code) => {
                const point = points.find((candidate) => candidate.code === code);
                if (point) selectPoint(point);
              }}
            />

            <ul className="max-h-96 space-y-2 overflow-y-auto md:max-h-[30rem]" role="radiogroup" aria-label="Points relais">
              {points.map((point) => (
                <li key={`${point.network}-${point.code}`}>
                  <button
                    id={`relay-${point.code}`}
                    type="button"
                    role="radio"
                    aria-checked={state.relayPoint?.code === point.code}
                    onClick={() => selectPoint(point)}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 border p-3 text-left text-sm cursor-pointer',
                      state.relayPoint?.code === point.code ? 'border-instinct-purple bg-instinct-purple/10' : 'border-instinct-foreground/30 hover:border-instinct-purple'
                    )}
                  >
                    <span>
                      <span className="block font-semibold">{point.name}</span>
                      <span className="text-instinct-foreground/70">{point.street}, {point.postalCode} {point.city}</span>
                    </span>
                    <span className="shrink-0 text-instinct-foreground/60">{formatDistance(point.distanceMeters)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Sur grand écran le récapitulatif (et son bouton) est en haut à droite : on double le bouton sous la carte.
              Sur mobile, le récapitulatif vient juste après, inutile. */}
          {state.relayPoint && (
            <button type="submit" className={cn(shopButtonClass, 'hidden lg:inline-flex lg:w-auto lg:px-12')}>
              Continuer
            </button>
          )}
        </div>
      )}
    </form>
  );
}
