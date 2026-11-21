// Moyens de paiement acceptés à la table de merch (caisse).
export const COUNTER_PAYMENT_METHODS = ['cash', 'sumup', 'paypal'] as const;
// Tous les moyens possibles pour une vente : la boutique en ligne ajoute Stripe.
export const PAYMENT_METHODS = [...COUNTER_PAYMENT_METHODS, 'stripe'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  sumup: 'SumUp',
  paypal: 'PayPal',
  stripe: 'En ligne (Stripe)',
};

// Commission prélevée par SumUp sur le montant total de la vente.
export const SUMUP_FEE_RATE = 0.0175;

// En dessous (ou égal à) ce nombre de pièces, une variante est signalée "stock bas".
export const LOW_STOCK_THRESHOLD = 3;

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeFee(method: PaymentMethod, total: number) {
  return method === 'sumup' ? round2(total * SUMUP_FEE_RATE) : 0;
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

/** Produit tel que renvoyé par GET /api/admin/merch. */
export type MerchItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  weightGrams: number;
  sellOnline: boolean;
  price: number;
  costPrice: number;
  sizes: string[];
  stock: number;
  sizeStock: Record<string, number>;
  totalStock: number;
  visible: boolean;
  images: string[];
  createdAt: string;
};

type StockFields = {
  sizes: string[];
  stock: number;
  sizeStock: Record<string, number>;
};

/** Stock total d'un produit : somme des tailles s'il en a, sinon la quantité unique. */
export function totalStock(item: StockFields) {
  if (item.sizes.length === 0) {
    return item.stock;
  }
  return item.sizes.reduce((sum, size) => sum + (item.sizeStock[size] ?? 0), 0);
}

/** Variantes vendables d'un produit : une par taille, ou une seule sans taille. */
export function variantsOf(item: StockFields) {
  if (item.sizes.length === 0) {
    return [{ size: '', quantity: item.stock }];
  }
  return item.sizes.map((size) => ({ size, quantity: item.sizeStock[size] ?? 0 }));
}
