import dbConnect from '@/lib/db';
import ShopSettingsModel, { type IShippingBracket } from '@/models/ShopSettings';

/** Réglages de la boutique ; le document est créé (boutique fermée) au premier accès. */
export async function getShopSettings() {
  await dbConnect();
  const existing = await ShopSettingsModel.findOne({}).lean();
  if (existing) {
    return existing;
  }
  const created = await ShopSettingsModel.create({});
  return created.toObject();
}

export type ShippingMode = 'relay' | 'home';

type ShippingQuote =
  | { ok: true; cost: number; parcelWeightGrams: number }
  | { ok: false; reason: 'not-configured' | 'too-heavy' };

/**
 * Frais de port d'un colis : poids des articles + emballage, puis première
 * tranche du barème dont le plafond couvre ce poids.
 */
export function computeShippingCost(
  settings: { packagingGrams: number; shippingBrackets: IShippingBracket[] },
  itemsWeightGrams: number,
  mode: ShippingMode
): ShippingQuote {
  const parcelWeightGrams = itemsWeightGrams + settings.packagingGrams;
  const brackets = [...settings.shippingBrackets].sort((a, b) => a.maxWeightGrams - b.maxWeightGrams);

  if (brackets.length === 0) {
    return { ok: false, reason: 'not-configured' };
  }

  const bracket = brackets.find((candidate) => candidate.maxWeightGrams >= parcelWeightGrams);
  if (!bracket) {
    return { ok: false, reason: 'too-heavy' };
  }

  return { ok: true, cost: mode === 'relay' ? bracket.relayPrice : bracket.homePrice, parcelWeightGrams };
}
