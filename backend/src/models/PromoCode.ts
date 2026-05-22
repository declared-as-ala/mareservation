import mongoose, { Schema, Document, Types } from 'mongoose';

export type PromoCodeKind = 'percent' | 'amount' | 'free_night';
export type PromoCodeScope = 'global' | 'venue';

export interface IPromoCode extends Document {
  code: string;            // uppercase, unique
  kind: PromoCodeKind;
  value: number;           // %, TND, or N free nights
  scope: PromoCodeScope;
  venueId?: Types.ObjectId; // when scope='venue'
  description?: string;
  minNights?: number;
  minAmount?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  usedCount: number;
  startsAt?: Date;
  endsAt?: Date;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, uppercase: true, trim: true, unique: true, index: true },
    kind: { type: String, required: true, enum: ['percent', 'amount', 'free_night'] },
    value: { type: Number, required: true, min: 0 },
    scope: { type: String, required: true, enum: ['global', 'venue'], default: 'global' },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue' },
    description: { type: String, maxlength: 240 },
    minNights: { type: Number },
    minAmount: { type: Number },
    maxUses: { type: Number },
    maxUsesPerUser: { type: Number },
    usedCount: { type: Number, default: 0 },
    startsAt: { type: Date },
    endsAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const PromoCode = mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
