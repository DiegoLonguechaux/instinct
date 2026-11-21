import mongoose, { Document, Model } from 'mongoose';

// Code à usage unique envoyé par mail après un mot de passe valide.
// Ni l'identifiant du défi ni le code ne sont stockés en clair.
export interface ILoginChallenge extends Document {
  user: mongoose.Types.ObjectId;
  challengeHash: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const LoginChallengeSchema = new mongoose.Schema<ILoginChallenge>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    challengeHash: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LoginChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models.LoginChallenge as Model<ILoginChallenge>) ||
  mongoose.model<ILoginChallenge>('LoginChallenge', LoginChallengeSchema);
