import { clientIp, rateLimit } from '@/lib/rate-limit';
import { cartLinesSchema, resolveCart } from '@/lib/shop';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({ lines: cartLinesSchema });

/** Public : renvoie le panier avec les vrais prix, titres et stocks. */
export async function POST(request: Request) {
  const limit = await rateLimit(`cart:ip:${clientIp(request)}`, 120, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Trop de requêtes, réessayez dans un instant.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Panier invalide.' }, { status: 400 });
  }

  return NextResponse.json(await resolveCart(parsed.data.lines));
}
