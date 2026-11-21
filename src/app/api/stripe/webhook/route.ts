import dbConnect from '@/lib/db';
import { expireOrder, markOrderPaid, notifyPaidOrder, transitionOrder } from '@/lib/orders';
import { sendOrderCancelledEmail } from '@/lib/mail/orders';
import { getStripe } from '@/lib/stripe';
import OrderModel from '@/models/Order';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

/** Frais réellement prélevés par Stripe (en euros), 0 si indisponibles : n'empêche jamais d'enregistrer la commande. */
async function fetchStripeFee(paymentIntentId: string) {
  try {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });
    const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    const transaction =
      charge && typeof charge.balance_transaction === 'object' ? charge.balance_transaction : null;
    return transaction ? transaction.fee / 100 : 0;
  } catch (error) {
    console.error('Stripe fee lookup error:', error);
    return 0;
  }
}

function orderIdOf(session: Stripe.Checkout.Session) {
  const id = session.metadata?.orderId ?? session.client_reference_id ?? '';
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

async function handlePaid(session: Stripe.Checkout.Session) {
  const orderId = orderIdOf(session);
  if (!orderId || session.payment_status !== 'paid') {
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? '');
  const fee = paymentIntentId ? await fetchStripeFee(paymentIntentId) : 0;

  const { order, refundNeeded } = await markOrderPaid(orderId, { sessionId: session.id, paymentIntentId, fee });

  if (refundNeeded && order) {
    // Paiement arrivé après expiration, stock revendu entre-temps : on rembourse.
    if (paymentIntentId) {
      await getStripe().refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `refund-late-${orderId}` });
    }
    const cancelled = await transitionOrder(orderId, ['expired'], 'refunded', {
      note: 'Paiement tardif, article épuisé entre-temps : remboursé automatiquement',
      by: 'système',
    });
    if (cancelled) {
      await sendOrderCancelledEmail(cancelled, true).catch((error) =>
        console.error('Late payment refund mail error:', error)
      );
    }
    return;
  }

  if (order) {
    await notifyPaidOrder(order);
  }
}

async function handleExpired(session: Stripe.Checkout.Session) {
  const orderId = orderIdOf(session);
  if (orderId) {
    await expireOrder(orderId, 'Session de paiement expirée');
  }
}

/** Remboursement fait directement depuis le dashboard Stripe : on aligne la commande et les stats. */
async function handleRefunded(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId || charge.amount_refunded < charge.amount) {
    return; // Remboursement partiel : à traiter à la main.
  }

  await dbConnect();
  const order = await OrderModel.findOne({ 'payment.stripePaymentIntentId': paymentIntentId }).select('_id');
  if (!order) {
    return;
  }

  const refunded = await transitionOrder(order._id, ['paid', 'preparing', 'shipped', 'delivered'], 'refunded', {
    note: 'Remboursée depuis Stripe (le stock n’a pas été remis automatiquement)',
    by: 'stripe',
    set: { 'payment.refundedAt': new Date() },
  });
  if (refunded) {
    await SaleModel.updateOne({ order: order._id, status: 'completed' }, { status: 'cancelled', cancelledAt: new Date() });
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) {
    return NextResponse.json({ error: 'Webhook non configuré.' }, { status: 400 });
  }

  // Le corps brut est indispensable : la signature porte sur les octets exacts reçus.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await handlePaid(event.data.object);
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await handleExpired(event.data.object);
        break;
      case 'charge.refunded':
        await handleRefunded(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    // 500 : Stripe rejoue l'événement (les handlers sont idempotents).
    console.error(`Stripe webhook ${event.type} error:`, error);
    return NextResponse.json({ error: 'Erreur de traitement.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
