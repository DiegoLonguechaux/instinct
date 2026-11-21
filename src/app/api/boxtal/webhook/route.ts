import { getTracking } from '@/lib/boxtal';
import dbConnect from '@/lib/db';
import { transitionOrder } from '@/lib/orders';
import OrderModel from '@/models/Order';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Boxtal signe le corps brut en HMAC SHA-256 (en-tête x-bxt-signature) avec le
// secret choisi à l'abonnement. L'encodage n'étant pas documenté, on accepte
// hex, base64 et un éventuel préfixe "sha256=".
function isValidSignature(rawBody: string, header: string, secret: string) {
  const digest = createHmac('sha256', secret).update(rawBody).digest();
  const received = header.replace(/^sha256=/i, '').trim();
  const candidates = [digest.toString('hex'), digest.toString('base64')];

  return candidates.some((candidate) => {
    // Le hex est comparé sans tenir compte de la casse ; le base64 tel quel.
    const expected = Buffer.from(candidate);
    const actual = Buffer.from(candidate === candidates[0] ? received.toLowerCase() : received);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  });
}

function findShippingOrderId(payload: unknown): string {
  const read = (value: unknown): string => (typeof value === 'string' ? value : '');
  const root = (payload ?? {}) as Record<string, unknown>;
  const content = (root.content ?? root.payload ?? {}) as Record<string, unknown>;
  const order = (root.shippingOrder ?? content.shippingOrder ?? {}) as Record<string, unknown>;
  return read(root.shippingOrderId) || read(content.shippingOrderId) || read(order.id) || read(root.id);
}

/**
 * Webhook Boxtal : DOCUMENT_CREATED (étiquette prête) et TRACKING_CHANGED
 * (suivi). Répond toujours 2xx rapidement (Boxtal rejoue sinon pendant 24 h),
 * y compris pour une commande inconnue.
 */
export async function POST(request: Request) {
  const secret = process.env.BOXTAL_WEBHOOK_SECRET;
  const signature = request.headers.get('x-bxt-signature');
  const rawBody = await request.text();

  if (!secret || !signature || !isValidSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const eventType = String((payload as { eventType?: string; type?: string })?.eventType ?? (payload as { type?: string })?.type ?? '');
  const boxtalOrderId = findShippingOrderId(payload);
  if (!boxtalOrderId) {
    return NextResponse.json({ ok: true });
  }

  try {
    await dbConnect();
    const order = await OrderModel.findOne({ 'shipment.boxtalOrderId': boxtalOrderId }).select('_id status').lean();
    if (!order) {
      return NextResponse.json({ ok: true });
    }

    const set: Record<string, unknown> = {};

    // DOCUMENT_CREATED : rien à stocker, le lien du PDF est signé et redemandé à chaque clic.
    if (eventType.includes('TRACKING')) {
      const tracking = await getTracking(boxtalOrderId);
      if (tracking.trackingNumber) set['shipment.trackingNumber'] = tracking.trackingNumber;
      if (tracking.trackingUrl) set['shipment.trackingUrl'] = tracking.trackingUrl;
    }

    if (Object.keys(set).length > 0) {
      await OrderModel.updateOne({ _id: order._id }, { $set: set });
    }

    // Le format exact des statuts de suivi n'est pas vérifié : on repère le
    // statut final de façon prudente, la commande se marque aussi livrée à la main.
    if (eventType.includes('TRACKING') && /"DELIVERED"/.test(rawBody)) {
      await transitionOrder(order._id, ['shipped'], 'delivered', {
        note: 'Livraison confirmée par le transporteur',
        by: 'boxtal',
        set: { 'shipment.deliveredAt': new Date() },
      });
    }
  } catch (error) {
    console.error('Boxtal webhook error:', error);
    // 2xx quand même : une panne de lecture Boxtal ne doit pas déclencher 10 rejeux inutiles.
  }

  return NextResponse.json({ ok: true });
}
