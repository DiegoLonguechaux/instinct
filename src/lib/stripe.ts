import Stripe from 'stripe';

let client: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY est requis pour les paiements en ligne.');
    }
    client = new Stripe(key);
  }
  return client;
}

/** Montant en centimes (Stripe n'accepte que des entiers). */
export function toCents(amount: number) {
  return Math.round(amount * 100);
}
