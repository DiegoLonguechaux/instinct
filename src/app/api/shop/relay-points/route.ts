import { isBoxtalConfigured, searchRelayPoints } from '@/lib/boxtal';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getShopSettings } from '@/lib/shipping';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const addressSchema = z.object({
  postalCode: z.string().regex(/^\d{5}$/),
  city: z.string().trim().min(1).max(80),
});

const positionSchema = z.object({
  lat: z.coerce.number().min(41).max(52), // France métropolitaine (Corse comprise)
  lng: z.coerce.number().min(-6).max(10),
});

/** Distance à vol d'oiseau en mètres (haversine). */
function distanceMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(toRad(to.lat - from.lat) / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(toRad(to.lng - from.lng) / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Coordonnées -> code postal + ville (Géoplateforme de l'IGN, gratuit, sans clé).
 * Fait côté serveur : la position n'est transmise qu'à ce service, jamais stockée.
 */
async function reverseGeocode(lat: number, lng: number) {
  const query = new URLSearchParams({ lat: String(lat), lon: String(lng), limit: '1' });
  const response = await fetch(`https://data.geopf.fr/geocodage/reverse?${query}`, {
    signal: AbortSignal.timeout(5_000),
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { features?: { properties?: { postcode?: string; city?: string } }[] };
  const properties = data.features?.[0]?.properties;
  return properties?.postcode && properties.city ? { postalCode: properties.postcode, city: properties.city } : null;
}

/**
 * Public : points relais proches d'une adresse (`postalCode` + `city`) ou d'une
 * position GPS (`lat` + `lng`, depuis la géolocalisation du navigateur).
 */
export async function GET(request: Request) {
  const limit = await rateLimit(`relay:ip:${clientIp(request)}`, 30, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Trop de recherches, réessayez dans un instant.' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const position = positionSchema.safeParse({ lat: params.get('lat'), lng: params.get('lng') });
  const address = addressSchema.safeParse({ postalCode: params.get('postalCode'), city: params.get('city') });

  if (!position.success && !address.success) {
    return NextResponse.json({ error: 'Saisissez un code postal et une ville valides.' }, { status: 400 });
  }

  if (!isBoxtalConfigured()) {
    return NextResponse.json({ error: 'La recherche de points relais est indisponible.' }, { status: 503 });
  }

  const settings = await getShopSettings();
  try {
    let search = address.success ? address.data : null;
    if (position.success) {
      search = await reverseGeocode(position.data.lat, position.data.lng);
      if (!search) {
        return NextResponse.json(
          { error: 'Position non reconnue en France. Saisissez votre code postal et votre ville.' },
          { status: 422 }
        );
      }
    }
    if (!search) {
      return NextResponse.json({ error: 'Saisissez un code postal et une ville valides.' }, { status: 400 });
    }

    const found = await searchRelayPoints({ networks: settings.relayNetworks, ...search });

    // Avec une position GPS, on retrie depuis le point exact (Boxtal mesure depuis le centre de la commune).
    const origin = position.success ? position.data : null;
    const points = origin
      ? found
          .map((point) =>
            point.latitude !== null && point.longitude !== null
              ? { ...point, distanceMeters: Math.round(distanceMeters(origin, { lat: point.latitude, lng: point.longitude })) }
              : point
          )
          .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
      : found;

    return NextResponse.json({ points, searched: search, center: origin });
  } catch (error) {
    console.error('Relay points error:', error);
    return NextResponse.json(
      { error: 'Impossible de charger les points relais. Réessayez, ou choisissez la livraison à domicile.' },
      { status: 502 }
    );
  }
}
