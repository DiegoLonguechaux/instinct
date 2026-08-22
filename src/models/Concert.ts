import mongoose, { Document, Model } from 'mongoose';

export interface IConcert extends Document {
  date: Date;
  venue: string;
  description?: string;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConcertSchema = new mongoose.Schema<IConcert>(
  {
    date: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

export default (mongoose.models.Concert as Model<IConcert>) || mongoose.model<IConcert>('Concert', ConcertSchema);
