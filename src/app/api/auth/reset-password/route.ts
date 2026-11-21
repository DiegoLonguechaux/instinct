import { BCRYPT_ROUNDS, MIN_PASSWORD_LENGTH } from '@/lib/auth-config';
import { hashToken } from '@/lib/auth-tokens';
import dbConnect from '@/lib/db';
import { sendPasswordChangedEmail } from '@/lib/mail';
import { clientIp, formatRetry, rateLimit } from '@/lib/rate-limit';
import LoginChallengeModel from '@/models/LoginChallenge';
import PasswordResetModel from '@/models/PasswordReset';
import TrustedDeviceModel from '@/models/TrustedDevice';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';
import { after, NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  const token = typeof body?.token === 'string' ? body.token : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const limit = await rateLimit(`reset:ip:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${formatRetry(limit.retryAfterSeconds)}.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  // Validé avant de toucher au jeton : un mot de passe trop court ne le "brûle" pas.
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
      { status: 400 }
    );
  }

  await dbConnect();

  // Suppression atomique : un lien ne sert qu'une seule fois, même si deux
  // requêtes arrivent en même temps.
  const reset = token
    ? await PasswordResetModel.findOneAndDelete({
        tokenHash: hashToken(token, 'reset'),
        expiresAt: { $gt: new Date() },
      })
    : null;

  if (!reset) {
    return NextResponse.json({ error: 'Ce lien est invalide ou a expiré.' }, { status: 400 });
  }

  const user = await UserModel.findByIdAndUpdate(
    reset.user,
    {
      $set: { password: await bcrypt.hash(password, BCRYPT_ROUNDS) },
      // Invalide toutes les sessions déjà ouvertes avec l'ancien mot de passe.
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  );

  if (!user) {
    return NextResponse.json({ error: 'Ce lien est invalide ou a expiré.' }, { status: 400 });
  }

  await Promise.all([
    PasswordResetModel.deleteMany({ user: user._id }),
    LoginChallengeModel.deleteMany({ user: user._id }),
    // Un nouveau mot de passe repart de zéro : tous les appareils doivent re-passer le code.
    TrustedDeviceModel.deleteMany({ user: user._id }),
  ]);

  after(async () => {
    try {
      await sendPasswordChangedEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Password changed mail error:', error);
    }
  });

  return NextResponse.json({ ok: true });
}
