import mongoose, { Model } from 'mongoose';

// Compteur de requêtes par clé (ex. "login:ip:1.2.3.4"). Les documents
// expirent tout seuls grâce à l'index TTL sur `resetAt`.
export interface IRateLimit {
  _id: string;
  count: number;
  resetAt: Date;
}

const RateLimitSchema = new mongoose.Schema<IRateLimit>(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false }
);

RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models.RateLimit as Model<IRateLimit>) ||
  mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
