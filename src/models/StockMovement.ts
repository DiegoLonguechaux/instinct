import mongoose, { Document, Model } from 'mongoose';

// Journal des mouvements manuels de stock (réassort, correction d'inventaire).
// Les ventes ne passent pas par ici : elles sont tracées dans `Sale`.
export interface IStockMovement extends Document {
  merch: mongoose.Types.ObjectId;
  merchTitle: string;
  size: string;
  delta: number;
  resultingQuantity: number;
  type: 'restock' | 'adjustment';
  reason: string;
  createdBy: string;
  createdAt: Date;
}

const StockMovementSchema = new mongoose.Schema<IStockMovement>(
  {
    merch: { type: mongoose.Schema.Types.ObjectId, ref: 'Merch', required: true },
    merchTitle: { type: String, required: true },
    size: { type: String, default: '' },
    delta: { type: Number, required: true },
    resultingQuantity: { type: Number, required: true },
    type: { type: String, enum: ['restock', 'adjustment'], required: true },
    reason: { type: String, default: '', trim: true },
    createdBy: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockMovementSchema.index({ createdAt: -1 });

export default (mongoose.models.StockMovement as Model<IStockMovement>) ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
