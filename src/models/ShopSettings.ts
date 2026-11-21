import mongoose, { Document, Model } from 'mongoose';

export interface IShippingBracket {
  /** Tranche applicable jusqu'à ce poids (colis compris), en grammes. */
  maxWeightGrams: number;
  relayPrice: number;
  homePrice: number;
}

// Réglages de la boutique (un seul document).
export interface IShopSettings extends Document {
  // Interrupteur général : faux = le paiement en ligne est suspendu.
  shopEnabled: boolean;
  // Poids de l'emballage ajouté au poids des articles.
  packagingGrams: number;
  // Barème des frais de port, recopié de la grille Boxtal.
  shippingBrackets: IShippingBracket[];
  // Codes d'offre Boxtal utilisés pour les étiquettes (ex. "MONR-CpourToi").
  relayOfferCode: string;
  homeOfferCode: string;
  // Réseau de points relais proposés au client (ex. "MONR").
  relayNetworks: string[];
  // Dimensions du colis standard (cm), exigées par Boxtal.
  parcelLengthCm: number;
  parcelWidthCm: number;
  parcelHeightCm: number;
}

const ShopSettingsSchema = new mongoose.Schema<IShopSettings>(
  {
    shopEnabled: { type: Boolean, default: false },
    packagingGrams: { type: Number, default: 50, min: 0 },
    shippingBrackets: {
      type: [
        new mongoose.Schema(
          {
            maxWeightGrams: { type: Number, required: true, min: 1 },
            relayPrice: { type: Number, required: true, min: 0 },
            homePrice: { type: Number, required: true, min: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    relayOfferCode: { type: String, default: '' },
    homeOfferCode: { type: String, default: '' },
    relayNetworks: { type: [String], default: ['MONR'] },
    parcelLengthCm: { type: Number, default: 30, min: 1 },
    parcelWidthCm: { type: Number, default: 25, min: 1 },
    parcelHeightCm: { type: Number, default: 8, min: 1 },
  },
  { timestamps: true }
);

export default (mongoose.models.ShopSettings as Model<IShopSettings>) ||
  mongoose.model<IShopSettings>('ShopSettings', ShopSettingsSchema);
