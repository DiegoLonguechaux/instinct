/**
 * Crée (ou met à jour) un utilisateur super-admin.
 *
 * Usage :
 *   npx tsx scripts/create-super-admin.ts --email admin@example.com --password "MotDePasse123" --firstName Diego
 *
 * Variables d'environnement équivalentes (utile en CI) :
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_FIRSTNAME
 *
 * Si un utilisateur avec cet email existe déjà, son mot de passe, son prénom
 * et son rôle sont mis à jour (utile pour réinitialiser le compte).
 */

import { config } from 'dotenv';
import path from 'node:path';

// Charge .env.local en priorité, puis .env en repli (comme Next.js).
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import UserModel from '../src/models/User';

function parseArgs() {
  const args = process.argv.slice(2);
  const values: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        values[key] = next;
        i += 1;
      }
    }
  }

  return values;
}

async function main() {
  const args = parseArgs();

  const email = (args.email ?? process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = args.password ?? process.env.SEED_ADMIN_PASSWORD ?? '';
  const firstName = (args.firstName ?? process.env.SEED_ADMIN_FIRSTNAME ?? '').trim();

  if (!email || !password || !firstName) {
    console.error(
      'Usage: npx tsx scripts/create-super-admin.ts --email <email> --password <motDePasse> --firstName <prenom>'
    );
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Le mot de passe doit contenir au moins 6 caractères.');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI est introuvable (vérifie ton fichier .env.local).');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await UserModel.findOne({ email });

  if (existing) {
    existing.firstName = firstName;
    existing.password = hashedPassword;
    existing.role = 'super-admin';
    await existing.save();
    console.log(`Utilisateur existant mis à jour en super-admin : ${email}`);
  } else {
    await UserModel.create({
      email,
      password: hashedPassword,
      firstName,
      role: 'super-admin',
    });
    console.log(`Super-admin créé : ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Erreur lors de la création du super-admin :', error);
  process.exit(1);
});
