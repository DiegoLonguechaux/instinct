import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import MerchModel from '@/models/Merch';
import { NextResponse } from 'next/server';

export type MerchPayload = {
  title?: string;
  price?: number;
  sizes?: unknown;
  images?: unknown;
};

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export function normalizePayload(payload: MerchPayload) {
  return {
    title: (payload.title ?? '').trim(),
    price: Number(payload.price ?? 0),
    sizes: normalizeStringArray(payload.sizes),
    images: normalizeStringArray(payload.images),
  };
}

export function serializeMerch(merch: {
  _id: { toString: () => string };
  title: string;
  price: number;
  sizes?: string[];
  images?: string[];
  createdAt?: Date;
}) {
  return {
    id: merch._id.toString(),
    title: merch.title,
    price: merch.price,
    sizes: merch.sizes ?? [],
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
  const created = await MerchModel.create(payload);

  return NextResponse.json(serializeMerch(created), { status: 201 });
}
