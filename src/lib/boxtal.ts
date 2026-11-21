// Client Boxtal API v3 (points relais, création d'étiquette, suivi).
//
// ⚠️ Écrit d'après la documentation publique et des clients communautaires,
// SANS pouvoir tester contre le vrai sandbox (pas encore de clés). Les chemins,
// paramètres et formes de réponse sont donc à valider avec `npm run boxtal:check`
// dès que des clés API v3 sont disponibles ; tout ce qui parle à Boxtal est ici
// pour que les corrections restent localisées dans ce fichier.
//
// Les prix du port NE viennent PAS de Boxtal : l'API v3 n'a pas de cotation,
// le barème est configuré dans l'admin (voir src/lib/shipping.ts).

import type { IOrder } from '@/models/Order';

const BASE_URLS = {
  sandbox: 'https://api.boxtal.build',
  production: 'https://api.boxtal.com',
} as const;

const PARCEL_POINTS_PATH = '/shipping/v3.2/parcel-point-by-network';
const SHIPPING_ORDER_PATH = '/shipping/v3.1/shipping-order';

export function isBoxtalConfigured() {
  return Boolean(process.env.BOXTAL_ACCESS_KEY && process.env.BOXTAL_SECRET_KEY);
}

export class BoxtalError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'BoxtalError';
  }
}

async function boxtalFetch(path: string, init: RequestInit = {}) {
  const accessKey = process.env.BOXTAL_ACCESS_KEY;
  const secretKey = process.env.BOXTAL_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new BoxtalError('Boxtal n’est pas configuré (BOXTAL_ACCESS_KEY / BOXTAL_SECRET_KEY).');
  }

  const base = BASE_URLS[process.env.BOXTAL_ENV === 'production' ? 'production' : 'sandbox'];
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${accessKey}:${secretKey}`).toString('base64')}`,
      ...init.headers,
    },
    // Ne jamais laisser un appel transporteur bloquer le tunnel de commande.
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Réponse non JSON : on garde `data` à null et on remonte le statut.
  }

  if (!response.ok) {
    const detail = (data as { errors?: { message?: string }[]; message?: string } | null)?.errors?.[0]?.message
      ?? (data as { message?: string } | null)?.message
      ?? text.slice(0, 200);
    throw new BoxtalError(`Boxtal ${response.status} : ${detail}`, response.status);
  }

  return data;
}

// --- Points relais ---------------------------------------------------------

export type RelayPoint = {
  code: string;
  network: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
};

type Json = Record<string, unknown>;
const asObject = (value: unknown): Json => (value && typeof value === 'object' ? (value as Json) : {});
const asString = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * Normalise un point relais. La doc et l'API divergent sur la casse des clés
 * (`parcelPoint` / `parcelpoint`) : on accepte les deux variantes.
 */
export function mapRelayPoint(raw: unknown): RelayPoint | null {
  const entry = asObject(raw);
  const point = asObject(entry.parcelPoint ?? entry.parcelpoint ?? entry);
  const location = asObject(point.location);
  const code = asString(point.code);

  if (!code) {
    return null;
  }

  const distance = Number(entry.distanceFromSearchLocation ?? point.distanceFromSearchLocation);
  const position = asObject(location.position);
  const latitude = Number(position.latitude);
  const longitude = Number(position.longitude);

  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    code,
    network: asString(point.network),
    name: asString(point.name),
    street: asString(location.street ?? point.street),
    postalCode: asString(location.postalCode ?? point.postalCode),
    city: asString(location.city ?? point.city),
    distanceMeters: Number.isFinite(distance) ? distance : null,
  };
}

/**
 * Boxtal attend le nom complet du réseau (`MONR_NETWORK`) alors que les codes
 * d'offre commencent par le code court (`MONR-CpourToi`) : on accepte les deux.
 */
export function toBoxtalNetwork(network: string) {
  const value = network.trim().toUpperCase();
  return value.endsWith('_NETWORK') ? value : `${value}_NETWORK`;
}

export async function searchRelayPoints(params: {
  networks: string[];
  postalCode: string;
  city: string;
}): Promise<RelayPoint[]> {
  // Un réseau par appel (la recherche renvoie au plus 30 points tous réseaux confondus).
  const results = await Promise.all(
    params.networks.map(async (network) => {
      const searchNetwork = toBoxtalNetwork(network);
      const query = new URLSearchParams({
        searchNetworks: searchNetwork,
        countryIsoCode: 'FR',
        postalCode: params.postalCode,
        city: params.city,
      });
      const data = asObject(await boxtalFetch(`${PARCEL_POINTS_PATH}?${query}`));
      const list = data.content ?? data.parcelPoints ?? data.items ?? (Array.isArray(data) ? data : []);
      return (Array.isArray(list) ? list : []).map((raw) => {
        const point = mapRelayPoint(raw);
        // La réponse ne porte pas un champ `network` : on garde celui qu'on a interrogé.
        return point && !point.network ? { ...point, network: searchNetwork } : point;
      });
    })
  );

  return results
    .flat()
    .filter((point): point is RelayPoint => point !== null)
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    .slice(0, 30);
}

