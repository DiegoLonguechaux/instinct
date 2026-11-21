import mongoose, { Document, Model } from 'mongoose';

// Appareil ayant déjà passé la double authentification. Le jeton n'est stocké
// que haché ; le cookie correspondant n'est envoyé qu'aux routes de connexion.
export interface ITrustedDevice extends Document {
  user: mongoose.Types.ObjectId;
  tokenHash: string;
  userAgent: string;
  lastUsedAt: Date;
  expiresAt: Date;
}

const TrustedDeviceSchema = new mongoose.Schema<ITrustedDevice>({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  userAgent: { type: String, default: '' },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

TrustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models.TrustedDevice as Model<ITrustedDevice>) ||
  mongoose.model<ITrustedDevice>('TrustedDevice', TrustedDeviceSchema);
