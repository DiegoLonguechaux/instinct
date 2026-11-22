/**
 * Version des CGV (date de dernière mise à jour, AAAA-MM-JJ).
 * À CHANGER à chaque modification des CGV : elle est enregistrée dans chaque
 * commande comme preuve de la version acceptée par le client.
 */
export const CGV_VERSION = '2026-11-22';

/** « 2026-11-22 » → « 22 novembre 2026 » (valeur inconnue renvoyée telle quelle). */
export function formatCgvVersion(version: string) {
  const date = new Date(`${version}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return version;
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
