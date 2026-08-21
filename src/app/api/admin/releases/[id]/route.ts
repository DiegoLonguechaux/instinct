import dbConnect from '@/lib/db';
import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import ReleaseModel from '@/models/Release';
import { NextResponse } from 'next/server';
import { normalizePayload, serializeRelease, type ReleasePayload } from '../route';

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

  const body = (await request.json()) as ReleasePayload;
  const payload = normalizePayload(body);

  if (!payload.type || !payload.name) {
    return NextResponse.json(
      { error: 'Le type et le nom sont obligatoires.' },
      { status: 400 }
    );
  }

  await dbConnect();

  const updated = await ReleaseModel.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Sortie introuvable' }, { status: 404 });
  }

  return NextResponse.json(serializeRelease(updated));
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
  const deleted = await ReleaseModel.findByIdAndDelete(id).lean();

  if (!deleted) {
    return NextResponse.json({ error: 'Sortie introuvable' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
