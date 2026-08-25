import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import GroupInfoModel from '@/models/GroupInfo';
import { NextResponse } from 'next/server';

type LinksPayload = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  spotify?: string;
  deezer?: string;
  appleMusic?: string;
  amazonMusic?: string;
  youtubeMusic?: string;
  bandcamp?: string;
  soundcloud?: string;
};

type GroupInfoPayload = {
  bandName?: string;
  bio?: string;
  groupPhotoUrl?: string;
  logoUrl?: string;
  pressKitUrl?: string;
  latestVideoUrl?: string;
  contactEmail?: string;
  links?: LinksPayload;
};

function emptyLinks() {
  return {
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
    spotify: '',
    deezer: '',
    appleMusic: '',
    amazonMusic: '',
    youtubeMusic: '',
    bandcamp: '',
    soundcloud: '',
  };
}

function normalizeDoc(doc: GroupInfoPayload | null | undefined) {
  return {
    bandName: (doc?.bandName ?? '').trim(),
    bio: (doc?.bio ?? '').trim(),
    groupPhotoUrl: doc?.groupPhotoUrl ?? '',
    logoUrl: doc?.logoUrl ?? '',
    pressKitUrl: doc?.pressKitUrl ?? '',
    latestVideoUrl: doc?.latestVideoUrl ?? '',
    contactEmail: doc?.contactEmail ?? '',
    links: {
      ...emptyLinks(),
      ...(doc?.links ?? {}),
    },
  };
}

export async function GET() {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  await dbConnect();

  const existing = await GroupInfoModel.findOne({}).lean();

  if (!existing) {
    return NextResponse.json(normalizeDoc(null));
  }

  return NextResponse.json(normalizeDoc(existing));
}

export async function PUT(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const body = (await request.json()) as GroupInfoPayload;
  const payload = normalizeDoc(body);

  // Mongoose n'échoue pas sur required + chaîne vide (le default '' du
  // schéma passe la validation), donc on vérifie explicitement ici comme
  // pour toutes les autres ressources.
  if (!payload.bandName) {
    return NextResponse.json(
      { error: 'Le nom du groupe est obligatoire.' },
      { status: 400 }
    );
  }

  await dbConnect();

  const saved = await GroupInfoModel.findOneAndUpdate({}, payload, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  }).lean();

  return NextResponse.json(normalizeDoc(saved));
}
