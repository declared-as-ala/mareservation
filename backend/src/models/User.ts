import mongoose, { Schema, Document } from 'mongoose';
import type { OwnerServiceDomain } from '../utils/service-domain';

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'ESTABLISHMENT_OWNER' | 'ORGANIZER' | 'VENUE_OWNER';

export interface IUser extends Document {
  fullName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  serviceDomains?: OwnerServiceDomain[];
  emailVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['CUSTOMER', 'ADMIN', 'ESTABLISHMENT_OWNER', 'ORGANIZER', 'VENUE_OWNER'],
      default: 'CUSTOMER',
    },
    serviceDomains: {
      type: [String],
      enum: ['HOTEL', 'EVENT', 'COWORKING', 'CAFE_LOUNGE', 'RESTAURANT', 'CINEMA', 'EVENT_SPACE'],
      default: [],
    },
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
