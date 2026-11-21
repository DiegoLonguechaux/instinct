import dbConnect from '@/lib/db';
import { expireOrder } from '@/lib/orders';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import OrderModel from '@/models/Order';
import { NextResponse } from 'next/server';

type Context = { params: Promise<{ token: string }> };

// Réponse publique volontairement minimale : pas de données personnelles.
// Le jeton est la seule preuve d'accès (il n'est ni l'id Mongo, ni devinable).
function publicView(order: { number: string; status: string; total: number }) {
  const paid = ['paid', 'preparing', 'shipped', 'delivered'].includes(order.status);
  const failed = ['expired', 'cancelled', 'refunded'].includes(order.status);
  return { number: order.number, total: order.total, state: paid ? 'paid' : failed ? 'failed' : 'pending' };
}

export async function GET(request: Request, context: Context) {
  const limit = await rateLimit(`order-status:ip:${clientIp(request)}`, 60, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 });
  }

  const { token } = await context.params;
  await dbConnect();
  const order = await OrderModel.findOne({ publicToken: token }).select('number status total').lean();
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
  }
  return NextResponse.json(publicView(order));
}

/**
 * Le client a quitté la page de paiement Stripe : on ferme la session (elle
 * ne pourra plus être payée) et on rend le stock sans attendre l'expiration.
 */
export async function POST(request: Request, context: Context) {
  const limit = await rateLimit(`order-cancel:ip:${clientIp(request)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 });
  }

  const { token } = await context.params;
  await dbConnect();
  const order = await OrderModel.findOne({ publicToken: token });
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
  }

  if (order.status === 'pending_payment') {
    // On ferme d'abord la session côté Stripe : si elle a été payée entre-temps
    // l'appel échoue et on ne libère surtout pas le stock.
    if (isStripeConfigured() && order.payment.stripeSessionId) {
      try {
        await getStripe().checkout.sessions.expire(order.payment.stripeSessionId);
      } catch (error) {
        console.error('Stripe session expire error:', error);
        const current = await OrderModel.findById(order._id).select('number status total').lean();
        return NextResponse.json(publicView(current ?? order));
      }
    }
    await expireOrder(order._id, 'Paiement annulé par le client');
  }

  const current = await OrderModel.findById(order._id).select('number status total').lean();
  return NextResponse.json(publicView(current ?? order));
}
