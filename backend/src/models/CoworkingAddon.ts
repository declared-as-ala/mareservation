import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICoworkingAddon extends Document {
  venueId: Types.ObjectId;
  key: string;
  name: string;
  unitPrice: number;
  isActive: boolean;
  maxQty?: number;
}

const CoworkingAddonSchema = new Schema<ICoworkingAddon>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    unitPrice: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    maxQty: { type: Number, min: 1 },
  },
  { timestamps: true }
);

CoworkingAddonSchema.index({ venueId: 1, key: 1 }, { unique: true });

export const CoworkingAddon = mongoose.model<ICoworkingAddon>('CoworkingAddon', CoworkingAddonSchema);

