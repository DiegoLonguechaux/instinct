import mongoose, { Document, Model } from 'mongoose';

export interface IGalleryItem extends Document {
  title: string;
  description?: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const GalleryItemSchema = new mongoose.Schema<IGalleryItem>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default (mongoose.models.GalleryItem as Model<IGalleryItem>) ||
  mongoose.model<IGalleryItem>('GalleryItem', GalleryItemSchema);
