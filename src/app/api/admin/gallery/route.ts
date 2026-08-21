import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import GalleryItemModel from '@/models/GalleryItem';
import { NextResponse } from 'next/server';

export type GalleryPayload = {
  title?: string;
  description?: string;
  imageUrl?: string;
};

export function normalizePayload(payload: GalleryPayload) {
  return {
    title: (payload.title ?? '').trim(),
    description: (payload.description ?? '').trim(),
    imageUrl: (payload.imageUrl ?? '').trim(),
  };
}

export function serializeItem(item: {
  _id: { toString: () => string };
  title: string;
  description?: string;
  imageUrl: string;
  createdAt?: Date;
}) {
  return {
    id: item._id.toString(),
    title: item.title,
    description: item.description ?? '',
    imageUrl: item.imageUrl,
    createdAt: item.createdAt ? item.createdAt.toISOString() : '',
  };
}

export async function GET() {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  await dbConnect();
  const items = await GalleryItemModel.find({}).sort({ createdAt: -1 }).lean();

  return NextResponse.json(items.map((item) => serializeItem(item)));
}

export async function POST(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
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
  const created = await GalleryItemModel.create(payload);

  return NextResponse.json(serializeItem(created), { status: 201 });
}
