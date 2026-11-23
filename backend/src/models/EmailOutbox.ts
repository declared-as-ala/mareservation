import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Transactional outbox for e-mails. A row is written once per (event, recipient) thanks to the
 * unique `key`, so retried booking requests never produce duplicate notifications. A worker
 * delivers queued rows with exponential back-off; a failed delivery never touches the booking.
 */
export type OutboxStatus = 'queued' | 'sending' | 'sent' | 'failed';

export interface IEmailOutbox extends Document {
  key: string;
  event: string;
  to: string;
  recipientRole: 'customer' | 'owner' | 'admin' | 'test' | 'account';
  subject: string;
  html: string;
  text: string;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  messageId?: string;
  sentAt?: Date;
  reservationId?: Types.ObjectId;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailOutboxSchema = new Schema<IEmailOutbox>(
  {
    key: { type: String, required: true, unique: true },
    event: { type: String, required: true, index: true },
    to: { type: String, required: true },
    recipientRole: { type: String, enum: ['customer', 'owner', 'admin', 'test', 'account'], required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    text: { type: String, required: true },
    status: { type: String, enum: ['queued', 'sending', 'sent', 'failed'], default: 'queued', index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 6 },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: { type: String, maxlength: 1000 },
    messageId: { type: String },
    sentAt: { type: Date },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', index: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
EmailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
EmailOutboxSchema.index({ createdAt: -1 });

export const EmailOutbox = mongoose.model<IEmailOutbox>('EmailOutbox', EmailOutboxSchema);
