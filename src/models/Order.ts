import mongoose, { Document, Model } from 'mongoose';

import { ORDER_STATUSES, type OrderStatus } from '@/lib/order-status';

export { ORDER_STATUSES };
export type { OrderStatus };

export interface IOrderItem {
  merch: mongoose.Types.ObjectId;
  title: string;
  size: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  weightGrams: number;
}

export interface IOrder extends Document {
  number: string;
  // Jeton non devinable pour la page de confirmation (l'id Mongo ne doit pas servir d'accès).
  publicToken: string;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: Date; note: string; by: string }[];
  items: IOrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  customer: { email: string; firstName: string; lastName: string; phone: string };
  delivery: {
    mode: 'relay' | 'home';
    label: string; // ex. "Point relais Mondial Relay"
    offerCode: string; // code d'offre Boxtal utilisé pour l'étiquette
    relayPoint?: { code: string; network: string; name: string; street: string; postalCode: string; city: string };
    address?: { street: string; complement: string; postalCode: string; city: string };
    weightGrams: number;
  };
  payment: {
    stripeSessionId: string;
    stripePaymentIntentId: string;
    stripeFee: number;
    paidAt?: Date;
    refundedAt?: Date;
  };
  shipment: {
    boxtalOrderId: string;
    trackingNumber: string;
    trackingUrl: string;
    labelUrl: string;
    shippedAt?: Date;
    deliveredAt?: Date;
  };
  reservedUntil: Date;
  // Posé de façon atomique avant l'envoi des mails : garantit un seul envoi malgré les rejeux de webhook.
  notifiedAt?: Date;
  internalNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new mongoose.Schema<IOrderItem>(
  {
    merch: { type: mongoose.Schema.Types.ObjectId, ref: 'Merch', required: true },
    title: { type: String, required: true },
    size: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    weightGrams: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema<IOrder>(
  {
    number: { type: String, required: true, unique: true },
    publicToken: { type: String, required: true, unique: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment', index: true },
    statusHistory: {
      type: [
        new mongoose.Schema(
          {
            status: { type: String, enum: ORDER_STATUSES, required: true },
            at: { type: Date, default: Date.now },
            note: { type: String, default: '' },
            by: { type: String, default: '' },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    customer: {
      email: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: { type: String, required: true },
    },
    delivery: {
      mode: { type: String, enum: ['relay', 'home'], required: true },
      label: { type: String, default: '' },
      offerCode: { type: String, default: '' },
      relayPoint: {
        type: new mongoose.Schema(
          {
            code: String,
            network: String,
            name: String,
            street: String,
            postalCode: String,
            city: String,
          },
          { _id: false }
        ),
        default: undefined,
      },
      address: {
        type: new mongoose.Schema(
          { street: String, complement: String, postalCode: String, city: String },
          { _id: false }
        ),
        default: undefined,
      },
      weightGrams: { type: Number, default: 0 },
    },
    payment: {
      stripeSessionId: { type: String, default: '' },
      stripePaymentIntentId: { type: String, default: '' },
      stripeFee: { type: Number, default: 0 },
      paidAt: Date,
      refundedAt: Date,
    },
    shipment: {
      boxtalOrderId: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
      trackingUrl: { type: String, default: '' },
      labelUrl: { type: String, default: '' },
      shippedAt: Date,
      deliveredAt: Date,
    },
    reservedUntil: { type: Date, required: true },
    notifiedAt: { type: Date },
    internalNote: { type: String, default: '' },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, reservedUntil: 1 });
OrderSchema.index({ 'payment.stripeSessionId': 1 });

export default (mongoose.models.Order as Model<IOrder>) || mongoose.model<IOrder>('Order', OrderSchema);
