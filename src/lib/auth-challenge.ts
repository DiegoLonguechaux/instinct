import { OTP_MAX_ATTEMPTS } from '@/lib/auth-config';
import { hashToken, safeEqual } from '@/lib/auth-tokens';
import dbConnect from '@/lib/db';
import LoginChallengeModel from '@/models/LoginChallenge';
import UserModel from '@/models/User';

/**
 * Vérifie le code de connexion et consomme le défi. Renvoie l'utilisateur
 * ou null (défi inconnu/expiré, trop d'essais, mauvais code).
 */
export async function verifyLoginChallenge(challengeId: string, code: string) {
  if (!challengeId || !/^\d{6}$/.test(code)) {
    return null;
  }

  await dbConnect();

  // L'essai est compté avant la comparaison, dans la même opération atomique
  // que la vérification du plafond : des requêtes parallèles ne permettent
  // pas de dépasser OTP_MAX_ATTEMPTS.
  const challenge = await LoginChallengeModel.findOneAndUpdate(
    {
      challengeHash: hashToken(challengeId, 'challenge'),
      expiresAt: { $gt: new Date() },
      attempts: { $lt: OTP_MAX_ATTEMPTS },
    },
    { $inc: { attempts: 1 } },
    { new: true }
  );

  if (!challenge || !safeEqual(challenge.codeHash, hashToken(`${challengeId}:${code}`, 'otp'))) {
    return null;
  }

  // Usage unique : si deux requêtes valides arrivent en même temps, une seule gagne.
  const consumed = await LoginChallengeModel.findOneAndDelete({ _id: challenge._id });
  if (!consumed) {
    return null;
  }

  return UserModel.findById(challenge.user);
}
