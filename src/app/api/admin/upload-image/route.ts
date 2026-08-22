import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Extension dérivée du MIME (validé juste après) plutôt que du nom de
// fichier fourni par le client, qui n'est pas fiable.
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  // Certains navigateurs (surtout sur Windows) rapportent ce MIME pour les .zip.
  'application/x-zip-compressed': '.zip',
};

// Le dossier n'a besoin d'être créé qu'une fois par démarrage du process ;
// on évite un mkdir (stat + syscall) sur chaque upload une fois qu'il existe.
let uploadDirEnsured = false;

async function ensureUploadDir(dir: string) {
  if (uploadDirEnsured) {
    return;
  }
  await mkdir(dir, { recursive: true });
  uploadDirEnsured = true;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Le fichier est envoyé en corps brut de la requête (pas en multipart
  // FormData) : `request.formData()` échoue de façon aléatoire sur les
  // fichiers un peu volumineux ("Failed to parse body as FormData.", bug
  // connu du parseur multipart de Node/undici utilisé par Next.js). Lire le
  // corps brut évite complètement ce parseur.
  const contentType = request.headers.get('content-type') ?? '';
  const extension = EXTENSION_BY_MIME_TYPE[contentType];

  if (!extension) {
    return NextResponse.json(
      { error: 'Format non supporté. Utilisez PNG, JPG/JPEG, WEBP, PDF ou ZIP.' },
      { status: 400 }
    );
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) {
    return NextResponse.json({ error: 'Le fichier est vide.' }, { status: 400 });
  }

  if (bytes.byteLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `Le fichier dépasse ${MAX_FILE_SIZE / (1024 * 1024)}MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(bytes);
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await ensureUploadDir(uploadDir);

  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  return NextResponse.json({
    url: `/uploads/${fileName}`,
  });
}
