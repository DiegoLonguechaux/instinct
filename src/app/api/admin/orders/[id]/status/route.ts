import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import dbConnect from '@/lib/db';
import { sendOrderShippedEmail } from '@/lib/mail/orders';
import { transitionOrder } from '@/lib/orders';
import OrderModel, { type OrderStatus } from '@/models/Order';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serializeOrder } from '../../route';

const bodySchema = z.object({
  action: z.enum(['prepare', 'ship', 'deliver']),
  // Pour "ship" : suivi saisi à la main (étiquette faite hors Boxtal).
  trackingNumber: z.string().trim().max(60).optional(),
  trackingUrl: z.string().trim().url().max(300).optional().or(z.literal('')),
});

const TRANSITIONS: Record<'prepare' | 'ship' | 'deliver', { from: OrderStatus[]; to: OrderStatus; note: string }> = {
  prepare: { from: ['paid'], to: 'preparing', note: 'Colis en préparation' },
  ship: { from: ['paid', 'preparing'], to: 'shipped', note: 'Colis remis au transporteur' },
  deliver: { from: ['shipped'], to: 'delivered', note: 'Colis livré' },
};

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
    return NextResponse.json({ error: 'Action invalide.' }, { status: 400 });
  }
  const { action, trackingNumber, trackingUrl } = parsed.data;
  const rule = TRANSITIONS[action];

  await dbConnect();

  const set: Record<string, unknown> = {};
  if (action === 'ship') {
    set['shipment.shippedAt'] = new Date();
    if (trackingNumber) set['shipment.trackingNumber'] = trackingNumber;
    if (trackingUrl) set['shipment.trackingUrl'] = trackingUrl;
  }
  if (action === 'deliver') {
    set['shipment.deliveredAt'] = new Date();
  }

  const updated = await transitionOrder(id, rule.from, rule.to, {
    note: rule.note,
    by: session.user.name || session.user.email || '',
    set,
  });

  if (!updated) {
    const exists = await OrderModel.exists({ _id: id });
    return NextResponse.json(
      { error: exists ? 'Cette action n’est pas possible pour le statut actuel de la commande.' : 'Commande introuvable' },
      { status: exists ? 409 : 404 }
    );
  }

  // Mail d'expédition envoyé une seule fois : seule l'unique requête qui a fait
  // passer la commande en "shipped" arrive ici.
  let mailWarning = '';
  if (action === 'ship') {
    try {
      await sendOrderShippedEmail(updated);
    } catch (mailError) {
      console.error('Shipped mail error:', mailError);
      mailWarning = 'Le mail d’expédition n’a pas pu être envoyé au client.';
    }
  }

  return NextResponse.json({ order: serializeOrder(updated), warning: mailWarning || undefined });
}
