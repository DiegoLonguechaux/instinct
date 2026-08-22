import mongoose, { Document, Model } from 'mongoose';

export interface IReleaseLinks {
  spotify?: string;
  deezer?: string;
  appleMusic?: string;
  amazonMusic?: string;
  youtubeMusic?: string;
  bandcamp?: string;
  soundcloud?: string;
}

export interface IRelease extends Document {
  type: 'single' | 'ep' | 'album';
  name: string;
  coverUrl?: string;
  links?: IReleaseLinks;
  createdAt: Date;
  updatedAt: Date;
}

const ReleaseLinksSchema = new mongoose.Schema<IReleaseLinks>(
  {
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

const ReleaseSchema = new mongoose.Schema<IRelease>(
  {
    type: {
      type: String,
      enum: ['single', 'ep', 'album'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    coverUrl: {
      type: String,
      default: '',
      trim: true,
    },
    links: {
      type: ReleaseLinksSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export default (mongoose.models.Release as Model<IRelease>) || mongoose.model<IRelease>('Release', ReleaseSchema);
