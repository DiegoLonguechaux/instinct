import mongoose, { Document, Model } from 'mongoose';

export interface IMerch extends Document {
  title: string;
  price: number;
  sizes: string[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MerchSchema = new mongoose.Schema<IMerch>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sizes: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default (mongoose.models.Merch as Model<IMerch>) || mongoose.model<IMerch>('Merch', MerchSchema);
