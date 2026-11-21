import dbConnect from '@/lib/db';
import { round2, variantsOf } from '@/lib/merch';
import MerchModel from '@/models/Merch';
import { z } from 'zod';

/** Quantité max d'une même variante dans un panier (limite aussi les abus). */
export const SHOP_MAX_QTY_PER_LINE = 10;

export const cartLinesSchema = z
  .array(
    z.object({
      merchId: z.string().regex(/^[a-f\d]{24}$/i),
      size: z.string().max(10).default(''),
      quantity: z.number().int().min(1).max(99),
    })
  )
  .max(20);

export type CartLineInput = z.infer<typeof cartLinesSchema>[number];

export type ResolvedLine = {
  key: string;
  merchId: string;
  slug: string;
  title: string;
  image: string;
  size: string;
  quantity: number;
  unitPrice: number;
  weightGrams: number;
  /** Stock encore disponible pour cette variante. */
  available: number;
  /** ok : tel quel · adjusted : quantité réduite au stock · unavailable : à retirer. */
  status: 'ok' | 'adjusted' | 'unavailable';
};

export type ResolvedCart = {
  lines: ResolvedLine[];
  subtotal: number;
  weightGrams: number;
  /** Vrai si une ligne a été ajustée ou est indisponible. */
  hasIssues: boolean;
};

/**
 * Transforme un panier envoyé par le navigateur en panier fiable : prix,
 * titre, poids et stock viennent de la base, jamais du client. Sert à
 * l'affichage du panier ET au checkout.
 */
export async function resolveCart(inputs: CartLineInput[]): Promise<ResolvedCart> {
  // Fusionne les doublons (même produit, même taille).
  const merged = new Map<string, CartLineInput>();
  for (const input of inputs) {
    const key = `${input.merchId}:${input.size}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: existing.quantity + input.quantity } : input);
  }

  await dbConnect();
  const products = await MerchModel.find({ _id: { $in: [...new Set(inputs.map((i) => i.merchId))] } }).lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const lines: ResolvedLine[] = [...merged.entries()].map(([key, input]) => {
    const product = byId.get(input.merchId);
    const variant = product
      ? variantsOf({
          sizes: product.sizes ?? [],
          stock: product.stock ?? 0,
          sizeStock: product.sizeStock ?? {},
        }).find((candidate) => candidate.size === input.size)
      : undefined;

    const base = {
      key,
      merchId: input.merchId,
      size: input.size,
      slug: product?.slug ?? '',
      title: product?.title ?? 'Article indisponible',
      image: product?.images?.[0] ?? '',
      unitPrice: product?.price ?? 0,
      weightGrams: product?.weightGrams ?? 0,
    };

    // Produit retiré, non vendu en ligne, taille inconnue ou épuisé.
    if (!product || product.sellOnline !== true || !variant || variant.quantity <= 0) {
      return { ...base, quantity: 0, available: 0, status: 'unavailable' as const };
    }

    const quantity = Math.min(input.quantity, SHOP_MAX_QTY_PER_LINE, variant.quantity);
    return {
      ...base,
      quantity,
      available: Math.min(variant.quantity, SHOP_MAX_QTY_PER_LINE),
      status: quantity === input.quantity ? ('ok' as const) : ('adjusted' as const),
    };
  });

  const valid = lines.filter((line) => line.status !== 'unavailable');

  return {
    lines,
    subtotal: round2(valid.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)),
    weightGrams: valid.reduce((sum, line) => sum + line.weightGrams * line.quantity, 0),
    hasIssues: lines.some((line) => line.status !== 'ok'),
  };
}
