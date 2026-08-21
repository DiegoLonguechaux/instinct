import dbConnect from '@/lib/db';
import { ensureValidObjectId, requireSuperAdmin } from '@/lib/api-route-helpers';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { normalizeRole, serializeUser, type CreateUserPayload } from '../route';

type UpdateUserPayload = CreateUserPayload;

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdmin();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  const body = (await request.json()) as UpdateUserPayload;
  const firstName = (body.firstName ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const role = normalizeRole(body.role);
  const password = body.password ?? '';

  if (!firstName || !email) {
    return NextResponse.json(
      { error: 'Prénom et email sont obligatoires.' },
      { status: 400 }
    );
  }

  if (password && password.length < 6) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
      { status: 400 }
    );
  }

  await dbConnect();

  const currentUserId = 'id' in session.user ? String(session.user.id) : '';

  // Un super-admin ne peut pas se retirer lui-même ses propres droits :
  // ça reviendrait à se verrouiller hors de /admin/users sans recours.
  if (currentUserId === id && role !== 'super-admin') {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas retirer vos propres droits super-admin.' },
      { status: 400 }
    );
  }

  // Idem pour le dernier super-admin restant, même si ce n'est pas soi-même.
  if (role !== 'super-admin') {
    const target = await UserModel.findById(id).select('role').lean<{ role: string } | null>();
    if (target?.role === 'super-admin') {
      const superAdminCount = await UserModel.countDocuments({ role: 'super-admin' });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Impossible de retirer les droits super-admin du dernier compte super-admin.' },
          { status: 400 }
        );
      }
    }
  }

  const duplicate = await UserModel.findOne({ email, _id: { $ne: id } }).lean();
  if (duplicate) {
    return NextResponse.json({ error: 'Cet email existe déjà.' }, { status: 409 });
  }

  const updatePayload: {
    firstName: string;
    email: string;
    role: string;
    password?: string;
  } = {
    firstName,
    email,
    role,
  };

  if (password) {
    updatePayload.password = await bcrypt.hash(password, 10);
  }

  const updated = await UserModel.findByIdAndUpdate(id, updatePayload, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  return NextResponse.json(serializeUser(updated));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdmin();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  const currentUserId = 'id' in session.user ? String(session.user.id) : '';
  if (currentUserId === id) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
      { status: 400 }
    );
  }

  await dbConnect();
  const deleted = await UserModel.findByIdAndDelete(id).lean();

  if (!deleted) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
