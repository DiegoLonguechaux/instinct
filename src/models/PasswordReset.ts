import mongoose, { Document, Model } from 'mongoose';

// Jeton de réinitialisation de mot de passe (stocké haché, usage unique).
export interface IPasswordReset extends Document {
  user: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
}

const PasswordResetSchema = new mongoose.Schema<IPasswordReset>({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models.PasswordReset as Model<IPasswordReset>) ||
  mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
