import dbConnect from '@/lib/db';
import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import MerchModel from '@/models/Merch';
import { NextResponse } from 'next/server';
import { normalizePayload, serializeMerch, validatePayload, type MerchPayload } from '../route';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  const body = (await request.json()) as MerchPayload;
  const payload = normalizePayload(body);

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await dbConnect();

  const existing = await MerchModel.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
  }

  // Le stock n'est volontairement pas modifiable ici : une fiche ouverte
  // pendant qu'une vente est enregistrée écraserait le stock à jour. Il se
  // gère via /api/admin/merch/stock. On retire seulement celui des tailles
  // supprimées pour qu'il ne réapparaisse pas si la taille est rajoutée.
  const removedSizes = (existing.sizes ?? []).filter((size) => !payload.sizes.includes(size));
  const update: Record<string, unknown> = { $set: payload };
  if (removedSizes.length > 0) {
    update.$unset = Object.fromEntries(removedSizes.map((size) => [`sizeStock.${size}`, '']));
  }

  const updated = await MerchModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
  }

  return NextResponse.json(serializeMerch(updated));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  await dbConnect();
  const deleted = await MerchModel.findByIdAndDelete(id).lean();

  if (!deleted) {
    return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
