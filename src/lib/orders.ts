import dbConnect from '@/lib/db';
import { sendNewOrderAdminEmail, sendOrderConfirmationEmail } from '@/lib/mail/orders';
import { restoreStock, reserveStock, type StockLine } from '@/lib/stock';
import { nextSequence } from '@/models/Counter';
import OrderModel, { type IOrder, type OrderStatus } from '@/models/Order';
import SaleModel from '@/models/Sale';

/** Numéro lisible et continu par année : INS-2026-0001. */
export async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`order-${year}`);
  return `INS-${year}-${String(seq).padStart(4, '0')}`;
}

const stockLinesOf = (order: Pick<IOrder, 'items'>): StockLine[] =>
  order.items.map((item) => ({ merch: item.merch, size: item.size, quantity: item.quantity }));

/**
 * Change le statut d'une commande de façon atomique : la mise à jour n'a lieu
 * que si la commande est encore dans l'un des statuts `from`. Renvoie la
 * commande mise à jour, ou null si quelqu'un l'a déjà changée (rejeu de
 * webhook, double clic...). Toute opération à effet de bord (remise en stock,
 * remboursement, mail) ne doit se faire que si le résultat n'est pas null.
 */
export async function transitionOrder(
  id: unknown,
  from: OrderStatus[],
  to: OrderStatus,
  options: { note?: string; by?: string; set?: Record<string, unknown> } = {}
) {
  await dbConnect();
  return OrderModel.findOneAndUpdate(
    { _id: id, status: { $in: from } },
    {
      $set: { status: to, ...options.set },
      $push: { statusHistory: { status: to, at: new Date(), note: options.note ?? '', by: options.by ?? '' } },
    },
    { new: true }
  );
}

/** Paiement abandonné ou expiré : la commande est fermée et le stock réservé est rendu. */
export async function expireOrder(id: unknown, note = 'Paiement non abouti') {
  const order = await transitionOrder(id, ['pending_payment'], 'expired', { note, by: 'système' });
  if (order) {
    await restoreStock(stockLinesOf(order));
  }
  return order;
}

let lastSweep = 0;

/**
 * Libère le stock des commandes dont la réservation a expiré sans paiement.
 * Filet de sécurité si l'événement `checkout.session.expired` de Stripe n'est
 * jamais arrivé ; limité à un passage par minute et par instance.
 */
export async function releaseExpiredOrders(force = false) {
  if (!force && Date.now() - lastSweep < 60_000) {
    return 0;
  }
  lastSweep = Date.now();

  await dbConnect();
  const stale = await OrderModel.find({ status: 'pending_payment', reservedUntil: { $lt: new Date() } })
    .select('_id')
    .limit(50)
    .lean();

  let released = 0;
  for (const order of stale) {
    if (await expireOrder(order._id, 'Réservation expirée')) {
      released += 1;
    }
  }
  return released;
}

type PaymentDetails = {
  sessionId: string;
  paymentIntentId: string;
  fee: number;
  legal: { termsAccepted: boolean; termsAcceptedAt: Date; cgvVersion?: string };
};

/**
 * Appelée par le webhook Stripe quand le paiement est confirmé. Idempotente :
 * un rejeu du même événement ne refait ni la vente, ni les mails.
 * `refundNeeded` signale un paiement arrivé après expiration de la réservation
 * alors que le stock a été revendu entre-temps : il faut rembourser.
 */
export async function markOrderPaid(orderId: unknown, payment: PaymentDetails) {
  await dbConnect();

  const paidFields = {
    'payment.stripeSessionId': payment.sessionId,
    'payment.stripePaymentIntentId': payment.paymentIntentId,
    'payment.stripeFee': payment.fee,
    'payment.paidAt': new Date(),
    'legal.termsAccepted': payment.legal.termsAccepted,
    'legal.termsAcceptedAt': payment.legal.termsAcceptedAt,
    ...(payment.legal.cgvVersion ? { 'legal.cgvVersion': payment.legal.cgvVersion } : {}),
  };

  let order = await transitionOrder(orderId, ['pending_payment'], 'paid', {
    note: 'Paiement reçu',
    by: 'stripe',
    set: paidFields,
  });

  if (!order) {
    // Paiement tardif : la réservation avait expiré (stock rendu). On tente de
    // reprendre le stock ; si c'est impossible, le client doit être remboursé.
    const expired = await OrderModel.findOne({ _id: orderId, status: 'expired' });
    if (!expired) {
      return { order: null, refundNeeded: false };
    }

    const reserved = await reserveStock(stockLinesOf(expired));
    if (!reserved.ok) {
      return { order: expired, refundNeeded: true };
    }

    order = await transitionOrder(orderId, ['expired'], 'paid', {
      note: 'Paiement reçu après expiration de la réservation (stock repris)',
      by: 'stripe',
      set: paidFields,
    });
    if (!order) {
      await restoreStock(stockLinesOf(expired));
      return { order: null, refundNeeded: false };
    }
  }

  // Une vente "en ligne" alimente les statistiques. `clientId` unique : un
  // rejeu ne peut pas créer une deuxième vente. Le stock est déjà décrémenté
  // (réservation), on ne le touche donc pas ici. Les frais de port ne sont pas du CA merch.
  try {
    await SaleModel.create({
      items: order.items.map((item) => ({
        merch: item.merch,
        title: item.title,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
      })),
      total: order.subtotal,
      fee: payment.fee,
      paymentMethod: 'stripe',
      concertLabel: 'En ligne',
      createdBy: 'Boutique en ligne',
      source: 'online',
      order: order._id,
      clientId: `order-${order._id.toString()}`,
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) {
      throw error;
    }
  }

  return { order, refundNeeded: false };
}

/**
 * Envoie les mails d'une commande payée, une seule fois : `notifiedAt` est
 * posé avant l'envoi (atomique). Si l'alerte à l'équipe échoue, on le retire
 * et on relance l'erreur pour que Stripe rejoue le webhook.
 */
export async function notifyPaidOrder(order: IOrder) {
  const claimed = await OrderModel.findOneAndUpdate(
    { _id: order._id, notifiedAt: { $exists: false } },
    { $set: { notifiedAt: new Date() } },
    { new: true }
  );
  if (!claimed) {
    return;
  }

  const [admin, customer] = await Promise.allSettled([
    sendNewOrderAdminEmail(claimed),
    sendOrderConfirmationEmail(claimed),
  ]);

  if (customer.status === 'rejected') {
    console.error('Order confirmation mail error:', customer.reason);
  }
  if (admin.status === 'rejected') {
    await OrderModel.updateOne({ _id: claimed._id }, { $unset: { notifiedAt: '' } });
    throw admin.reason;
  }
}
