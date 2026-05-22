import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICoworkingPolicy extends Document {
  venueId: Types.ObjectId;
  openingHour: number;
  closingHour: number;
  halfDayHours: number;
  fullDayHours: number;
  maxBookingHours: number;
  allowOvertime: boolean;
  overtimeAfterHours: number;
  overtimeHourlyRate: number;
}

const CoworkingPolicySchema = new Schema<ICoworkingPolicy>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, unique: true, index: true },
    openingHour: { type: Number, default: 8, min: 0, max: 23 },
    closingHour: { type: Number, default: 22, min: 1, max: 24 },
    halfDayHours: { type: Number, default: 4, min: 2, max: 8 },
    fullDayHours: { type: Number, default: 8, min: 4, max: 24 },
    maxBookingHours: { type: Number, default: 12, min: 1, max: 24 },
    allowOvertime: { type: Boolean, default: false },
    overtimeAfterHours: { type: Number, default: 8, min: 1, max: 24 },
    overtimeHourlyRate: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const CoworkingPolicy = mongoose.model<ICoworkingPolicy>('CoworkingPolicy', CoworkingPolicySchema);

