import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import ReleaseModel from '@/models/Release';
import { NextResponse } from 'next/server';

export type ReleaseType = 'single' | 'ep' | 'album';

export type ReleaseLinksPayload = {
  spotify?: string;
  deezer?: string;
  appleMusic?: string;
  amazonMusic?: string;
  youtubeMusic?: string;
  bandcamp?: string;
  soundcloud?: string;
};

export type ReleasePayload = {
  type?: ReleaseType;
  name?: string;
  coverUrl?: string;
  links?: ReleaseLinksPayload;
};

export function emptyLinks() {
  return {
    spotify: '',
    deezer: '',
    appleMusic: '',
    amazonMusic: '',
    youtubeMusic: '',
    bandcamp: '',
    soundcloud: '',
  };
}

export function normalizePayload(payload: ReleasePayload) {
  return {
    type: payload.type,
    name: (payload.name ?? '').trim(),
    coverUrl: (payload.coverUrl ?? '').trim(),
    links: {
      ...emptyLinks(),
      ...(payload.links ?? {}),
    },
  };
}

export function serializeRelease(release: {
  _id: { toString: () => string };
  type: ReleaseType;
  name: string;
  coverUrl?: string;
  links?: ReleaseLinksPayload;
  createdAt?: Date;
}) {
  return {
    id: release._id.toString(),
    type: release.type,
    name: release.name,
    coverUrl: release.coverUrl ?? '',
    links: {
      ...emptyLinks(),
      ...(release.links ?? {}),
    },
    createdAt: release.createdAt ? release.createdAt.toISOString() : '',
  };
}

export async function GET() {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  await dbConnect();
  const releases = await ReleaseModel.find({}).sort({ createdAt: -1 }).lean();

  return NextResponse.json(releases.map((release) => serializeRelease(release)));
}

export async function POST(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const body = (await request.json()) as ReleasePayload;
  const payload = normalizePayload(body);

  if (!payload.type || !payload.name) {
    return NextResponse.json(
      { error: 'Le type et le nom sont obligatoires.' },
      { status: 400 }
    );
  }

  await dbConnect();
  const created = await ReleaseModel.create(payload);

  return NextResponse.json(serializeRelease(created), { status: 201 });
}
