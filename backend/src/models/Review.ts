import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface IReviewOwnerReply {
  text: string;
  repliedAt: Date;
  repliedBy: Types.ObjectId;
}

export interface IReview extends Document {
  venueId: Types.ObjectId;
  userId: Types.ObjectId;
  reservationId?: Types.ObjectId;
  rating: number;        // 1-5
  ratingCleanliness?: number;
  ratingService?: number;
  ratingLocation?: number;
  ratingValue?: number;
  title?: string;
  comment: string;
  photos: string[];
  language?: string;
  isVerified: boolean;   // came from a CONFIRMED reservation
  helpfulCount: number;
  ownerReply?: IReviewOwnerReply;
  moderationStatus: ReviewModerationStatus;
  moderatedAt?: Date;
  moderatedBy?: Types.ObjectId;
  moderationReason?: string;
  flagCount: number;
  flagReasons: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    ratingCleanliness: { type: Number, min: 1, max: 5 },
    ratingService: { type: Number, min: 1, max: 5 },
    ratingLocation: { type: Number, min: 1, max: 5 },
    ratingValue: { type: Number, min: 1, max: 5 },
    title: { type: String, maxlength: 200 },
    comment: { type: String, required: true, maxlength: 4000 },
    photos: { type: [String], default: [] },
    language: { type: String, default: 'fr' },
    isVerified: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    ownerReply: {
      text: { type: String, maxlength: 2000 },
      repliedAt: { type: Date },
      repliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'flagged'], default: 'pending', index: true },
    moderatedAt: { type: Date },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderationReason: { type: String },
    flagCount: { type: Number, default: 0 },
    flagReasons: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Prevent duplicate reviews from same user for same reservation
ReviewSchema.index({ userId: 1, reservationId: 1 }, { unique: true, sparse: true });
ReviewSchema.index({ venueId: 1, moderationStatus: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
