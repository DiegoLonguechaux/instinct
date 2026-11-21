import { BCRYPT_ROUNDS } from '@/lib/auth-config';
import dbConnect from '@/lib/db';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';

// Hash factice (coût 12) comparé quand l'email est inconnu : la réponse met
// le même temps que pour un vrai compte, ce qui empêche de deviner par le
// chronomètre quels emails existent.
const DUMMY_HASH = '$2b$12$LHp1tK6bRS34KkCKw9vPyuZ//lzJjPJTEoxm8FUw6Pixu1Vzhj3xu';

/** Vérifie email + mot de passe. Renvoie l'utilisateur ou null (sans dire lequel des deux est faux). */
export async function verifyPassword(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();

  await dbConnect();
  const user = await UserModel.findOne({ email });

  const isValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !isValid) {
    return null;
  }

  // Mise à niveau transparente des anciens hash (coût 10) vers le coût actuel.
  if (bcrypt.getRounds(user.password) < BCRYPT_ROUNDS) {
    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await user.save();
  }

  return user;
}
