// Paramètres d'authentification centralisés (aussi importés par scripts/create-super-admin.ts,
// d'où l'absence d'alias `@/` ici).

/** Coût bcrypt des nouveaux hash. Les anciens hash (coût 10) sont ré-hashés à la connexion. */
export const BCRYPT_ROUNDS = 12;

export const MIN_PASSWORD_LENGTH = 10;

/** Durée de vie d'une session admin (JWT). */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

/** Code de connexion par mail (double authentification). */
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/** Lien de réinitialisation de mot de passe. */
export const RESET_TTL_MS = 60 * 60 * 1000;

/** Appareil de confiance : après un code valide, plus de code demandé pendant cette durée. */
export const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const TRUSTED_DEVICE_COOKIE = 'instinct_device';
