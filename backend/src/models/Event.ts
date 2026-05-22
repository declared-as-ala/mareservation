import mongoose, { Schema, Document, Types } from 'mongoose';

export type EventReservationMode = 'table' | 'seat_zone' | 'seat' | 'ticket';
export type EventType = 'concert' | 'standup' | 'cinema' | 'sport' | 'private' | 'festival' | 'other';
export type EventApprovalStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'cancelled';

export interface IEventTicketType {
  _id?: Types.ObjectId;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  salesStartAt?: Date;
  salesEndAt?: Date;
  maxPerOrder?: number;
  isActive: boolean;
}

export interface IEvent extends Document {
  venueId: Types.ObjectId;
  title: string;
  slug: string;
  type: EventType | string;
  description: string;
  shortDescriptionFr?: string;
  descriptionFr?: string;
  coverImage?: string;
  afficheImageUrl?: string;
  galleryUrls?: string[];
  categoryIds?: Types.ObjectId[];
  tagIds?: Types.ObjectId[];
  startAt: Date;
  endsAt?: Date;
  isPublished: boolean;
  isFeatured?: boolean;
  isVedette?: boolean;
  reservationMode: EventReservationMode;
  status: string;
  approvalStatus: EventApprovalStatus;
  adminNote?: string;
  rejectionReason?: string;
  ticketTypes: IEventTicketType[];
  ageRestriction?: string;
  termsFr?: string;
  organizerName?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventTicketTypeSchema = new Schema<IEventTicketType>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 0 },
    sold: { type: Number, default: 0, min: 0 },
    salesStartAt: { type: Date },
    salesEndAt: { type: Date },
    maxPerOrder: { type: Number, min: 1, default: 10 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const EventSchema = new Schema<IEvent>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    title: { type: String, required: true },
    slug: { type: String, sparse: true, unique: true },
    type: { type: String, enum: ['concert', 'standup', 'cinema', 'sport', 'private', 'festival', 'other', 'DJ', 'CHANTEUR', 'CONCERT', 'SOIREE', 'CINEMA', 'STANDUP', 'SPORTS', 'PRIVATE_EVENT', 'CINEMA_SESSION'], default: 'concert' },
    description: { type: String, default: '' },
    shortDescriptionFr: { type: String },
    descriptionFr: { type: String },
    coverImage: { type: String },
    afficheImageUrl: { type: String },
    galleryUrls: { type: [String], default: [] },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    tagIds: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    startAt: { type: Date, required: true },
    endsAt: { type: Date },
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isVedette: { type: Boolean, default: false },
    reservationMode: { type: String, enum: ['table', 'seat_zone', 'seat', 'ticket'], default: 'table' },
    status: { type: String, default: 'scheduled' },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'changes_requested', 'approved', 'rejected', 'cancelled'],
      default: 'draft',
      index: true,
    },
    adminNote: { type: String, maxlength: 1000 },
    rejectionReason: { type: String, maxlength: 1000 },
    ticketTypes: { type: [EventTicketTypeSchema], default: [] },
    ageRestriction: { type: String },
    termsFr: { type: String },
    organizerName: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EventSchema.index({ venueId: 1 });
EventSchema.index({ startAt: 1 });
EventSchema.index({ isPublished: 1, isFeatured: -1 });
EventSchema.index({ approvalStatus: 1, startAt: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
