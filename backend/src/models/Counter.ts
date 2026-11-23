import mongoose, { Schema, type ClientSession } from 'mongoose';

/** Monotonic sequences (e.g. reservation references EX-2026-000001). */
const CounterSchema = new Schema<{ _id: string; seq: number }>({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } }, { versionKey: false });

export const Counter = mongoose.model('Counter', CounterSchema);

export async function nextSequence(name: string, session?: ClientSession): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true, session }).lean();
  return (doc as any).seq as number;
}
