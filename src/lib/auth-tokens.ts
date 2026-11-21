import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error('NEXTAUTH_SECRET est requis.');
  }
  return value;
}

/** Empreinte HMAC : une fuite de la base ne permet pas de retrouver codes ni jetons. */
export function hashToken(value: string, purpose: 'challenge' | 'otp' | 'reset' | 'device') {
  return createHmac('sha256', secret()).update(`${purpose}:${value}`).digest('hex');
}

export function generateToken() {
  return randomBytes(32).toString('base64url');
}

/** Code à 6 chiffres tiré avec un générateur cryptographique. */
export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function safeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}
