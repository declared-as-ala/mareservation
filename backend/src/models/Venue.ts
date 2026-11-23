import mongoose, { Schema, Document, Types } from 'mongoose';

export type VenueType =
  | 'CAFE' | 'CAFE_LOUNGE' | 'RESTAURANT' | 'HOTEL' | 'MAISON_DHOTE' | 'CINEMA' | 'EVENT_SPACE' | 'COWORKING' | 'SPA'
  | 'BAR' | 'ROOFTOP' | 'BEACH_CLUB' | 'CLUB' | 'LOUNGE';
export type VenueApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'changes_requested' | 'suspended';
export type VenueImmersiveType = 'none' | 'virtual-tour' | 'view-360';
export type VenueImmersiveSourceType = 'upload' | 'embed' | 'klapty' | 'matterport' | null;

export interface IVenueComplianceDoc {
  url: string;
  label: string;
  uploadedAt?: Date;
}

export interface IVenue extends Document {
  ownerId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  name: string;
  slug: string;
  type: VenueType;
  shortDescription?: string;
  description: string;
  city: string;
  governorate?: string;
  address: string;
  phone?: string;
  coverImage?: string;
  gallery?: string[];
  categoryIds?: Types.ObjectId[];
  amenities?: string[];
  /** Official hotel star rating (1-5). Null/undefined for non-hotel venues or unrated. */
  stars?: number;
  rating: number;
  ratingCount?: number;
  startingPrice?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  commissionRate?: number;
  isPublished: boolean;
  /** Demonstration listing: visible, but NEVER bookable (enforced server-side). */
  isDemo?: boolean;
  /** IANA time zone of the property; "today" and past-date checks use it. */
  timezone?: string;
  /** GPS position — only ever set from real data (owner/admin map picker). Never inferred. */
  coordinates?: { lat?: number; lng?: number };
  /** Booking configuration (accommodations). */
  /** Super-admin switch: shown in the public catalogue (in addition to the PUBLIC_VENUE_SLUGS allowlist). */
  publicListed?: boolean;
  bookingEnabled?: boolean;          // super-admin switch: may this listing take bookings at all?
  bookingMode?: 'request' | 'instant';
  rentalMode?: 'rooms' | 'entire';
  entirePricePerNight?: number;
  cleaningFee?: number;
  serviceFee?: number;
  minimumNights?: number;
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  features?: string[];
  houseRules?: string[];
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
  cancellationNotes?: string;
  arrivalInstructions?: string;
  hostDisplayName?: string;
  hostBio?: string;
  isFeatured: boolean;
  isVedette?: boolean;
  activeEventTonight?: boolean;
  reservationModes?: string[];
  approvalStatus?: VenueApprovalStatus;
  rejectionReason?: string | null;
  adminNote?: string | null;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  submittedForReviewAt?: Date;
  archivedAt?: Date | null;
  checkInPolicy?: string;
  checkOutPolicy?: string;
  complianceDocs?: IVenueComplianceDoc[];
  hasVirtualTour?: boolean;
  immersiveType?: VenueImmersiveType;
  immersiveSourceType?: VenueImmersiveSourceType;
  immersiveProvider?: string | null;
  immersiveUrl?: string | null;
  immersiveFile?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const VenueSchema = new Schema<IVenue>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    type: { type: String, enum: ['CAFE', 'CAFE_LOUNGE', 'RESTAURANT', 'HOTEL', 'MAISON_DHOTE', 'CINEMA', 'EVENT_SPACE', 'COWORKING', 'SPA', 'BAR', 'ROOFTOP', 'BEACH_CLUB', 'CLUB', 'LOUNGE'], required: true },
    shortDescription: { type: String },
    description: { type: String, required: true },
    city: { type: String, required: true },
    governorate: { type: String },
    address: { type: String, required: true },
    phone: { type: String },
    coverImage: { type: String },
    gallery: { type: [String], default: [] },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    amenities: { type: [String], default: [] },
    stars: { type: Number, min: 1, max: 5 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    startingPrice: { type: Number, default: 0 },
    priceRangeMin: { type: Number },
    priceRangeMax: { type: Number },
    commissionRate: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false, index: true },
    timezone: { type: String, default: 'Africa/Tunis' },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    // No default: undefined = historical behaviour (real listing open, demo closed). See venueBookability().
    bookingEnabled: { type: Boolean },
    publicListed: { type: Boolean, default: false, index: true },
    bookingMode: { type: String, enum: ['request', 'instant'], default: 'request' },
    rentalMode: { type: String, enum: ['rooms', 'entire'], default: 'rooms' },
    entirePricePerNight: { type: Number, min: 0 },
    cleaningFee: { type: Number, min: 0, default: 0 },
    serviceFee: { type: Number, min: 0, default: 0 },
    minimumNights: { type: Number, min: 1, max: 30, default: 1 },
    maxGuests: { type: Number, min: 1, max: 50 },
    bedrooms: { type: Number, min: 0, max: 50 },
    beds: { type: Number, min: 0, max: 100 },
    bathrooms: { type: Number, min: 0, max: 50 },
    features: { type: [String], default: [] },
    houseRules: { type: [String], default: [] },
    cancellationPolicy: { type: String, enum: ['flexible', 'moderate', 'strict'], default: 'moderate' },
    cancellationNotes: { type: String, maxlength: 2000 },
    arrivalInstructions: { type: String, maxlength: 2000 },
    hostDisplayName: { type: String, maxlength: 120 },
    hostBio: { type: String, maxlength: 1500 },
    isFeatured: { type: Boolean, default: false },
    isVedette: { type: Boolean, default: false },
    activeEventTonight: { type: Boolean, default: false },
    reservationModes: { type: [String], default: [] },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'changes_requested', 'suspended'],
      default: 'approved',
      index: true,
    },
    rejectionReason: { type: String, default: null },
    adminNote: { type: String, default: null },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    submittedForReviewAt: { type: Date },
    archivedAt: { type: Date, default: null },
    checkInPolicy: { type: String },
    checkOutPolicy: { type: String },
    complianceDocs: {
      type: [
        {
          url: { type: String, required: true },
          label: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    hasVirtualTour: { type: Boolean, default: false },
    immersiveType: { type: String, enum: ['none', 'virtual-tour', 'view-360'], default: 'none' },
    immersiveSourceType: { type: String, enum: ['upload', 'embed', 'klapty', 'matterport', null], default: null },
    immersiveProvider: { type: String, default: null },
    immersiveUrl: { type: String, default: null },
    immersiveFile: { type: String, default: null },
  },
  { timestamps: true }
);

VenueSchema.index({ city: 1, type: 1 });
VenueSchema.index({ name: 'text', description: 'text', city: 'text' });
VenueSchema.index({ isPublished: 1, isFeatured: -1 });
VenueSchema.index({ ownerId: 1, type: 1 });

export const Venue = mongoose.model<IVenue>('Venue', VenueSchema);
