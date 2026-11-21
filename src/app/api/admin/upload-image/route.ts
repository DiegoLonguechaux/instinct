import { requireSession } from '@/lib/api-route-helpers';
import { clientIp, formatRetry, rateLimit } from '@/lib/rate-limit';
import { getStorage, getUploadRule, UPLOAD_FOLDERS } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// Une galerie envoyée en lot déclenche une requête par photo : la marge doit
// rester large pour un usage légitime, tout en bornant un compte compromis.
const UPLOAD_RATE_LIMIT = { max: 60, windowMs: 10 * 60 * 1000 };

const bodySchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

// Le fichier ne transite pas par cette route : elle vérifie la session admin,
// valide la demande puis renvoie une URL pré-signée sur laquelle le navigateur
// fait directement son PUT vers le stockage S3.
export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) {
    return error;
  }

  // Le middleware ne protège que /admin/* : on revérifie ici le rôle côté serveur.
  const role = 'role' in session.user ? session.user.role : undefined;
  if (role !== 'admin' && role !== 'super-admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const limit = await rateLimit(
    `upload:${session.user.id ?? clientIp(request)}`,
    UPLOAD_RATE_LIMIT.max,
    UPLOAD_RATE_LIMIT.windowMs
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Trop d’envois, réessayez dans ${formatRetry(limit.retryAfterSeconds)}.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Demande d’upload invalide.' }, { status: 400 });
  }

  const { folder, contentType, size } = parsed.data;

  const rule = getUploadRule(folder, contentType);
  if (!rule) {
    return NextResponse.json({ error: 'Type de fichier non autorisé pour cet envoi.' }, { status: 400 });
  }
  if (size > rule.maxSize) {
    const maxMb = Math.round(rule.maxSize / (1024 * 1024));
    return NextResponse.json({ error: `Fichier trop lourd (maximum ${maxMb} Mo).` }, { status: 400 });
  }

  try {
    const upload = await getStorage().createUploadUrl({ folder, contentType, size });
    return NextResponse.json(upload);
  } catch (err) {
    console.error('Création de l’URL d’upload impossible', err);
    return NextResponse.json({ error: 'Stockage indisponible, réessayez plus tard.' }, { status: 500 });
  }
}
