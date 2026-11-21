import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import dbConnect from '@/lib/db';
import OrderModel from '@/models/Order';
import { NextResponse } from 'next/server';
import { serializeOrder } from '../route';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
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
  const order = await OrderModel.findById(id).lean();
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }
  return NextResponse.json(serializeOrder(order));
}

/** Seule la note interne est modifiable directement ; les statuts passent par /status. */
export async function PATCH(request: Request, context: Context) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  const body = (await request.json().catch(() => null)) as { internalNote?: unknown } | null;
  const internalNote = typeof body?.internalNote === 'string' ? body.internalNote.trim().slice(0, 2000) : null;
  if (internalNote === null) {
    return NextResponse.json({ error: 'Note invalide.' }, { status: 400 });
  }

  await dbConnect();
  const order = await OrderModel.findByIdAndUpdate(id, { $set: { internalNote } }, { new: true }).lean();
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }
  return NextResponse.json(serializeOrder(order));
}
