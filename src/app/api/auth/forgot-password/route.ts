import { RESET_TTL_MS } from '@/lib/auth-config';
import { generateToken, hashToken } from '@/lib/auth-tokens';
import dbConnect from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/mail';
import { clientIp, formatRetry, rateLimit } from '@/lib/rate-limit';
import PasswordResetModel from '@/models/PasswordReset';
import UserModel from '@/models/User';
import { after, NextResponse } from 'next/server';

const WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email) {
    return NextResponse.json({ error: 'Email requis.' }, { status: 400 });
  }

  // Les compteurs s'appliquent que le compte existe ou non : la limite ne
  // révèle donc rien sur les emails enregistrés.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`forgot:ip:${clientIp(request)}`, 5, WINDOW_MS),
    rateLimit(`forgot:email:${email}`, 3, WINDOW_MS),
  ]);
  const blocked = [byIp, byEmail].find((result) => !result.ok);
  if (blocked) {
    return NextResponse.json(
      { error: `Trop de demandes. Réessayez dans ${formatRetry(blocked.retryAfterSeconds)}.` },
      { status: 429, headers: { 'Retry-After': String(blocked.retryAfterSeconds) } }
    );
  }

  // Le travail réel (recherche du compte, envoi du mail) se fait après la
  // réponse : elle est identique et aussi rapide que l'email existe ou non.
  after(async () => {
    try {
      await dbConnect();
      const user = await UserModel.findOne({ email });
      if (!user) {
        return;
      }

      await PasswordResetModel.deleteMany({ user: user._id });
      const token = generateToken();
      await PasswordResetModel.create({
        user: user._id,
        tokenHash: hashToken(token, 'reset'),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      });

      await sendPasswordResetEmail(user.email, user.firstName, token);
    } catch (error) {
      console.error('Forgot password error:', error);
    }
  });

  return NextResponse.json({ ok: true });
}
