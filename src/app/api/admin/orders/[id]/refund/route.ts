import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import { cancelShippingOrder, isBoxtalConfigured } from '@/lib/boxtal';
import dbConnect from '@/lib/db';
import { sendOrderCancelledEmail } from '@/lib/mail/orders';
import { transitionOrder } from '@/lib/orders';
import { restoreStock } from '@/lib/stock';
import { getStripe } from '@/lib/stripe';
import OrderModel from '@/models/Order';
import SaleModel from '@/models/Sale';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serializeOrder } from '../../route';

const bodySchema = z.object({ restock: z.boolean().default(false) });

/** Annule une commande payée : remboursement Stripe intégral, vente retirée des stats, stock remis si demandé. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  await dbConnect();
  const order = await OrderModel.findById(id);
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }
  if (!['paid', 'preparing', 'shipped', 'delivered'].includes(order.status)) {
    return NextResponse.json({ error: 'Cette commande ne peut pas être remboursée.' }, { status: 409 });
  }
  if (!order.payment.stripePaymentIntentId) {
    return NextResponse.json(
      { error: 'Aucun paiement Stripe associé : remboursez-la directement depuis le dashboard Stripe.' },
      { status: 422 }
    );
  }

  // Le remboursement passe en premier, avec une clé d'idempotence : si la suite
  // échoue et que vous réessayez, Stripe ne rembourse pas deux fois.
  try {
    await getStripe().refunds.create(
      { payment_intent: order.payment.stripePaymentIntentId },
      { idempotencyKey: `refund-${id}` }
    );
  } catch (refundError) {
    const alreadyRefunded =
      (refundError as { code?: string }).code === 'charge_already_refunded';
    if (!alreadyRefunded) {
      console.error('Stripe refund error:', refundError);
      return NextResponse.json({ error: 'Le remboursement Stripe a échoué. Rien n’a été modifié.' }, { status: 502 });
    }
  }

  const refunded = await transitionOrder(id, ['paid', 'preparing', 'shipped', 'delivered'], 'refunded', {
    note: parsed.data.restock ? 'Remboursée, articles remis en stock' : 'Remboursée',
    by: session.user.name || session.user.email || '',
    set: { 'payment.refundedAt': new Date() },
  });

  // Seule la requête qui a réellement changé le statut fait les effets de bord.
  if (refunded) {
    await SaleModel.updateMany({ order: refunded._id, status: 'completed' }, { status: 'cancelled', cancelledAt: new Date() });

    if (parsed.data.restock) {
      await restoreStock(refunded.items.map((item) => ({ merch: item.merch, size: item.size, quantity: item.quantity })));
    }

    // Étiquette déjà commandée mais colis pas encore parti : on l'annule (remboursée par Boxtal avant dépôt).
    const boxtalId = refunded.shipment.boxtalOrderId;
    if (boxtalId && boxtalId !== 'pending' && refunded.shipment.shippedAt === undefined && isBoxtalConfigured()) {
      await cancelShippingOrder(boxtalId).catch((cancelError) =>
        console.error('Boxtal cancel error:', cancelError)
      );
    }

    await sendOrderCancelledEmail(refunded, true).catch((mailError) =>
      console.error('Refund mail error:', mailError)
    );
  }

  const current = await OrderModel.findById(id).lean();
  return NextResponse.json({ order: current ? serializeOrder(current) : null });
}
