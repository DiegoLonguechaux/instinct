import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import { totalStock } from '@/lib/merch';
import { ensureMerchSlugs, uniqueMerchSlug } from '@/lib/slug';
import MerchModel from '@/models/Merch';
import { NextResponse } from 'next/server';

export type MerchPayload = {
  title?: string;
  price?: number;
  costPrice?: number;
  sizes?: unknown;
  images?: unknown;
  visible?: unknown;
  description?: string;
  weightGrams?: unknown;
  sellOnline?: unknown;
  stock?: unknown;
  sizeStock?: unknown;
};

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}

// Les tailles servent de clés Mongo (`sizeStock.M`) : on écarte celles qui
// contiendraient un point ou commenceraient par `$`.
function normalizeSizes(value: unknown) {
  return [...new Set(normalizeStringArray(value))].filter(
    (size) => !size.includes('.') && !size.startsWith('$')
  );
}

function toQuantity(value: unknown) {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

/** Champs communs à la création et à la modification (le stock n'en fait pas partie). */
export function normalizePayload(payload: MerchPayload) {
  return {
    title: (payload.title ?? '').trim(),
    price: Number(payload.price ?? 0),
    costPrice: Number(payload.costPrice ?? 0),
    sizes: normalizeSizes(payload.sizes),
    images: normalizeStringArray(payload.images),
    visible: payload.visible !== false,
    description: (payload.description ?? '').trim(),
    weightGrams: Math.max(0, Math.round(Number(payload.weightGrams ?? 0))),
    sellOnline: payload.sellOnline === true,
  };
}

/** Stock initial, accepté uniquement à la création. Ensuite : page Stock. */
export function normalizeInitialStock(payload: MerchPayload, sizes: string[]) {
  const source =
    payload.sizeStock && typeof payload.sizeStock === 'object'
      ? (payload.sizeStock as Record<string, unknown>)
      : {};

  return {
    stock: sizes.length === 0 ? toQuantity(payload.stock) : 0,
    sizeStock: Object.fromEntries(sizes.map((size) => [size, toQuantity(source[size])])),
  };
}

export function validatePayload(payload: ReturnType<typeof normalizePayload>) {
  if (!payload.title) {
    return 'Le titre est obligatoire.';
  }
  if (Number.isNaN(payload.price) || payload.price < 0) {
    return 'Le prix doit être un nombre positif.';
  }
  if (Number.isNaN(payload.costPrice) || payload.costPrice < 0) {
    return 'Le prix de revient doit être un nombre positif.';
  }
  if (Number.isNaN(payload.weightGrams)) {
    return 'Le poids doit être un nombre.';
  }
  if (payload.sellOnline && payload.weightGrams <= 0) {
    return 'Le poids est obligatoire pour vendre un article en ligne (calcul des frais de port).';
  }
  return null;
}

export function serializeMerch(merch: {
  _id: { toString: () => string };
  title: string;
  slug?: string;
  description?: string;
  weightGrams?: number;
  sellOnline?: boolean;
  price: number;
  costPrice?: number;
  sizes?: string[];
  stock?: number;
  sizeStock?: Record<string, number>;
  visible?: boolean;
  images?: string[];
  createdAt?: Date;
}) {
  const sizes = merch.sizes ?? [];
  const sizeStock = Object.fromEntries(sizes.map((size) => [size, merch.sizeStock?.[size] ?? 0]));
  const stock = merch.stock ?? 0;

  return {
    id: merch._id.toString(),
    title: merch.title,
    slug: merch.slug ?? '',
    description: merch.description ?? '',
    weightGrams: merch.weightGrams ?? 0,
    sellOnline: merch.sellOnline === true,
    price: merch.price,
    costPrice: merch.costPrice ?? 0,
    sizes,
    stock,
    sizeStock,
    totalStock: totalStock({ sizes, stock, sizeStock }),
    visible: merch.visible !== false,
    images: merch.images ?? [],
    createdAt: merch.createdAt ? merch.createdAt.toISOString() : '',
  };
}

export async function GET() {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  await dbConnect();
  await ensureMerchSlugs();
  const merchList = await MerchModel.find({}).sort({ createdAt: -1 }).lean();

  return NextResponse.json(merchList.map((item) => serializeMerch(item)));
}

export async function POST(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const body = (await request.json()) as MerchPayload;
  const payload = normalizePayload(body);

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await dbConnect();
  const created = await MerchModel.create({
    ...payload,
    slug: await uniqueMerchSlug(payload.title),
    ...normalizeInitialStock(body, payload.sizes),
  });

  return NextResponse.json(serializeMerch(created), { status: 201 });
}
