import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRoom extends Document {
  venueId: Types.ObjectId;
  name?: string;
  roomNumber: number;
  roomType: string;
  capacityAdults?: number;
  capacityChildren?: number;
  capacity: number;
  bedType?: string;
  pricePerNight: number;
  surface?: number;
  floor?: number;
  view?: string;
  description?: string;
  bathroomType?: string;
  amenities: string[];
  services?: string[];
  isActive: boolean;
  isReservable: boolean;
  isVip?: boolean;
  hasBalcony?: boolean;
  smokingAllowed?: boolean;
  minimumNights?: number;
  defaultStatus?: 'available' | 'reserved' | 'blocked';
  coverImage?: string;
  gallery: string[];
  hasVirtualTour?: boolean;
  virtualTourUrl?: string;
  panoramicImages?: string[];
}

const RoomSchema = new Schema<IRoom>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    name: { type: String },
    roomNumber: { type: Number, required: true },
    roomType: { type: String, required: true },
    capacityAdults: { type: Number },
    capacityChildren: { type: Number },
    capacity: { type: Number, required: true, min: 1 },
    bedType: { type: String },
    pricePerNight: { type: Number, required: true },
    surface: { type: Number, min: 0 },
    floor: { type: Number },
    view: { type: String },
    description: { type: String },
    bathroomType: { type: String },
    amenities: { type: [String], default: [] },
    services: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isReservable: { type: Boolean, default: true },
    isVip: { type: Boolean, default: false },
    hasBalcony: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    minimumNights: { type: Number, min: 1, default: 1 },
    defaultStatus: {
      type: String,
      enum: ['available', 'reserved', 'blocked'],
      default: 'available',
    },
    coverImage: { type: String },
    gallery: { type: [String], default: [] },
    hasVirtualTour: { type: Boolean, default: false },
    virtualTourUrl: { type: String },
    panoramicImages: { type: [String], default: [] },
  },
  { timestamps: false }
);

RoomSchema.index({ venueId: 1, roomNumber: 1 }, { unique: true });

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
