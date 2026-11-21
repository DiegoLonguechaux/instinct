export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

const REQUIRED_VARIABLES = [
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_BASE_URL',
] as const;

/** Lit et valide les variables S3_* ; l'erreur liste toutes les variables manquantes d'un coup. */
export function getS3Config(): S3Config {
  const missing = REQUIRED_VARIABLES.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Stockage S3 non configuré, variable(s) manquante(s) : ${missing.join(', ')}.`);
  }

  return {
    endpoint: process.env.S3_ENDPOINT!.trim(),
    region: process.env.S3_REGION!.trim(),
    bucket: process.env.S3_BUCKET!.trim(),
    accessKeyId: process.env.S3_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!.trim(),
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL!.trim().replace(/\/+$/, ''),
  };
}

export function isS3Configured() {
  return REQUIRED_VARIABLES.every((name) => Boolean(process.env[name]?.trim()));
}
