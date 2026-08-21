import dbConnect from '@/lib/db';
import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import MerchModel from '@/models/Merch';
import { NextResponse } from 'next/server';
import { normalizePayload, serializeMerch, type MerchPayload } from '../route';

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

  if (!payload.title) {
    return NextResponse.json(
      { error: 'Le titre est obligatoire.' },
      { status: 400 }
    );
  }

  if (Number.isNaN(payload.price) || payload.price < 0) {
    return NextResponse.json(
      { error: 'Le prix doit être un nombre positif.' },
      { status: 400 }
    );
  }

  await dbConnect();
  const updated = await MerchModel.findByIdAndUpdate(id, payload, {
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
