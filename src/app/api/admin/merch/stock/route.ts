import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import MerchModel from '@/models/Merch';
import StockMovementModel from '@/models/StockMovement';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { serializeMerch } from '../route';
import { stockField } from '../sales/route';

type StockPayload = {
  merchId?: string;
  size?: string;
  // add : réassort (+quantité). set : correction d'inventaire (nouveau total).
  mode?: 'add' | 'set';
  quantity?: number;
  reason?: string;
};

function serializeMovement(movement: {
  _id: { toString: () => string };
  merchTitle: string;
  size: string;
  delta: number;
  resultingQuantity: number;
  type: 'restock' | 'adjustment';
  reason?: string;
  createdBy?: string;
  createdAt?: Date;
}) {
  return {
    id: movement._id.toString(),
    merchTitle: movement.merchTitle,
    size: movement.size,
    delta: movement.delta,
    resultingQuantity: movement.resultingQuantity,
    type: movement.type,
    reason: movement.reason ?? '',
    createdBy: movement.createdBy ?? '',
    createdAt: movement.createdAt ? movement.createdAt.toISOString() : '',
  };
}

export async function GET() {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  await dbConnect();
  const movements = await StockMovementModel.find({}).sort({ createdAt: -1 }).limit(50).lean();

  return NextResponse.json(movements.map((movement) => serializeMovement(movement)));
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) {
    return error;
  }

  const body = (await request.json()) as StockPayload;
  const quantity = Number(body.quantity);
  const size = (body.size ?? '').trim();

  if (body.mode !== 'add' && body.mode !== 'set') {
    return NextResponse.json({ error: 'Mode invalide.' }, { status: 400 });
  }
  if (!body.merchId || !mongoose.Types.ObjectId.isValid(body.merchId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < (body.mode === 'add' ? 1 : 0)) {
    return NextResponse.json(
      { error: body.mode === 'add' ? 'La quantité doit être un entier positif.' : 'Le stock doit être un entier positif ou nul.' },
      { status: 400 }
    );
  }

  await dbConnect();

  const product = await MerchModel.findById(body.merchId).lean();
  if (!product) {
    return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
  }

  const hasSizes = (product.sizes ?? []).length > 0;
  if (hasSizes ? !product.sizes.includes(size) : size !== '') {
    return NextResponse.json({ error: 'Taille invalide.' }, { status: 400 });
  }

  const field = stockField(size);
  const readQuantity = (doc: typeof product | null) =>
    (size ? doc?.sizeStock?.[size] : doc?.stock) ?? 0;

  let delta: number;
  let resultingQuantity: number;
  let updated: typeof product | null;

  if (body.mode === 'add') {
    updated = await MerchModel.findByIdAndUpdate(
      body.merchId,
      { $inc: { [field]: quantity } },
      { new: true }
    ).lean();
    delta = quantity;
    resultingQuantity = readQuantity(updated);
  } else {
    // On récupère l'ancienne valeur au moment exact de l'écriture pour que
    // le delta journalisé soit juste même si une vente vient d'avoir lieu.
    const before = await MerchModel.findByIdAndUpdate(
      body.merchId,
      { $set: { [field]: quantity } },
      { new: false }
    ).lean();
    delta = quantity - readQuantity(before);
    resultingQuantity = quantity;
    updated = await MerchModel.findById(body.merchId).lean();
  }

  if (!updated) {
    return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
  }

  if (delta !== 0) {
    await StockMovementModel.create({
      merch: product._id,
      merchTitle: product.title,
      size,
      delta,
      resultingQuantity,
      type: body.mode === 'add' ? 'restock' : 'adjustment',
      reason: (body.reason ?? '').trim(),
      createdBy: session.user.name || session.user.email || '',
    });
  }

  return NextResponse.json(serializeMerch(updated));
}
