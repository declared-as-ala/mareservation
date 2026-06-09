import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED'
  // Lowercase variants used by hotel/event/owner flows
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'checked_in'
  | 'no_show';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export type BookingType = 'TABLE' | 'ROOM' | 'SEAT' | 'COWORKING';

export type PaymentOption = 'online' | 'on_arrival' | 'partial' | 'deposit' | 'pay_at_hotel';

export type CheckInStatus = 'pending' | 'not_checked_in' | 'checked_in' | 'no_show';
export type ReservationExtraUnit = 'once' | 'per_night' | 'per_person';

export interface IReservationExtraItem {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit: ReservationExtraUnit;
}

export interface IReservationPriceBreakdown {
  subtotal?: number;
  taxes?: number;
  discount?: number;
  serviceFee?: number;
  extrasTotal?: number;
  total?: number;
  currency?: string;
}

/** Extra runtime fields persisted on reservations by the various owner/checkout flows. */
export interface IReservationExtra {
  // Identifiers
  reservationCode?: string;
  // Guest / customer contact (legacy: guest*, newer: customer*)
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  // Pricing
  amountPaid?: number;
  remainingAmount?: number;
  paymentOption?: PaymentOption;
  paymentMethod?: string;
  // Reservable unit / catalog
  reservableUnitId?: Types.ObjectId | string;
  reservableType?: 'table' | 'room' | 'seat' | 'ticket';
  orderType?: 'standard' | 'with_menu' | 'event_ticket';
  peopleCount?: number;
  adults?: number;
  children?: number;
  childrenAges?: number[];
  roomsCount?: number;
  // Check-in lifecycle
  checkInStatus?: CheckInStatus;
  checkedInAt?: Date;
  checkedInBy?: Types.ObjectId | string;
  // Stay timing
  reservationDate?: Date;
  nights?: number;
  guestCountry?: string;
  guestCity?: string;
  idNumber?: string;
  nationality?: string;
  dateOfBirth?: Date;
  arrivalTime?: string;
  specialRequest?: string;
  needBabyBed?: boolean;
  needExtraBed?: boolean;
  accessibilityRequest?: string;
  acceptedHotelPolicy?: boolean;
  acceptedPlatformTerms?: boolean;
  extras?: IReservationExtraItem[];
  extrasTotal?: number;
  priceBreakdown?: IReservationPriceBreakdown;
  cancellationDeadline?: Date;
  holdId?: Types.ObjectId | string;
  // QR + reminders + reviews
  qrCodeData?: string;
  qrCodeImageUrl?: string;
  reminderEmailSentAt?: Date;
  reviewRequestSentAt?: Date;
}

export interface IReservation extends Document, IReservationExtra {
  userId: Types.ObjectId;
  venueId: Types.ObjectId;
  eventId?: Types.ObjectId;
  bookingType: BookingType;
  tableId?: Types.ObjectId;
  roomId?: Types.ObjectId;
  seatId?: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  confirmationCode: string;
  totalPrice: number;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  partySize?: number;
  notes?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    bookingType: { type: String, enum: ['TABLE', 'ROOM', 'SEAT', 'COWORKING'], required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    seatId: { type: Schema.Types.ObjectId, ref: 'Seat' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED',
        'pending', 'confirmed', 'cancelled', 'completed', 'checked_in', 'no_show',
      ],
      default: 'CONFIRMED',
    },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'], default: 'unpaid' },
    confirmationCode: { type: String, required: true, unique: true },
    totalPrice: { type: Number, required: true, default: 0 },
    guestFirstName: { type: String },
    guestLastName: { type: String },
    guestPhone: { type: String },
    partySize: { type: Number },
    notes: { type: String },
    source: { type: String, default: 'web' },

    // ── Extras used by hotel/event/owner flows ──
    reservationCode: { type: String, index: true },
    customerFirstName: { type: String },
    customerLastName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    amountPaid: { type: Number },
    remainingAmount: { type: Number },
    paymentOption: { type: String, enum: ['online', 'on_arrival', 'partial', 'deposit', 'pay_at_hotel'] },
    paymentMethod: { type: String },
    reservableUnitId: { type: Schema.Types.ObjectId, ref: 'ReservableUnit' },
    reservableType: { type: String, enum: ['table', 'room', 'seat', 'ticket'] },
    orderType: { type: String, enum: ['standard', 'with_menu', 'event_ticket'] },
    peopleCount: { type: Number },
    adults: { type: Number },
    children: { type: Number },
    childrenAges: { type: [Number], default: [] },
    roomsCount: { type: Number },
    checkInStatus: { type: String, enum: ['pending', 'not_checked_in', 'checked_in', 'no_show'], default: 'pending' },
    checkedInAt: { type: Date },
    checkedInBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reservationDate: { type: Date },
    nights: { type: Number },
    guestCountry: { type: String },
    guestCity: { type: String },
    idNumber: { type: String },
    nationality: { type: String },
    dateOfBirth: { type: Date },
    arrivalTime: { type: String },
    specialRequest: { type: String },
    needBabyBed: { type: Boolean, default: false },
    needExtraBed: { type: Boolean, default: false },
    accessibilityRequest: { type: String },
    acceptedHotelPolicy: { type: Boolean, default: false },
    acceptedPlatformTerms: { type: Boolean, default: false },
    extras: {
      type: [
        {
          key: { type: String, required: true },
          name: { type: String, required: true },
          unitPrice: { type: Number, required: true },
          quantity: { type: Number, default: 1 },
          unit: { type: String, enum: ['once', 'per_night', 'per_person'], default: 'once' },
        },
      ],
      default: [],
    },
    extrasTotal: { type: Number, default: 0 },
    priceBreakdown: {
      subtotal: { type: Number },
      taxes: { type: Number },
      discount: { type: Number },
      serviceFee: { type: Number },
      extrasTotal: { type: Number },
      total: { type: Number },
      currency: { type: String, default: 'TND' },
    },
    cancellationDeadline: { type: Date },
    holdId: { type: Schema.Types.ObjectId, ref: 'ReservationHold' },
    qrCodeData: { type: String },
    qrCodeImageUrl: { type: String },
    reminderEmailSentAt: { type: Date },
    reviewRequestSentAt: { type: Date },
  },
  { timestamps: true }
);

ReservationSchema.index({ tableId: 1, startAt: 1, endAt: 1 });
ReservationSchema.index({ roomId: 1, startAt: 1, endAt: 1 });
ReservationSchema.index({ seatId: 1, startAt: 1 });
ReservationSchema.index({ userId: 1, createdAt: -1 });
ReservationSchema.index({ venueId: 1, bookingType: 1, startAt: 1 });
export const Reservation = mongoose.model<IReservation>('Reservation', ReservationSchema);
