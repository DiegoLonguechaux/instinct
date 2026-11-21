import { requireSession } from '@/lib/api-route-helpers';
import { TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_TTL_MS } from '@/lib/auth-config';
import { generateToken, hashToken } from '@/lib/auth-tokens';
import dbConnect from '@/lib/db';
import TrustedDeviceModel from '@/models/TrustedDevice';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Appelée juste après une connexion réussie (code validé) quand la case
 * « faire confiance à cet appareil » est cochée. Exige une session valide :
 * seul quelqu'un qui vient de passer la double authentification peut
 * marquer un appareil comme fiable.
 */
export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) {
    return error;
  }

  await dbConnect();

  const cookieStore = await cookies();
  const previous = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (previous) {
    await TrustedDeviceModel.deleteOne({ tokenHash: hashToken(previous, 'device') });
  }

  const token = generateToken();
  await TrustedDeviceModel.create({
    user: session.user.id,
    tokenHash: hashToken(token, 'device'),
    userAgent: (request.headers.get('user-agent') ?? '').slice(0, 200),
    expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_MS),
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TRUSTED_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // Envoyé uniquement aux routes de connexion, jamais au reste du site.
    path: '/api/auth/login',
    maxAge: TRUSTED_DEVICE_TTL_MS / 1000,
  });
  return response;
}
