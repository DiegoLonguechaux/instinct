import { requireSession } from '@/lib/api-route-helpers';
import { isBoxtalConfigured } from '@/lib/boxtal';
import dbConnect from '@/lib/db';
import { getShopSettings } from '@/lib/shipping';
import { isStripeConfigured } from '@/lib/stripe';
import ShopSettingsModel from '@/models/ShopSettings';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const price = z.number().min(0).max(500);

const bodySchema = z.object({
  shopEnabled: z.boolean(),
  packagingGrams: z.number().int().min(0).max(5000),
  shippingBrackets: z
    .array(z.object({ maxWeightGrams: z.number().int().min(1).max(30000), relayPrice: price, homePrice: price }))
    .max(20),
  relayOfferCode: z.string().trim().max(60),
  homeOfferCode: z.string().trim().max(60),
  relayNetworks: z.array(z.string().trim().min(1).max(20)).max(6),
  parcelLengthCm: z.number().min(1).max(200),
  parcelWidthCm: z.number().min(1).max(200),
  parcelHeightCm: z.number().min(1).max(200),
});

async function view() {
  const settings = await getShopSettings();
  return {
    shopEnabled: settings.shopEnabled,
    packagingGrams: settings.packagingGrams,
    shippingBrackets: [...settings.shippingBrackets].sort((a, b) => a.maxWeightGrams - b.maxWeightGrams),
    relayOfferCode: settings.relayOfferCode,
    homeOfferCode: settings.homeOfferCode,
    relayNetworks: settings.relayNetworks,
    parcelLengthCm: settings.parcelLengthCm,
    parcelWidthCm: settings.parcelWidthCm,
    parcelHeightCm: settings.parcelHeightCm,
    // État des branchements, pour avertir dans l'admin avant d'ouvrir la boutique.
    stripeConfigured: isStripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    boxtalConfigured: isBoxtalConfigured(),
  };
}

export async function GET() {
  const { error } = await requireSession();
  if (error) {
    return error;
  }
  return NextResponse.json(await view());
}

export async function PUT(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Réglages invalides, vérifiez les champs.' }, { status: 400 });
  }
  const settings = parsed.data;

  const weights = settings.shippingBrackets.map((bracket) => bracket.maxWeightGrams);
  if (new Set(weights).size !== weights.length) {
    return NextResponse.json({ error: 'Deux tranches de poids ont le même plafond.' }, { status: 400 });
  }

  if (settings.shopEnabled && (settings.shippingBrackets.length === 0 || !settings.relayOfferCode)) {
    return NextResponse.json(
      { error: 'Pour ouvrir la boutique, renseignez au moins une tranche de port et le code d’offre « point relais ».' },
      { status: 400 }
    );
  }

  await dbConnect();
  await getShopSettings(); // garantit l'existence du document
  await ShopSettingsModel.updateOne({}, { $set: settings });

  return NextResponse.json(await view());
}
