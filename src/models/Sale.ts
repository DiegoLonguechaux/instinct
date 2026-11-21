import mongoose, { Document, Model } from 'mongoose';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/merch';

export interface ISaleItem {
  merch: mongoose.Types.ObjectId;
  // Nom, prix et coût figés au moment de la vente : les stats restent
  // justes même si le produit est modifié ou supprimé ensuite.
  title: string;
  size: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface ISale extends Document {
  items: ISaleItem[];
  total: number;
  fee: number;
  paymentMethod: PaymentMethod;
  concert?: mongoose.Types.ObjectId;
  concertLabel: string;
  status: 'completed' | 'cancelled';
  cancelledAt?: Date;
  createdBy: string;
  // Origine de la vente : table de merch ou boutique en ligne.
  source: 'counter' | 'online';
  order?: mongoose.Types.ObjectId;
  // Identifiant généré côté client : évite les doublons si la requête est renvoyée.
  clientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new mongoose.Schema<ISaleItem>(
  {
    merch: { type: mongoose.Schema.Types.ObjectId, ref: 'Merch', required: true },
    title: { type: String, required: true },
    size: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new mongoose.Schema<ISale>(
  {
    items: { type: [SaleItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    fee: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    concert: { type: mongoose.Schema.Types.ObjectId, ref: 'Concert' },
    concertLabel: { type: String, default: '' },
    status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
    cancelledAt: { type: Date },
    createdBy: { type: String, default: '' },
    source: { type: String, enum: ['counter', 'online'], default: 'counter' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    clientId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

SaleSchema.index({ createdAt: -1 });

export default (mongoose.models.Sale as Model<ISale>) || mongoose.model<ISale>('Sale', SaleSchema);
