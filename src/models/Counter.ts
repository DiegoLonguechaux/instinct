import mongoose, { Model } from 'mongoose';

// Compteurs atomiques (ex. numéros de commande par année).
export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new mongoose.Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const CounterModel =
  (mongoose.models.Counter as Model<ICounter>) || mongoose.model<ICounter>('Counter', CounterSchema);

export async function nextSequence(key: string) {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  return counter.seq;
}

export default CounterModel;
