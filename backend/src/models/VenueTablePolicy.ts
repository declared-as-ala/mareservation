import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVenueShift {
  name: string;
  startHour: number;
  endHour: number;
}

export interface IVenueTablePolicy extends Document {
  venueId: Types.ObjectId;
  slotMinutes: number;
  reservationDurationMinutes: number;
  openingHour: number;
  closingHour: number;
  shifts: IVenueShift[];
  depositRequired: boolean;
  depositType: 'none' | 'fixed' | 'percent';
  depositValue: number;
  cancellationCutoffMinutes: number;
  noShowGraceMinutes: number;
}

const VenueShiftSchema = new Schema<IVenueShift>(
  {
    name: { type: String, required: true, trim: true },
    startHour: { type: Number, required: true, min: 0, max: 23 },
    endHour: { type: Number, required: true, min: 1, max: 24 },
  },
  { _id: false }
);

const VenueTablePolicySchema = new Schema<IVenueTablePolicy>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, unique: true, index: true },
    slotMinutes: { type: Number, default: 30, min: 15, max: 120 },
    reservationDurationMinutes: { type: Number, default: 240, min: 30, max: 480 },
    openingHour: { type: Number, default: 12, min: 0, max: 23 },
    closingHour: { type: Number, default: 23, min: 1, max: 24 },
    shifts: { type: [VenueShiftSchema], default: [] },
    depositRequired: { type: Boolean, default: false },
    depositType: { type: String, enum: ['none', 'fixed', 'percent'], default: 'none' },
    depositValue: { type: Number, default: 0, min: 0 },
    cancellationCutoffMinutes: { type: Number, default: 120, min: 0, max: 10080 },
    noShowGraceMinutes: { type: Number, default: 15, min: 0, max: 240 },
  },
  { timestamps: true }
);

export const VenueTablePolicy = mongoose.model<IVenueTablePolicy>('VenueTablePolicy', VenueTablePolicySchema);

