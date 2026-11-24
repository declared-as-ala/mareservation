import mongoose, { Schema, Document, Types } from 'mongoose';

export type PartnerApplicationStatus = 'new' | 'in_review' | 'contacted' | 'closed';

export interface IPartnerApplication extends Document {
  establishmentName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  message?: string;
  status: PartnerApplicationStatus;
  /** Admin decision (Demandes d'adhésion). Absent on applications not yet decided. */
  decision?: 'approved' | 'rejected';
  decisionNote?: string;
  decidedAt?: Date;
  decidedBy?: Types.ObjectId;
  /** Owner account / draft maison created on approval. */
  ownerId?: Types.ObjectId;
  venueId?: Types.ObjectId;
  adminNotes?: string;
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
    decision: { type: String, enum: ['approved', 'rejected'] },
    decisionNote: { type: String, trim: true, maxlength: 1000 },
    decidedAt: { type: Date },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue' },
    adminNotes: { type: String, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

PartnerApplicationSchema.index({ status: 1, createdAt: -1 });

export const PartnerApplication = mongoose.model<IPartnerApplication>(
  'PartnerApplication',
  PartnerApplicationSchema
);
