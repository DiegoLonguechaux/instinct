import { OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, TRUSTED_DEVICE_COOKIE } from '@/lib/auth-config';
import { verifyPassword } from '@/lib/auth-password';
import { generateOtp, generateToken, hashToken } from '@/lib/auth-tokens';
import dbConnect from '@/lib/db';
import { sendLoginCodeEmail } from '@/lib/mail';
import { clientIp, formatRetry, rateLimit } from '@/lib/rate-limit';
import LoginChallengeModel from '@/models/LoginChallenge';
import TrustedDeviceModel from '@/models/TrustedDevice';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const WINDOW_MS = 15 * 60 * 1000;

/**
 * Étape 1 de la connexion : vérifie email + mot de passe, puis envoie un
 * code à 6 chiffres par mail. La session n'est créée qu'à l'étape 2
 * (signIn NextAuth avec le code), jamais avec le seul mot de passe.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 });
  }

  // Deux plafonds : par IP (balayage de comptes) et par email (attaque ciblée).
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:ip:${clientIp(request)}`, 20, WINDOW_MS),
    rateLimit(`login:email:${email}`, 8, WINDOW_MS),
  ]);
  const blocked = [byIp, byEmail].find((result) => !result.ok);
  if (blocked) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${formatRetry(blocked.retryAfterSeconds)}.` },
      { status: 429, headers: { 'Retry-After': String(blocked.retryAfterSeconds) } }
    );
  }

  const user = await verifyPassword(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
  }

  // Appareil de confiance : le mot de passe vient d'être vérifié, et le
  // cookie (jamais suffisant seul) prouve qu'un code a déjà été validé ici
  // pour CE compte. On saute alors l'envoi du code par mail.
  const deviceToken = (await cookies()).get(TRUSTED_DEVICE_COOKIE)?.value;
  const isTrustedDevice = deviceToken
    ? Boolean(
        await TrustedDeviceModel.findOneAndUpdate(
          { tokenHash: hashToken(deviceToken, 'device'), user: user._id, expiresAt: { $gt: new Date() } },
          { lastUsedAt: new Date() }
        )
      )
    : false;

  // Évite qu'un script fasse partir des centaines de mails vers la boîte d'un utilisateur.
  const recent = isTrustedDevice
    ? null
    : await LoginChallengeModel.findOne({
        user: user._id,
        createdAt: { $gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
      }).lean();
  if (recent) {
    const retry = Math.ceil((recent.createdAt.getTime() + OTP_RESEND_COOLDOWN_MS - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Un code vient d’être envoyé. Patientez ${formatRetry(retry)} avant d’en demander un autre.` },
      { status: 429, headers: { 'Retry-After': String(retry) } }
    );
  }

  await dbConnect();
  // Un seul code valide à la fois par utilisateur.
  await LoginChallengeModel.deleteMany({ user: user._id });

  const challengeId = generateToken();
  const code = generateOtp();
  const challenge = await LoginChallengeModel.create({
    user: user._id,
    challengeHash: hashToken(challengeId, 'challenge'),
    codeHash: hashToken(`${challengeId}:${code}`, 'otp'),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  if (isTrustedDevice) {
    // Le navigateur rejoue ce code tout de suite via signIn : même chemin de
    // validation (usage unique, limite d'essais) que pour un code reçu par mail.
    return NextResponse.json({ challengeId, code, trusted: true });
  }

  try {
    await sendLoginCodeEmail(user.email, user.firstName, code);
  } catch (error) {
    console.error('Login code mail error:', error);
    await challenge.deleteOne();
    return NextResponse.json(
      { error: 'Impossible d’envoyer le code par mail. Réessayez dans un instant.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ challengeId });
}
