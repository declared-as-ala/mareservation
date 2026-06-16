import mongoose, { Schema, Document } from 'mongoose';

export type PartnerApplicationStatus = 'new' | 'in_review' | 'contacted' | 'closed';

export interface IPartnerApplication extends Document {
  establishmentName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  message?: string;
  status: PartnerApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerApplicationSchema = new Schema<IPartnerApplication>(
  {
    establishmentName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'in_review', 'contacted', 'closed'],
      default: 'new',
    },
  },
  { timestamps: true }
);

PartnerApplicationSchema.index({ status: 1, createdAt: -1 });

export const PartnerApplication = mongoose.model<IPartnerApplication>(
  'PartnerApplication',
  PartnerApplicationSchema
);
