import mongoose, { Schema, Document, Types } from 'mongoose';

export type EventReservationMode = 'table' | 'seat_zone' | 'seat' | 'ticket' | 'ticket_only';
export type EventApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'changes_requested' | 'suspended';

export interface IEventTicketType {
  _id?: Types.ObjectId;
  name: string;
  price: number;
  capacity: number;
  sold?: number;
  salesStartAt?: Date;
  salesEndAt?: Date;
  maxPerOrder?: number;
  isActive?: boolean;
}

export interface IEvent extends Document {
  venueId: Types.ObjectId;
  title: string;
  slug: string;
  type: string;
  description: string;
  coverImage?: string;
  afficheImageUrl?: string;
  galleryUrls?: string[];
  startAt: Date;
  endsAt?: Date;
  isPublished: boolean;
  reservationMode: EventReservationMode;
  approvalStatus?: EventApprovalStatus;
  ticketTypes?: IEventTicketType[];
  ageRestriction?: string;
  termsFr?: string;
  adminNote?: string;
  rejectionReason?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  organizerName?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    title: { type: String, required: true },
    slug: { type: String },
    type: {
      type: String,
      enum: [
        'DJ', 'CHANTEUR', 'CONCERT', 'SOIREE', 'CINEMA', 'STANDUP', 'SPORT', 'SPORTS', 'PRIVATE_EVENT', 'CINEMA_SESSION', 'MATCH',
        'concert', 'festival', 'standup', 'sport', 'sports', 'private_event', 'cinema_session', 'other',
      ],
      default: 'CONCERT',
    },
    description: { type: String, default: '' },
    coverImage: { type: String },
    afficheImageUrl: { type: String },
    galleryUrls: { type: [String], default: [] },
    startAt: { type: Date, required: true },
    endsAt: { type: Date },
    isPublished: { type: Boolean, default: true },
    reservationMode: { type: String, enum: ['table', 'seat_zone', 'seat', 'ticket', 'ticket_only'], default: 'table' },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'changes_requested', 'suspended'],
      default: 'approved',
      index: true,
    },
    ticketTypes: {
      type: [
        {
          name: { type: String, required: true },
          price: { type: Number, default: 0 },
          capacity: { type: Number, default: 0 },
          sold: { type: Number, default: 0 },
          salesStartAt: { type: Date },
          salesEndAt: { type: Date },
          maxPerOrder: { type: Number, default: 10 },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    ageRestriction: { type: String },
    termsFr: { type: String },
    adminNote: { type: String },
    rejectionReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organizerName: { type: String },
    status: { type: String, default: 'scheduled' },
  },
  { timestamps: true }
);

EventSchema.index({ venueId: 1 });
EventSchema.index({ startAt: 1 });
EventSchema.index({ slug: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