// --- Étiquette -------------------------------------------------------------

export type ShipperConfig = {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
};

/** Adresse d'expédition du groupe, lue dans l'environnement (SHIPPER_*). */
export function getShipperConfig(): ShipperConfig {
  const read = (name: string) => process.env[`SHIPPER_${name}`]?.trim() ?? '';
  const config = {
    company: read('COMPANY'),
    firstName: read('FIRST_NAME'),
    lastName: read('LAST_NAME'),
    email: read('EMAIL'),
    phone: read('PHONE'),
    street: read('STREET'),
    postalCode: read('POSTAL_CODE'),
    city: read('CITY'),
  };

  const missing = Object.entries(config)
    .filter(([key, value]) => !value && key !== 'company')
    .map(([key]) => `SHIPPER_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`);
  if (missing.length > 0) {
    throw new BoxtalError(`Adresse d’expédition incomplète : ${missing.join(', ')}.`);
  }

  return config;
}

export type CreatedShipment = { boxtalOrderId: string };

export async function createShippingOrder(
  order: Pick<IOrder, 'number' | 'customer' | 'delivery' | 'subtotal'>,
  parcel: { weightGrams: number; lengthCm: number; widthCm: number; heightCm: number }
): Promise<CreatedShipment> {
  const shipper = getShipperConfig();
  const { customer, delivery } = order;

  if (!delivery.offerCode) {
    throw new BoxtalError('Aucun code d’offre Boxtal configuré pour ce mode de livraison (Réglages de la boutique).');
  }

  const destination =
    delivery.mode === 'relay'
      ? { street: delivery.relayPoint?.street ?? '', postalCode: delivery.relayPoint?.postalCode ?? '', city: delivery.relayPoint?.city ?? '' }
      : { street: delivery.address?.street ?? '', postalCode: delivery.address?.postalCode ?? '', city: delivery.address?.city ?? '' };

  const body = {
    shipment: {
      externalId: order.number,
      packages: [
        {
          type: 'PARCEL',
          value: { value: order.subtotal, currency: 'EUR' },
          length: parcel.lengthCm,
          width: parcel.widthCm,
          height: parcel.heightCm,
          // Boxtal attend des kilogrammes.
          weight: Math.max(0.1, parcel.weightGrams / 1000),
          content: { id: 'content:v1:10120', description: 'Vêtements et produits dérivés' },
        },
      ],
      fromAddress: {
        type: 'BUSINESS',
        contact: { company: shipper.company || undefined, email: shipper.email, phone: shipper.phone, firstName: shipper.firstName, lastName: shipper.lastName },
        location: { countryIsoCode: 'FR', city: shipper.city, postalCode: shipper.postalCode, street: shipper.street },
      },
      toAddress: {
        type: 'RESIDENTIAL',
        contact: { email: customer.email, phone: customer.phone, firstName: customer.firstName, lastName: customer.lastName },
        location: { countryIsoCode: 'FR', ...destination },
      },
      pickupPointCode: delivery.mode === 'relay' ? delivery.relayPoint?.code : undefined,
    },
    shippingOfferCode: delivery.offerCode,
    labelType: 'PDF_A4',
    insured: false,
  };

  const data = asObject(await boxtalFetch(SHIPPING_ORDER_PATH, { method: 'POST', body: JSON.stringify(body) }));
  const content = asObject(data.content);
  const boxtalOrderId = asString(content.id ?? data.id);

  if (!boxtalOrderId) {
    throw new BoxtalError('Réponse Boxtal inattendue : identifiant de commande absent.');
  }
  return { boxtalOrderId };
}

export async function cancelShippingOrder(boxtalOrderId: string) {
  await boxtalFetch(`${SHIPPING_ORDER_PATH}/${encodeURIComponent(boxtalOrderId)}`, { method: 'DELETE' });
}

/** Étiquette et suivi : peuvent être vides tant que Boxtal génère le document (voir webhook). */
export async function getShipmentDocuments(boxtalOrderId: string) {
  const data = asObject(
    await boxtalFetch(`${SHIPPING_ORDER_PATH}/${encodeURIComponent(boxtalOrderId)}/shipping-document`)
  );
  const documents = Array.isArray(data.content) ? data.content : [];
  const label = documents.map(asObject).find((doc) => asString(doc.type).toUpperCase() === 'LABEL');
  return { labelUrl: asString(label?.url) };
}

export async function getTracking(boxtalOrderId: string) {
  const data = asObject(
    await boxtalFetch(`${SHIPPING_ORDER_PATH}/${encodeURIComponent(boxtalOrderId)}/tracking`)
  );
  // `content` est la liste des colis de la commande ; un seul colis chez nous.
  const parcel = asObject(Array.isArray(data.content) ? data.content[0] : data.content);
  return {
    trackingNumber: asString(parcel.trackingNumber),
    trackingUrl: asString(parcel.packageTrackingUrl ?? parcel.trackingUrl),
  };
}
