// Statuts de commande, sans dépendance à Mongoose (utilisables côté navigateur).
export const ORDER_STATUSES = [
  'pending_payment', // créée, stock réservé, en attente du paiement Stripe
  'paid', // payée, à préparer
  'preparing', // colis en cours de préparation
  'shipped', // remis au transporteur
  'delivered',
  'cancelled', // annulée (avec ou sans remboursement)
  'refunded',
  'expired', // paiement jamais abouti, stock libéré
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'En attente de paiement',
  paid: 'Payée, à préparer',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
  expired: 'Expirée',
};
