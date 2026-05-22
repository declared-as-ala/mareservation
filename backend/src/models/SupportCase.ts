import mongoose, { Schema, Document, Types } from 'mongoose';

export type SupportCaseStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportCaseCategory = 'reservation' | 'payment' | 'venue' | 'account' | 'other';
export type SupportMessageSender = 'user' | 'owner' | 'admin';

export interface ISupportMessage {
  _id?: Types.ObjectId;
  sender: SupportMessageSender;
  senderId: Types.ObjectId;
  body: string;
  attachments?: string[];
  createdAt: Date;
}

export interface ISupportCase extends Document {
  caseNumber: string;
  subject: string;
  category: SupportCaseCategory;
  status: SupportCaseStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  userId: Types.ObjectId;
  venueId?: Types.ObjectId;
  reservationId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  messages: ISupportMessage[];
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    sender: { type: String, enum: ['user', 'owner', 'admin'], required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 5000 },
    attachments: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const SupportCaseSchema = new Schema<ISupportCase>(
  {
    caseNumber: { type: String, unique: true, sparse: true },
    subject: { type: String, required: true, maxlength: 200 },
    category: {
      type: String,
      enum: ['reservation', 'payment', 'venue', 'account', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue' },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    messages: { type: [SupportMessageSchema], default: [] },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

SupportCaseSchema.index({ userId: 1, status: 1, createdAt: -1 });
SupportCaseSchema.index({ status: 1, priority: -1, createdAt: -1 });
SupportCaseSchema.index({ caseNumber: 1 });

SupportCaseSchema.pre('save', function (next) {
  if (!this.caseNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    this.caseNumber = `CS-${ts}-${rand}`;
  }
  next();
});

export const SupportCase = mongoose.model<ISupportCase>('SupportCase', SupportCaseSchema);
