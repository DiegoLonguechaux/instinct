import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession, Session } from 'next-auth';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

type AuthResult =
  | { session: Session; error: null }
  | { session: null; error: NextResponse };

/**
 * Vérifie qu'une session est présente. À utiliser en première ligne de
 * chaque handler de route admin :
 *   const { session, error } = await requireSession();
 *   if (error) return error;
 */
export async function requireSession(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }),
    };
  }

  return { session, error: null };
}

/**
 * Vérifie qu'une session super-admin est présente.
 */
export async function requireSuperAdmin(): Promise<AuthResult> {
  const { session, error } = await requireSession();
  if (error) {
    return { session: null, error };
  }

  const role = 'role' in session.user ? (session.user.role as string) : '';
  if (role !== 'super-admin') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Non autorisé' }, { status: 403 }),
    };
  }

  return { session, error: null };
}

/**
 * Valide un id de route dynamique ([id]/route.ts). Renvoie une NextResponse
 * 400 si l'id n'est pas un ObjectId Mongo valide, null sinon.
 */
export function ensureValidObjectId(id: string): NextResponse | null {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }
  return null;
}
