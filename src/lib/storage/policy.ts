import { randomUUID } from 'node:crypto';

export const UPLOAD_FOLDERS = [
  'group',
  'logo',
  'signature',
  'press-kit',
  'releases',
  'merch',
  'gallery',
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const MB = 1024 * 1024;

export const MAX_IMAGE_SIZE = 10 * MB;
export const MAX_PDF_SIZE = 20 * MB;
export const MAX_ZIP_SIZE = 200 * MB;

type UploadRule = { extension: string; maxSize: number };

// Pas de SVG : un SVG servi depuis le bucket peut embarquer du JavaScript (XSS).
const IMAGE_RULES: Record<string, UploadRule> = {
  'image/jpeg': { extension: 'jpg', maxSize: MAX_IMAGE_SIZE },
  'image/png': { extension: 'png', maxSize: MAX_IMAGE_SIZE },
  'image/webp': { extension: 'webp', maxSize: MAX_IMAGE_SIZE },
  'image/avif': { extension: 'avif', maxSize: MAX_IMAGE_SIZE },
};

// Le kit presse est le seul dossier qui accepte autre chose que des images.
// Certains navigateurs (surtout sur Windows) rapportent application/x-zip-compressed pour les .zip.
const PRESS_KIT_RULES: Record<string, UploadRule> = {
  'application/pdf': { extension: 'pdf', maxSize: MAX_PDF_SIZE },
  'application/zip': { extension: 'zip', maxSize: MAX_ZIP_SIZE },
  'application/x-zip-compressed': { extension: 'zip', maxSize: MAX_ZIP_SIZE },
};

export function isUploadFolder(value: unknown): value is UploadFolder {
  return typeof value === 'string' && (UPLOAD_FOLDERS as readonly string[]).includes(value);
}

/** Règle applicable à ce couple dossier / type, ou null si le type est interdit pour ce dossier. */
export function getUploadRule(folder: UploadFolder, contentType: string): UploadRule | null {
  const rules = folder === 'press-kit' ? PRESS_KIT_RULES : IMAGE_RULES;
  return rules[contentType] ?? null;
}

/**
 * Clé générée côté serveur : le nom de fichier envoyé par le client n'est
 * jamais réutilisé (pas de traversée de chemin, pas de collision).
 */
export function generateObjectKey(folder: UploadFolder, extension: string, now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `uploads/${folder}/${year}/${month}/${randomUUID()}.${extension}`;
}
