import mongoose, { Schema, Document, Types } from 'mongoose';

export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'on_hold' | 'rejected';

export interface IPayoutItem {
  reservationId: Types.ObjectId;
  reservationCode?: string;
  gross: number;
  commission: number;
  net: number;
  startAt: Date;
  endAt: Date;
}

export interface IPayout extends Document {
  venueId: Types.ObjectId;
  ownerId: Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  items: IPayoutItem[];
  gross: number;            // total before commission
  commission: number;       // platform fee
  commissionRate: number;   // snapshot of rate at payout creation
  net: number;              // owner receives this
  currency: string;
  status: PayoutStatus;
  statusReason?: string;
  paidAt?: Date;
  paidBy?: Types.ObjectId;
  paymentReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    items: [{
      reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true },
      reservationCode: { type: String },
      gross: { type: Number, required: true },
      commission: { type: Number, required: true },
      net: { type: Number, required: true },
      startAt: { type: Date, required: true },
      endAt: { type: Date, required: true },
    }],
    gross: { type: Number, required: true },
    commission: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    net: { type: Number, required: true },
    currency: { type: String, default: 'TND' },
    status: { type: String, enum: ['pending', 'approved', 'paid', 'on_hold', 'rejected'], default: 'pending', index: true },
    statusReason: { type: String },
    paidAt: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paymentReference: { type: String },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

PayoutSchema.index({ ownerId: 1, status: 1, periodStart: -1 });
PayoutSchema.index({ venueId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

export const Payout = mongoose.model<IPayout>('Payout', PayoutSchema);
