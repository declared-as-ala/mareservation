import mongoose, { Schema, Document, Types } from 'mongoose';

export type HotspotTargetType = 'table' | 'room' | 'seat_zone' | 'info' | 'scene';

export interface ITourHotspot extends Document {
  venueId?: Types.ObjectId;
  virtualTourId: Types.ObjectId;
  label: string;
  targetType: HotspotTargetType;
  targetId: Types.ObjectId;
  xPercent: number;
  yPercent: number;
  yaw?: number;
  pitch?: number;
  iconType?: string;
  tooltipText?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

const TourHotspotSchema = new Schema<ITourHotspot>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', index: true },
    virtualTourId: { type: Schema.Types.ObjectId, ref: 'VirtualTour', required: true },
    label: { type: String, required: true },
    targetType: { type: String, enum: ['table', 'room', 'seat_zone', 'info', 'scene'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    xPercent: { type: Number, required: true, min: 0, max: 100 },
    yPercent: { type: Number, required: true, min: 0, max: 100 },
    yaw: { type: Number },
    pitch: { type: Number },
    iconType: { type: String },
    tooltipText: { type: String },
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: false }
);

TourHotspotSchema.index({ virtualTourId: 1 });

export const TourHotspot = mongoose.model<ITourHotspot>('TourHotspot', TourHotspotSchema);
