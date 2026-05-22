import mongoose, { Schema, Document, Types } from 'mongoose';

export type PricingRuleKind =
  | 'seasonal'        // multiplier applied over a date range (e.g. summer +30%)
  | 'weekend'         // multiplier applied to Fri-Sat-Sun nights
  | 'holiday'         // single-day surcharge
  | 'min_nights'      // require N nights minimum on a date range
  | 'max_nights'      // cap N nights maximum on a date range
  | 'last_minute'     // discount for bookings made within X days of arrival
  | 'early_booking';  // discount for bookings made more than X days in advance

export interface IPricingRule extends Document {
  venueId: Types.ObjectId;
  roomId?: Types.ObjectId;          // null = applies to all rooms of the venue
  kind: PricingRuleKind;
  label: string;
  startsAt?: Date;
  endsAt?: Date;
  daysOfWeek?: number[];            // 0-6 (Sunday-Saturday)
  multiplier?: number;              // e.g. 1.30 = +30%, 0.85 = −15%
  amount?: number;                  // fixed surcharge/discount per night
  minNights?: number;
  maxNights?: number;
  windowDays?: number;              // last-minute / early-booking pivot
  isActive: boolean;
  priority: number;                 // higher = applied last
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PricingRuleSchema = new Schema<IPricingRule>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    kind: {
      type: String,
      required: true,
      enum: ['seasonal', 'weekend', 'holiday', 'min_nights', 'max_nights', 'last_minute', 'early_booking'],
    },
    label: { type: String, required: true, maxlength: 120 },
    startsAt: { type: Date },
    endsAt: { type: Date },
    daysOfWeek: { type: [Number], default: undefined },
    multiplier: { type: Number },
    amount: { type: Number },
    minNights: { type: Number },
    maxNights: { type: Number },
    windowDays: { type: Number },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

PricingRuleSchema.index({ venueId: 1, isActive: 1, priority: -1 });

export const PricingRule = mongoose.model<IPricingRule>('PricingRule', PricingRuleSchema);
