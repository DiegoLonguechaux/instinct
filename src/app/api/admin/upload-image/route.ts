import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 25MB était trop juste pour un kit press (zip contenant photos HD + logos +
// bio) : l'upload semblait interminable puis échouait avec un 403 renvoyé
// par Vercel Blob une fois le fichier entièrement transféré (la limite est
// vérifiée côté serveur Vercel, pas avant l'envoi).
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/zip',
  // Certains navigateurs (surtout sur Windows) rapportent ce MIME pour les .zip.
  'application/x-zip-compressed',
];

// Le fichier ne transite plus par cette route : le navigateur uploade
// directement vers Vercel Blob (nécessaire pour dépasser la limite de
// taille de requête des fonctions serverless Vercel, ~4.5MB, qui bloquerait
// par exemple un zip de kit press). Cette route se contente de générer un
// jeton d'upload après avoir vérifié la session admin.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
          throw new Error('Non autorisé');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload impossible' },
      { status: 400 }
    );
  }
}
