import { requireSession } from '@/lib/api-route-helpers';
import { BCRYPT_ROUNDS, MIN_PASSWORD_LENGTH } from '@/lib/auth-config';
import dbConnect from '@/lib/db';
import { sendPasswordChangedEmail } from '@/lib/mail';
import { formatRetry, rateLimit } from '@/lib/rate-limit';
import TrustedDeviceModel from '@/models/TrustedDevice';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';
import { after, NextResponse } from 'next/server';

/**
 * Changement de mot de passe par l'utilisateur connecté. Exige l'ancien mot
 * de passe : une session ouverte oubliée sur un poste ne suffit pas à
 * prendre le contrôle du compte.
 */
export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) {
    return error;
  }

  const body = (await request.json().catch(() => null)) as
    | { currentPassword?: unknown; newPassword?: unknown }
    | null;
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  // Sans plafond, une session volée permettrait de deviner l'ancien mot de passe.
  const limit = await rateLimit(`pwchange:user:${session.user.id}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${formatRetry(limit.retryAfterSeconds)}.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
      { status: 400 }
    );
  }

  await dbConnect();
  const user = await UserModel.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json({ error: 'Le mot de passe actuel est incorrect.' }, { status: 400 });
  }

  if (await bcrypt.compare(newPassword, user.password)) {
    return NextResponse.json(
      { error: 'Le nouveau mot de passe doit être différent de l’actuel.' },
      { status: 400 }
    );
  }

  user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  // Déconnecte toutes les sessions du compte (y compris celle-ci : le client
  // se déconnecte et renvoie vers /login) et oublie les appareils de confiance.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  await TrustedDeviceModel.deleteMany({ user: user._id });

  after(async () => {
    try {
      await sendPasswordChangedEmail(user.email, user.firstName);
    } catch (mailError) {
      console.error('Password changed mail error:', mailError);
    }
  });

  return NextResponse.json({ ok: true });
}
