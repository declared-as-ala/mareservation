import mongoose, { Document, Schema, Types } from 'mongoose';

export type TableBlockReason =
  | 'maintenance'
  | 'private_event'
  | 'staff_shortage'
  | 'holiday'
  | 'renovation'
  | 'owner_use'
  | 'other';

export interface ITableBlock extends Document {
  venueId: Types.ObjectId;
  tableId?: Types.ObjectId | null;
  zone?: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: TableBlockReason;
  note?: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
}

const TableBlockSchema = new Schema<ITableBlock>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null, index: true },
    zone: { type: String, default: null, trim: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    reason: {
      type: String,
      enum: ['maintenance', 'private_event', 'staff_shortage', 'holiday', 'renovation', 'owner_use', 'other'],
      required: true,
    },
    note: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

TableBlockSchema.index({ venueId: 1, tableId: 1, startsAt: 1, endsAt: 1, isActive: 1 });

export const TableBlock = mongoose.model<ITableBlock>('TableBlock', TableBlockSchema);

