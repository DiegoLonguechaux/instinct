import dbConnect from '@/lib/db';
import RateLimitModel from '@/models/RateLimit';

type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/**
 * Limiteur à fenêtre fixe, stocké en base (pas d'état en mémoire : les
 * instances serverless ne partagent rien). L'incrément est un seul update
 * atomique : il remet le compteur à 1 si la fenêtre est expirée, sinon +1.
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  await dbConnect();

  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const windowActive = { $gt: [{ $ifNull: ['$resetAt', new Date(0)] }, now] };

  const run = () =>
    RateLimitModel.collection.findOneAndUpdate(
      { _id: key as never },
      [
        {
          $set: {
            count: { $cond: [windowActive, { $add: ['$count', 1] }, 1] },
            resetAt: { $cond: [windowActive, '$resetAt', nextReset] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' }
    );

  let doc;
  try {
    doc = await run();
  } catch (error) {
    // Deux premières requêtes simultanées sur une même clé : l'une des deux
    // upserts échoue en doublon, on rejoue simplement l'incrément.
    if ((error as { code?: number }).code !== 11000) {
      throw error;
    }
    doc = await run();
  }

  const count = doc?.count ?? 1;
  const resetAt: Date = doc?.resetAt ?? nextReset;

  return {
    ok: count <= max,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
  };
}

/**
 * IP du client. Derrière Vercel (ou tout proxy de confiance) `x-forwarded-for`
 * est positionné par la plateforme ; en local on retombe sur "unknown".
 */
export function clientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function formatRetry(seconds: number) {
  return seconds < 90 ? `${seconds} secondes` : `${Math.ceil(seconds / 60)} minutes`;
}
