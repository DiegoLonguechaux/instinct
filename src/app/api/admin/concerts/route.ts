import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import ConcertModel from '@/models/Concert';
import { NextResponse } from 'next/server';

export type ConcertPayload = {
  date?: string;
  venue?: string;
  description?: string;
  link?: string;
};

export function normalizeConcert(input: ConcertPayload) {
  return {
    date: input.date ?? '',
    venue: (input.venue ?? '').trim(),
    description: (input.description ?? '').trim(),
    link: (input.link ?? '').trim(),
  };
}

export function serializeConcert(concert: {
  _id: { toString: () => string };
  date: Date;
  venue: string;
  description?: string;
  link?: string;
}) {
  return {
    id: concert._id.toString(),
    date: concert.date.toISOString(),
    venue: concert.venue,
    description: concert.description ?? '',
    link: concert.link ?? '',
  };
}

export async function GET() {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  await dbConnect();
  const concerts = await ConcertModel.find({}).sort({ date: 1 }).lean();

  return NextResponse.json(concerts.map((concert) => serializeConcert(concert)));
}

export async function POST(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
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

  const created = await ConcertModel.create({
    date: new Date(payload.date),
    venue: payload.venue,
    description: payload.description,
    link: payload.link,
  });

  return NextResponse.json(serializeConcert(created), { status: 201 });
}
