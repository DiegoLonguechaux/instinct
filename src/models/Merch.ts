import mongoose, { Document, Model } from 'mongoose';

export interface IMerch extends Document {
  title: string;
  // Segment d'URL de la fiche produit (/merch/<slug>), stable une fois attribué.
  slug: string;
  description: string;
  // Poids unitaire en grammes, utilisé pour calculer les frais de port.
  weightGrams: number;
  // Vendable sur le site (distinct de `visible` : afficher sur la vitrine).
  sellOnline: boolean;
  price: number;
  costPrice: number;
  sizes: string[];
  // Stock unique, utilisé uniquement pour les produits sans taille.
  stock: number;
  // Stock par taille ({ M: 4, L: 2 }), utilisé quand `sizes` n'est pas vide.
  sizeStock: Record<string, number>;
  // Affiché ou non sur le site vitrine.
  visible: boolean;
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
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    weightGrams: {
      type: Number,
      default: 0,
      min: 0,
    },
    sellOnline: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    sizes: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    sizeStock: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    visible: {
      type: Boolean,
      default: true,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true, minimize: false }
);

export default (mongoose.models.Merch as Model<IMerch>) || mongoose.model<IMerch>('Merch', MerchSchema);
