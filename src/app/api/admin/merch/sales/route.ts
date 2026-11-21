import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import { computeFee, COUNTER_PAYMENT_METHODS, round2, type PaymentMethod } from '@/lib/merch';
import { stockField } from '@/lib/stock';
import ConcertModel from '@/models/Concert';
import MerchModel from '@/models/Merch';
import SaleModel, { type ISaleItem } from '@/models/Sale';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

type SaleItemInput = {
  merchId?: string;
  size?: string;
  quantity?: number;
  unitPrice?: number;
};

type SalePayload = {
  clientId?: string;
  paymentMethod?: string;
  concertId?: string;
  items?: SaleItemInput[];
};

export function serializeSale(sale: {
  _id: { toString: () => string };
  items: ISaleItem[];
  total: number;
  fee: number;
  paymentMethod: PaymentMethod;
  concertLabel?: string;
  status: 'completed' | 'cancelled';
  createdBy?: string;
  createdAt?: Date;
}) {
  return {
    id: sale._id.toString(),
    items: sale.items.map((item) => ({
      merchId: item.merch.toString(),
      title: item.title,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    total: sale.total,
    fee: sale.fee,
    net: round2(sale.total - sale.fee),
    paymentMethod: sale.paymentMethod,
    concertLabel: sale.concertLabel ?? '',
    status: sale.status,
    createdBy: sale.createdBy ?? '',
    createdAt: sale.createdAt ? sale.createdAt.toISOString() : '',
  };
}

// Réexporté : les routes voisines importent encore stockField depuis ici.
export { stockField };

export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const limitParam = Number(new URL(request.url).searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 20;

  await dbConnect();
  const sales = await SaleModel.find({ source: { $ne: 'online' } }).sort({ createdAt: -1 }).limit(limit).lean();

  return NextResponse.json(sales.map((sale) => serializeSale(sale)));
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) {
    return error;
  }

  const body = (await request.json()) as SalePayload;

  const paymentMethod = body.paymentMethod as PaymentMethod;
  if (!COUNTER_PAYMENT_METHODS.includes(paymentMethod as never)) {
    return NextResponse.json({ error: 'Moyen de paiement invalide.' }, { status: 400 });
  }

  const inputs = Array.isArray(body.items) ? body.items : [];
  if (inputs.length === 0) {
    return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 });
  }

  await dbConnect();

  // Rejouer la même requête (double tap, réseau capricieux) ne doit pas
  // enregistrer la vente deux fois.
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
  if (clientId) {
    const duplicate = await SaleModel.findOne({ clientId }).lean();
    if (duplicate) {
      return NextResponse.json(serializeSale(duplicate));
    }
  }

  const merchIds = inputs.map((input) => String(input.merchId ?? ''));
  if (merchIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return NextResponse.json({ error: 'Article invalide.' }, { status: 400 });
  }

  const products = await MerchModel.find({ _id: { $in: merchIds } }).lean();
  const productsById = new Map(products.map((product) => [String(product._id), product]));

  const lines: ISaleItem[] = [];
  for (const input of inputs) {
    const product = productsById.get(String(input.merchId));
    const quantity = Number(input.quantity);
    const unitPrice = Number(input.unitPrice);
    const size = (input.size ?? '').trim();

    if (!product) {
      return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json({ error: 'Quantité invalide.' }, { status: 400 });
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: 'Prix invalide.' }, { status: 400 });
    }

    const hasSizes = (product.sizes ?? []).length > 0;
    if (hasSizes ? !product.sizes.includes(size) : size !== '') {
      return NextResponse.json(
        { error: `Taille invalide pour « ${product.title} ».` },
        { status: 400 }
      );
    }

    lines.push({
      merch: product._id as mongoose.Types.ObjectId,
      title: product.title,
      size,
      quantity,
      unitPrice: round2(unitPrice),
      unitCost: product.costPrice ?? 0,
    });
  }

  // Décrément atomique et conditionnel : il n'aboutit que s'il reste assez
  // de stock, donc deux ventes simultanées de la dernière pièce ne passent pas
  // toutes les deux. En cas d'échec sur une ligne, on remet les précédentes.
  const decremented: ISaleItem[] = [];
  const rollback = () =>
    Promise.all(
      decremented.map((line) =>
        MerchModel.updateOne({ _id: line.merch }, { $inc: { [stockField(line.size)]: line.quantity } })
      )
    );

  for (const line of lines) {
    const field = stockField(line.size);
    const result = await MerchModel.updateOne(
      { _id: line.merch, [field]: { $gte: line.quantity } },
      { $inc: { [field]: -line.quantity } }
    );

    if (result.modifiedCount !== 1) {
      await rollback();
      const label = line.size ? `${line.title} (${line.size})` : line.title;
      return NextResponse.json(
        { error: `Stock insuffisant pour ${label}.` },
        { status: 409 }
      );
    }
    decremented.push(line);
  }

  let concertId: mongoose.Types.ObjectId | undefined;
  let concertLabel = '';
  if (body.concertId && mongoose.Types.ObjectId.isValid(body.concertId)) {
    const concert = await ConcertModel.findById(body.concertId).lean();
    if (concert) {
      concertId = concert._id as mongoose.Types.ObjectId;
      concertLabel = `${concert.venue} – ${concert.date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}`;
    }
  }

  const total = round2(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));

  try {
    const created = await SaleModel.create({
      items: lines,
      total,
      fee: computeFee(paymentMethod, total),
      paymentMethod,
      concert: concertId,
      concertLabel,
      createdBy: session.user.name || session.user.email || '',
      clientId: clientId || undefined,
    });

    return NextResponse.json(serializeSale(created), { status: 201 });
  } catch {
    await rollback();
    return NextResponse.json(
      { error: 'Erreur lors de l’enregistrement de la vente.' },
      { status: 500 }
    );
  }
}
