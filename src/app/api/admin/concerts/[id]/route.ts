import dbConnect from '@/lib/db';
import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import ConcertModel from '@/models/Concert';
import { NextResponse } from 'next/server';
import { normalizeConcert, serializeConcert, type ConcertPayload } from '../route';

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

  const body = (await request.json()) as ConcertPayload;
  const payload = normalizeConcert(body);

  if (!payload.date || !payload.venue) {
    return NextResponse.json(
      { error: 'La date et le lieu sont obligatoires.' },
      { status: 400 }
    );
  }

  await dbConnect();

  const updated = await ConcertModel.findByIdAndUpdate(
    id,
    {
      date: new Date(payload.date),
      venue: payload.venue,
      description: payload.description,
      link: payload.link,
    },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Concert introuvable' }, { status: 404 });
  }

  return NextResponse.json(serializeConcert(updated));
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
  const deleted = await ConcertModel.findByIdAndDelete(id).lean();

  if (!deleted) {
    return NextResponse.json({ error: 'Concert introuvable' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
