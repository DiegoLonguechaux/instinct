import dbConnect from '@/lib/db';
import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import GalleryItemModel from '@/models/GalleryItem';
import { NextResponse } from 'next/server';
import { normalizePayload, serializeItem, type GalleryPayload } from '../route';

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

  const body = (await request.json()) as GalleryPayload;
  const payload = normalizePayload(body);

  if (!payload.title || !payload.imageUrl) {
    return NextResponse.json(
      { error: 'Le titre et la photo sont obligatoires.' },
      { status: 400 }
    );
  }

  await dbConnect();
  const updated = await GalleryItemModel.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });
  }

  return NextResponse.json(serializeItem(updated));
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
  const deleted = await GalleryItemModel.findByIdAndDelete(id).lean();

  if (!deleted) {
    return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
