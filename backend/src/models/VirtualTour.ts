import mongoose, { Schema, Document, Types } from 'mongoose';

export type VirtualTourProvider = 'klapty' | 'pannellum' | 'video' | 'custom';
export type VirtualTourProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface IVirtualTour extends Document {
  venueId: Types.ObjectId;
  provider: VirtualTourProvider;
  sourceType?: string;
  embedUrl?: string;
  videoUrl?: string;
  videoOriginalUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  previewImage?: string;
  posterImageUrl?: string;
  aspectRatio?: number;
  width?: number;
  height?: number;
  isActive: boolean;
  isDefault?: boolean;
  is360?: boolean;
  processingStatus?: VirtualTourProcessingStatus;
}

const VirtualTourSchema = new Schema<IVirtualTour>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    provider: { type: String, enum: ['klapty', 'pannellum', 'video', 'custom'], required: true },
    sourceType: { type: String },
    embedUrl: { type: String },
    videoUrl: { type: String },
    videoOriginalUrl: { type: String },
    originalFilename: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    previewImage: { type: String },
    posterImageUrl: { type: String },
    aspectRatio: { type: Number },
    width: { type: Number },
    height: { type: Number },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    is360: { type: Boolean, default: false },
    processingStatus: { type: String, enum: ['pending', 'processing', 'ready', 'failed'], default: 'ready' },
  },
  { timestamps: true }
);

VirtualTourSchema.index({ venueId: 1 });
VirtualTourSchema.index({ venueId: 1, isActive: 1 });

export const VirtualTour = mongoose.model<IVirtualTour>('VirtualTour', VirtualTourSchema);
