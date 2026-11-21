import { clientIp, rateLimit } from '@/lib/rate-limit';
import { computeShippingCost, getShopSettings } from '@/lib/shipping';
import { cartLinesSchema, resolveCart } from '@/lib/shop';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({ lines: cartLinesSchema.min(1) });

/** Public : frais de port du panier pour chaque mode de livraison. */
export async function POST(request: Request) {
  const limit = await rateLimit(`shipping:ip:${clientIp(request)}`, 60, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Trop de requêtes, réessayez dans un instant.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Panier invalide.' }, { status: 400 });
  }

  const [settings, cart] = await Promise.all([getShopSettings(), resolveCart(parsed.data.lines)]);

  if (!settings.shopEnabled) {
    return NextResponse.json({ error: 'La boutique en ligne est momentanément fermée.' }, { status: 503 });
  }
  if (cart.lines.every((line) => line.status === 'unavailable')) {
    return NextResponse.json({ error: 'Votre panier ne contient plus d’article disponible.' }, { status: 409 });
  }

  const relay = computeShippingCost(settings, cart.weightGrams, 'relay');
  const home = computeShippingCost(settings, cart.weightGrams, 'home');

  if (!relay.ok) {
    return NextResponse.json(
      {
        error:
          relay.reason === 'too-heavy'
            ? 'Ce panier est trop lourd pour être expédié en une fois. Retirez un article ou contactez-nous.'
            : 'La livraison n’est pas encore configurée. Contactez-nous.',
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    relay: { available: Boolean(settings.relayOfferCode), cost: relay.cost },
    home: { available: Boolean(settings.homeOfferCode) && home.ok, cost: home.ok ? home.cost : 0 },
    relayNetworks: settings.relayNetworks,
  });
}
