import { releaseExpiredOrders } from '@/lib/orders';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Filet de sécurité : libère le stock des paiements abandonnés dont
 * l'événement Stripe n'est jamais arrivé. À appeler toutes les 10-15 minutes
 * (cron Vercel : envoie `Authorization: Bearer $CRON_SECRET`).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret ?? ''}`;

  const authorized =
    Boolean(secret) &&
    received.length === expected.length &&
    timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  return NextResponse.json({ released: await releaseExpiredOrders(true) });
}
