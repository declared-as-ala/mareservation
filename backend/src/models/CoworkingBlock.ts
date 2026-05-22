import mongoose, { Document, Schema, Types } from 'mongoose';

export type CoworkingBlockScope = 'unit' | 'venue';
export type CoworkingBlockReason =
  | 'maintenance'
  | 'private_booking'
  | 'cleaning'
  | 'staff_use'
  | 'owner_hold'
  | 'other';

export interface ICoworkingBlock extends Document {
  venueId: Types.ObjectId;
  reservableUnitId?: Types.ObjectId;
  scope: CoworkingBlockScope;
  startsAt: Date;
  endsAt: Date;
  reason: CoworkingBlockReason;
  note?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
}

const CoworkingBlockSchema = new Schema<ICoworkingBlock>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    reservableUnitId: { type: Schema.Types.ObjectId, ref: 'ReservableUnit', index: true },
    scope: { type: String, enum: ['unit', 'venue'], default: 'unit', required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    reason: { type: String, enum: ['maintenance', 'private_booking', 'cleaning', 'staff_use', 'owner_hold', 'other'], default: 'owner_hold' },
    note: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CoworkingBlockSchema.index({ venueId: 1, scope: 1, startsAt: 1, endsAt: 1, isActive: 1 });
CoworkingBlockSchema.index({ reservableUnitId: 1, startsAt: 1, endsAt: 1, isActive: 1 });

export const CoworkingBlock = mongoose.model<ICoworkingBlock>('CoworkingBlock', CoworkingBlockSchema);

