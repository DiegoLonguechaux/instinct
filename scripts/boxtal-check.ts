/**
 * Vérifie le branchement Boxtal avec vos clés API v3 (idéalement en sandbox).
 *
 * Usage :
 *   npm run boxtal:check                      # points relais autour de Paris
 *   npm run boxtal:check -- 69001 Lyon        # autre code postal / ville
 *
 * Le client src/lib/boxtal.ts a été écrit d'après la documentation publique,
 * sans pouvoir être testé contre le vrai sandbox : ce script sert à confirmer
 * (ou à corriger) les chemins et les formes de réponse avant d'ouvrir la boutique.
 * Il ne crée AUCUNE commande d'expédition.
 */

import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

import { getShipperConfig, isBoxtalConfigured, searchRelayPoints } from '../src/lib/boxtal';

async function main() {
  const [postalCode = '75001', city = 'Paris'] = process.argv.slice(2);

  if (!isBoxtalConfigured()) {
    console.error('BOXTAL_ACCESS_KEY / BOXTAL_SECRET_KEY manquants dans .env.local.');
    process.exit(1);
  }
  console.log(`Environnement : ${process.env.BOXTAL_ENV === 'production' ? 'PRODUCTION' : 'sandbox'}`);

  try {
    const shipper = getShipperConfig();
    console.log(`✓ Adresse d'expédition : ${shipper.street}, ${shipper.postalCode} ${shipper.city}`);
  } catch (error) {
    console.warn(`⚠ ${error instanceof Error ? error.message : error}`);
  }

  const networks = (process.env.BOXTAL_CHECK_NETWORKS ?? 'MONR').split(',').map((n) => n.trim());
  const points = await searchRelayPoints({ networks, postalCode, city });

  if (points.length === 0) {
    console.warn(`⚠ Aucun point relais renvoyé pour ${postalCode} ${city} (réseaux : ${networks.join(', ')}).`);
    return;
  }

  console.log(`✓ ${points.length} point(s) relais pour ${postalCode} ${city} :`);
  for (const point of points.slice(0, 5)) {
    console.log(`  - [${point.network}] ${point.code} · ${point.name} · ${point.street}, ${point.postalCode} ${point.city}`);
  }
}

main().catch((error) => {
  console.error('✗ Échec :', error instanceof Error ? error.message : error);
  process.exit(1);
});
