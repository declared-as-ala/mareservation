import mongoose, { Schema, Document, Types } from 'mongoose';

export type PositionType = 'yaw_pitch' | 'matterport_anchor';

export interface IVector3 {
  x: number;
  y: number;
  z: number;
}

export interface TablePlacementDocument extends Document {
  venueId: Types.ObjectId;
  tableId?: Types.ObjectId;
  reservableUnitId?: Types.ObjectId;
  virtualTourId?: Types.ObjectId;
  sceneId: string;
  floorIndex?: number;
  positionType: PositionType;
  yaw?: number;
  pitch?: number;
  anchorPosition?: IVector3;
  stemVector?: IVector3;
  createdAt: Date;
  updatedAt: Date;
}

const Vector3Schema = new Schema({ x: Number, y: Number, z: Number }, { _id: false });

const tablePlacementSchema = new Schema<TablePlacementDocument>(
  {
    venueId: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
      index: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      index: true,
    },
    reservableUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'ReservableUnit',
      index: true,
    },
    virtualTourId: {
      type: Schema.Types.ObjectId,
      ref: 'VirtualTour',
      index: true,
    },
    sceneId: {
      type: String,
      required: true,
      trim: true,
    },
    floorIndex: { type: Number },
    positionType: {
      type: String,
      enum: ['yaw_pitch', 'matterport_anchor'],
      default: 'yaw_pitch',
    },
    yaw: { type: Number },
    pitch: { type: Number },
    anchorPosition: { type: Vector3Schema },
    stemVector: { type: Vector3Schema },
  },
  {
    timestamps: true,
  }
);

tablePlacementSchema.pre('validate', function (next) {
  const hasTable = !!this.tableId;
  const hasUnit = !!this.reservableUnitId;
  if ((hasTable && hasUnit) || (!hasTable && !hasUnit)) {
    return next(new Error('Exactly one of tableId or reservableUnitId is required.'));
  }
  next();
});

tablePlacementSchema.index(
  { venueId: 1, virtualTourId: 1, sceneId: 1, tableId: 1 },
  { unique: true, partialFilterExpression: { tableId: { $exists: true } } }
);
tablePlacementSchema.index(
  { venueId: 1, virtualTourId: 1, sceneId: 1, reservableUnitId: 1 },
  { unique: true, partialFilterExpression: { reservableUnitId: { $exists: true } } }
);

export const TablePlacement =
  mongoose.models.TablePlacement ||
  mongoose.model<TablePlacementDocument>('TablePlacement', tablePlacementSchema);

