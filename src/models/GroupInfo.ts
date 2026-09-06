import mongoose, { Document, Model } from 'mongoose';

export interface ILinks {
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
}

export interface IGroupInfo extends Document {
  bandName: string;
  bio?: string;
  groupPhotoUrl?: string;
  logoUrl?: string;
  signatureLogoUrl?: string;
  pressKitUrl?: string;
  latestVideoUrl?: string;
  contactEmail?: string;
  links?: ILinks;
  createdAt: Date;
  updatedAt: Date;
}

const LinksSchema = new mongoose.Schema<ILinks>(
  {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    youtube: { type: String, default: '' },
    spotify: { type: String, default: '' },
    deezer: { type: String, default: '' },
    appleMusic: { type: String, default: '' },
    amazonMusic: { type: String, default: '' },
    youtubeMusic: { type: String, default: '' },
    bandcamp: { type: String, default: '' },
    soundcloud: { type: String, default: '' },
  },
  { _id: false }
);

const GroupInfoSchema = new mongoose.Schema<IGroupInfo>(
  {
    bandName: {
      type: String,
      required: true,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
    },
    groupPhotoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    // Logo hébergé pour un usage hors site (signature email, etc.) — jamais
    // affiché sur la vitrine, on ne stocke que l'URL pour pouvoir la copier.
    signatureLogoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    pressKitUrl: {
      type: String,
      default: '',
      trim: true,
    },
    latestVideoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
    },
    links: {
      type: LinksSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export default (mongoose.models.GroupInfo as Model<IGroupInfo>) ||
  mongoose.model<IGroupInfo>('GroupInfo', GroupInfoSchema);
