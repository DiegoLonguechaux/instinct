/**
 * Numéro français (fixe ou mobile) normalisé en +33XXXXXXXXX, ou null s'il
 * est invalide. Les transporteurs préviennent le client par SMS : un numéro
 * exploitable est indispensable.
 */
export function normalizeFrenchPhone(input: string) {
  const compact = input.replace(/[\s.\-()]/g, '');
  const national = compact.replace(/^(\+33|0033)/, '0');
  return /^0[1-9]\d{8}$/.test(national) ? `+33${national.slice(1)}` : null;
}
