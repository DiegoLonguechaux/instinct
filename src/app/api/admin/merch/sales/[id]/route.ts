import dbConnect from '@/lib/db';
import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import MerchModel from '@/models/Merch';
import SaleModel from '@/models/Sale';
import { NextResponse } from 'next/server';
import { serializeSale, stockField } from '../route';

/**
 * Annule une vente : elle reste en base (statut `cancelled`, exclue des
 * stats) et le stock des articles est remis.
 */
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

  // Le filtre sur `status` rend l'annulation atomique : un double clic ne
  // remet pas le stock deux fois.
  const cancelled = await SaleModel.findOneAndUpdate(
    { _id: id, status: 'completed' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  ).lean();

  if (!cancelled) {
    return NextResponse.json({ error: 'Vente introuvable ou déjà annulée.' }, { status: 404 });
  }

  await Promise.all(
    cancelled.items.map((item) =>
      MerchModel.updateOne({ _id: item.merch }, { $inc: { [stockField(item.size)]: item.quantity } })
    )
  );

  return NextResponse.json(serializeSale(cancelled));
}
