/**
 * Booking engine — the ONE place where availability rules live.
 *
 * Used by: public calendar / quote / booking requests, the hold + confirm checkout,
 * owner & admin calendars and block creation.
 *
 * Conventions
 *  - A stay is [checkIn, checkOut): check-in night inclusive, check-out day EXCLUSIVE, so a guest
 *    may arrive on the day another guest leaves.
 *  - Dates travel as `YYYY-MM-DD`; a night is the UTC-midnight Date of that calendar day.
 *  - "Today" is computed in the property's own time zone (Venue.timezone, default Africa/Tunis).
 *  - Pending requests, active (unexpired) holds and manual blocks all consume inventory;
 *    cancelled / rejected / expired reservations never do.
 *  - Critical sections run under withBookingLock (per-venue mutex + Mongo transaction).
 */
import crypto from 'crypto';
import mongoose, { type ClientSession, type Types } from 'mongoose';
import { Reservation } from '../models/Reservation';
import { ReservationHold } from '../models/ReservationHold';
import { RoomBlock } from '../models/RoomBlock';
import { Room } from '../models/Room';
import { generateConfirmationCode } from '../utils/confirmationCode';
import { withBookingLock } from '../utils/bookingLock';
import { publishAvailabilityEvent } from './availabilityEvents';

export const DEFAULT_TZ = 'Africa/Tunis';
export const MAX_STAY_NIGHTS = 30;
export const MAX_CALENDAR_DAYS = 190;
export const MAX_GUESTS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Statuses that occupy inventory. */
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in', 'PENDING', 'CONFIRMED'];
const PENDING_STATUSES = ['pending', 'PENDING'];

export type NightStatus = 'available' | 'reserved' | 'pending' | 'blocked' | 'past';
export type DayStatus = NightStatus | 'unconfigured';

/* ───────────────────────── dates ───────────────────────── */

export function todayInZone(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === value ? d : null; // rejects 2026-02-31
}

export const toDay = (d: Date): string => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY_MS);
export const nightsBetween = (a: Date, b: Date): number => Math.round((b.getTime() - a.getTime()) / DAY_MS);

export type StayDates =
  | { ok: true; start: Date; end: Date; nights: number }
  | { ok: false; error: string; code: 'INVALID_DATES' | 'PAST_DATE' | 'END_BEFORE_START' | 'STAY_TOO_LONG' };

export function validateStayDates(checkIn: unknown, checkOut: unknown, tz: string = DEFAULT_TZ, now: Date = new Date()): StayDates {
  const start = parseDay(checkIn);
  const end = parseDay(checkOut);
  if (!start || !end) return { ok: false, code: 'INVALID_DATES', error: 'Dates invalides (format attendu : AAAA-MM-JJ).' };
  if (toDay(start) < todayInZone(tz, now)) return { ok: false, code: 'PAST_DATE', error: "La date d'arrivée est dans le passé." };
  if (end <= start) return { ok: false, code: 'END_BEFORE_START', error: "La date de départ doit être après la date d'arrivée." };
  const nights = nightsBetween(start, end);
  if (nights > MAX_STAY_NIGHTS) return { ok: false, code: 'STAY_TOO_LONG', error: `Séjour limité à ${MAX_STAY_NIGHTS} nuits.` };
  return { ok: true, start, end, nights };
}

/* ───────────────────────── conflicts (single source of truth) ───────────────────────── */

export type ConflictReason = 'reserved' | 'held' | 'blocked';

/** Is `roomId` free for [start, end)? Returns the reason it is not, or null. Pass `session` inside a lock. */
export async function roomConflict(
  roomId: string,
  venueId: string,
  start: Date,
  end: Date,
  excludeHoldId?: string,
  session?: ClientSession
): Promise<{ reason: ConflictReason } | null> {
  const reservation = await Reservation.findOne({
    roomId,
    status: { $in: ACTIVE_STATUSES },
    startAt: { $lt: end },
    endAt: { $gt: start },
  })
    .session(session ?? null)
    .lean();
  if (reservation) return { reason: PENDING_STATUSES.includes(String(reservation.status)) ? 'held' : 'reserved' };

  const holdFilter: Record<string, unknown> = {
    status: 'active',
    expiresAt: { $gt: new Date() },
    startsAt: { $lt: end },
    endsAt: { $gt: start },
    reservableUnitId: roomId,
  };
  if (excludeHoldId) holdFilter._id = { $ne: excludeHoldId };
  const hold = await ReservationHold.findOne(holdFilter).session(session ?? null).lean();
  if (hold) return { reason: 'held' };

  const block = await RoomBlock.findOne({
    isActive: true,
    startsAt: { $lt: end },
    endsAt: { $gt: start },
    $or: [
      { scope: 'room', roomId },
      { scope: 'venue', venueId },
    ],
  })
    .session(session ?? null)
    .lean();
  if (block) return { reason: 'blocked' };
  return null;
}


/** Do reservations / pending requests / active holds already occupy this range (whole venue or one room)? */
export async function inventoryConflict(
  venueId: unknown,
  scope: 'room' | 'venue',
  roomId: unknown,
  start: Date,
  end: Date,
  session?: ClientSession
): Promise<boolean> {
  const reservation: Record<string, unknown> = { venueId, status: { $in: ACTIVE_STATUSES }, startAt: { $lt: end }, endAt: { $gt: start } };
  const hold: Record<string, unknown> = { venueId, status: 'active', expiresAt: { $gt: new Date() }, startsAt: { $lt: end }, endsAt: { $gt: start } };
  if (scope === 'room' && roomId) {
    reservation.roomId = roomId;
    hold.reservableUnitId = roomId;
  }
  if (await Reservation.findOne(reservation).session(session ?? null).lean()) return true;
  return !!(await ReservationHold.findOne(hold).session(session ?? null).lean());
}

/* ───────────────────────── inventory & calendar ───────────────────────── */

export interface RentableRoom {
  id: string;
  name: string;
  capacity: number;
  capacityAdults?: number;
  pricePerNight: number;
  minimumNights: number;
}

export async function loadRentableRooms(venueId: string | Types.ObjectId): Promise<RentableRoom[]> {
  const rooms = await Room.find({ venueId, isActive: true, isReservable: true }).sort({ roomNumber: 1 }).lean();
  return rooms.map((r: any) => ({
    id: String(r._id),
    name: r.name || `Chambre ${r.roomNumber}`,
    capacity: r.capacity ?? r.capacityAdults ?? 2,
    capacityAdults: r.capacityAdults,
    pricePerNight: Number(r.pricePerNight) || 0,
    minimumNights: r.minimumNights ?? 1,
  }));
}

export interface CalendarDay {
  status: DayStatus;
  availableRooms: number;
  rooms: Record<string, NightStatus>;
}

export interface CalendarResult {
  from: string;
  to: string;
  today: string;
  timezone: string;
  rooms: RentableRoom[];
  days: Record<string, CalendarDay>;
}

/** Per-night, per-room availability for [from, to] (both inclusive days). */
export async function buildCalendar(venueId: string, from: string, to: string, tz: string = DEFAULT_TZ, now: Date = new Date()): Promise<CalendarResult> {
  const start = parseDay(from);
  const endDay = parseDay(to);
  if (!start || !endDay || endDay < start) throw new Error('INVALID_RANGE');
  if (nightsBetween(start, endDay) + 1 > MAX_CALENDAR_DAYS) throw new Error('RANGE_TOO_LARGE');
  const endExclusive = addDays(endDay, 1);

  const rooms = await loadRentableRooms(venueId);
  const roomIds = rooms.map((r) => r.id);
  const today = todayInZone(tz, now);

  const [reservations, holds, blocks] = rooms.length
    ? await Promise.all([
        Reservation.find({ roomId: { $in: roomIds }, status: { $in: ACTIVE_STATUSES }, startAt: { $lt: endExclusive }, endAt: { $gt: start } })
          .select('roomId startAt endAt status')
          .lean(),
        ReservationHold.find({ reservableUnitId: { $in: roomIds }, status: 'active', expiresAt: { $gt: now }, startsAt: { $lt: endExclusive }, endsAt: { $gt: start } })
          .select('reservableUnitId startsAt endsAt')
          .lean(),
        RoomBlock.find({
          isActive: true,
          startsAt: { $lt: endExclusive },
          endsAt: { $gt: start },
          $or: [{ scope: 'room', roomId: { $in: roomIds } }, { scope: 'venue', venueId }],
        })
          .select('roomId scope startsAt endsAt')
          .lean(),
      ])
    : [[], [], []];

  const days: Record<string, CalendarDay> = {};
  for (let d = start; d < endExclusive; d = addDays(d, 1)) {
    const key = toDay(d);
    const nightEnd = addDays(d, 1);
    const overlaps = (s: Date, e: Date) => s < nightEnd && e > d;
    const perRoom: Record<string, NightStatus> = {};
    let available = 0;
    let anyPending = false;
    let anyReserved = false;

    for (const room of rooms) {
      let st: NightStatus = 'available';
      if (key < today) st = 'past';
      else if ((reservations as any[]).some((r) => String(r.roomId) === room.id && !PENDING_STATUSES.includes(String(r.status)) && overlaps(r.startAt, r.endAt))) st = 'reserved';
      else if ((blocks as any[]).some((b) => (b.scope === 'venue' || String(b.roomId) === room.id) && overlaps(b.startsAt, b.endsAt))) st = 'blocked';
      else if (
        (reservations as any[]).some((r) => String(r.roomId) === room.id && PENDING_STATUSES.includes(String(r.status)) && overlaps(r.startAt, r.endAt)) ||
        (holds as any[]).some((h) => String(h.reservableUnitId) === room.id && overlaps(h.startsAt, h.endsAt))
      )
        st = 'pending';
      perRoom[room.id] = st;
      if (st === 'available') available += 1;
      if (st === 'pending') anyPending = true;
      if (st === 'reserved') anyReserved = true;
    }

    let status: DayStatus;
    if (!rooms.length) status = key < today ? 'past' : 'unconfigured';
    else if (key < today) status = 'past';
    else if (available > 0) status = 'available';
    else if (anyPending) status = 'pending';
    else if (anyReserved) status = 'reserved';
    else status = 'blocked';

    days[key] = { status, availableRooms: available, rooms: perRoom };
  }

  return { from, to, today, timezone: tz, rooms, days };
}

/* ───────────────────────── quote ───────────────────────── */

export interface StayInput {
  checkIn: unknown;
  checkOut: unknown;
  adults: unknown;
  children?: unknown;
  roomId?: unknown;
}

export type QuoteResult =
  | {
      ok: true;
      available: true;
      room: { id: string; name: string };
      checkIn: string;
      checkOut: string;
      nights: number;
      adults: number;
      children: number;
      pricePerNight: number | null;
      total: number | null;
      currency: 'TND';
    }
  | { ok: true; available: false; reason: string; message: string; nights: number }
  | { ok: false; code: string; error: string };

const asInt = (v: unknown, def: number): number => {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

export async function quoteStay(
  venue: { _id: unknown; timezone?: string },
  input: StayInput,
  opts: { now?: Date; session?: ClientSession } = {}
): Promise<QuoteResult> {
  const tz = venue.timezone || DEFAULT_TZ;
  const dates = validateStayDates(input.checkIn, input.checkOut, tz, opts.now);
  if (!dates.ok) return { ok: false, code: dates.code, error: dates.error };

  const adults = asInt(input.adults, 2);
  const children = asInt(input.children, 0);
  if (!Number.isInteger(adults) || adults < 1 || adults > MAX_GUESTS || !Number.isInteger(children) || children < 0 || children > MAX_GUESTS) {
    return { ok: false, code: 'INVALID_GUESTS', error: 'Nombre de voyageurs invalide.' };
  }
  const guests = adults + children;

  const venueId = String(venue._id);
  let rooms = await loadRentableRooms(venueId);
  if (!rooms.length) {
    return { ok: true, available: false, reason: 'NOT_CONFIGURED', message: "Les disponibilités de cette maison ne sont pas encore configurées.", nights: dates.nights };
  }
  if (input.roomId) {
    rooms = rooms.filter((r) => r.id === String(input.roomId));
    if (!rooms.length) return { ok: false, code: 'ROOM_NOT_FOUND', error: 'Hébergement introuvable.' };
  }

  const fitting = rooms.filter((r) => guests <= r.capacity && (r.capacityAdults == null || adults <= r.capacityAdults));
  if (!fitting.length) return { ok: true, available: false, reason: 'CAPACITY', message: 'Aucun hébergement ne peut accueillir ce nombre de voyageurs.', nights: dates.nights };
  const longEnough = fitting.filter((r) => dates.nights >= r.minimumNights);
  if (!longEnough.length) {
    const min = Math.min(...fitting.map((r) => r.minimumNights));
    return { ok: true, available: false, reason: 'MIN_NIGHTS', message: `Séjour minimum : ${min} nuit${min > 1 ? 's' : ''}.`, nights: dates.nights };
  }

  const free: RentableRoom[] = [];
  for (const room of longEnough) {
    const conflict = await roomConflict(room.id, venueId, dates.start, dates.end, undefined, opts.session);
    if (!conflict) free.push(room);
  }
  if (!free.length) {
    return { ok: true, available: false, reason: 'UNAVAILABLE', message: "Ces dates ne sont plus disponibles.", nights: dates.nights };
  }

  // Cheapest free room (price 0 = not configured, sorted last).
  free.sort((a, b) => (a.pricePerNight || Infinity) - (b.pricePerNight || Infinity));
  const room = free[0];
  const priced = room.pricePerNight > 0;
  return {
    ok: true,
    available: true,
    room: { id: room.id, name: room.name },
    checkIn: toDay(dates.start),
    checkOut: toDay(dates.end),
    nights: dates.nights,
    adults,
    children,
    pricePerNight: priced ? room.pricePerNight : null,
    total: priced ? room.pricePerNight * dates.nights : null,
    currency: 'TND',
  };
}

/* ───────────────────────── status history ───────────────────────── */

export interface Actor {
  userId?: unknown;
  role?: string;
}

/** Mutates the document: appends history and sets the new status. Caller saves. */
export function pushStatus(reservation: any, to: string, actor: Actor, reason?: string): void {
  const from = String(reservation.status);
  reservation.statusHistory = [
    ...(reservation.statusHistory ?? []),
    { from, to, byUserId: actor.userId ?? undefined, byRole: actor.role, reason: reason?.slice(0, 500), at: new Date() },
  ];
  reservation.status = to;
}

export function requestTtlHours(): number {
  const n = Number(process.env.BOOKING_REQUEST_TTL_HOURS);
  return Number.isFinite(n) && n > 0 ? n : 48;
}

/* ───────────────────────── booking request ───────────────────────── */

export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export function tokenMatches(token: unknown, hash: unknown): boolean {
  if (typeof token !== 'string' || typeof hash !== 'string' || !token || !hash) return false;
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface RequestGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export type CreateRequestResult =
  | { ok: true; replay: boolean; reservation: any; accessToken?: string }
  | { ok: false; status: number; code: string; error: string };

export async function createBookingRequest(args: {
  venue: { _id: unknown; timezone?: string; name?: string };
  stay: StayInput;
  guest: RequestGuest;
  specialRequest?: string;
  idempotencyKey?: string;
  userId?: unknown;
  now?: Date;
}): Promise<CreateRequestResult> {
  const venueId = String(args.venue._id);
  const idemKey = args.idempotencyKey ? `${venueId}:${args.idempotencyKey}`.slice(0, 200) : undefined;
  const now = args.now ?? new Date();

  const outcome = await withBookingLock(`venue:${venueId}`, async (session) => {
    if (idemKey) {
      const existing = await Reservation.findOne({ idempotencyKey: idemKey }).session(session ?? null);
      if (existing) return { kind: 'replay' as const, reservation: existing };
    }

    const quote = await quoteStay(args.venue, args.stay, { now, session });
    if (!quote.ok) return { kind: 'error' as const, status: 400, code: quote.code, error: quote.error };
    if (!quote.available) {
      return { kind: 'error' as const, status: quote.reason === 'UNAVAILABLE' ? 409 : 422, code: quote.reason, error: quote.message };
    }

    const start = parseDay(quote.checkIn)!;
    const end = parseDay(quote.checkOut)!;
    const token = crypto.randomBytes(24).toString('hex');
    const reservationCode = `EX-${now.getUTCFullYear()}-${generateConfirmationCode(6)}`;
    const expiresAt = new Date(now.getTime() + requestTtlHours() * 60 * 60 * 1000);

    const [created] = await Reservation.create(
      [
        {
          userId: args.userId || undefined,
          venueId: args.venue._id,
          roomId: quote.room.id,
          bookingType: 'ROOM',
          reservableType: 'room',
          startAt: start,
          endAt: end,
          reservationDate: start,
          nights: quote.nights,
          adults: quote.adults,
          children: quote.children,
          partySize: quote.adults + quote.children,
          peopleCount: quote.adults + quote.children,
          roomsCount: 1,
          guestFirstName: args.guest.firstName,
          guestLastName: args.guest.lastName,
          guestPhone: args.guest.phone,
          customerFirstName: args.guest.firstName,
          customerLastName: args.guest.lastName,
          customerEmail: args.guest.email,
          customerPhone: args.guest.phone,
          specialRequest: args.specialRequest || undefined,
          totalPrice: quote.total ?? 0,
          priceBreakdown: quote.total != null ? { subtotal: quote.total, taxes: 0, discount: 0, extrasTotal: 0, total: quote.total, currency: 'TND' } : undefined,
          paymentOption: 'pay_at_hotel',
          paymentStatus: 'unpaid',
          status: 'pending',
          source: 'web-request',
          reservationCode,
          confirmationCode: generateConfirmationCode(8),
          accessTokenHash: hashToken(token),
          idempotencyKey: idemKey,
          expiresAt,
          statusHistory: [{ to: 'pending', byRole: 'CUSTOMER', reason: 'Demande de réservation', at: now }],
        },
      ],
      { session }
    );
    return { kind: 'created' as const, reservation: created, token };
  });

  if (outcome.kind === 'error') return { ok: false, status: outcome.status, code: outcome.code, error: outcome.error };
  if (outcome.kind === 'replay') return { ok: true, replay: true, reservation: outcome.reservation };
  publishAvailabilityEvent({ venueId, type: 'reservation_created', at: new Date().toISOString(), reservationId: String(outcome.reservation._id) });
  return { ok: true, replay: false, reservation: outcome.reservation, accessToken: outcome.token };
}

/* ───────────────────────── expiry ───────────────────────── */

/** Pending requests past their TTL stop blocking inventory. Returns how many were expired. */
export async function expirePendingRequests(now: Date = new Date()): Promise<number> {
  const stale = await Reservation.find({ status: { $in: PENDING_STATUSES }, expiresAt: { $lt: now } });
  for (const r of stale) {
    pushStatus(r, 'expired', { role: 'SYSTEM' }, "Délai de réponse dépassé");
    (r as any).expiresAt = undefined;
    await r.save();
    publishAvailabilityEvent({ venueId: String(r.venueId), type: 'reservation_cancelled', at: now.toISOString(), reservationId: String(r._id) });
  }
  return stale.length;
}

/* ───────────────────────── management (owner / admin) ───────────────────────── */

const MANAGED_STATUSES = [...ACTIVE_STATUSES];

/** Calendar + the actual reservations and blocks behind each coloured night. */
export async function buildManagementCalendar(venueId: string, from: string, to: string, tz: string = DEFAULT_TZ, now: Date = new Date()) {
  const calendar = await buildCalendar(venueId, from, to, tz, now);
  const start = parseDay(from)!;
  const endExclusive = addDays(parseDay(to)!, 1);

  const [reservations, blocks] = await Promise.all([
    Reservation.find({ venueId, bookingType: 'ROOM', status: { $in: MANAGED_STATUSES }, startAt: { $lt: endExclusive }, endAt: { $gt: start } })
      .populate('roomId', 'name roomNumber')
      .sort({ startAt: 1 })
      .lean(),
    RoomBlock.find({ venueId, isActive: true, startsAt: { $lt: endExclusive }, endsAt: { $gt: start } })
      .populate('createdBy', 'fullName email')
      .sort({ startsAt: 1 })
      .lean(),
  ]);

  return {
    ...calendar,
    reservations: (reservations as any[]).map((r) => ({
      id: String(r._id),
      reference: r.reservationCode ?? r.confirmationCode,
      roomId: r.roomId ? String(r.roomId._id ?? r.roomId) : null,
      roomName: r.roomId?.name || (r.roomId?.roomNumber ? `Chambre ${r.roomId.roomNumber}` : null),
      checkIn: toDay(new Date(r.startAt)),
      checkOut: toDay(new Date(r.endAt)),
      nights: r.nights ?? nightsBetween(new Date(r.startAt), new Date(r.endAt)),
      status: r.status,
      guestName: [r.customerFirstName ?? r.guestFirstName, r.customerLastName ?? r.guestLastName].filter(Boolean).join(' '),
      phone: r.customerPhone ?? r.guestPhone,
      email: r.customerEmail,
      adults: r.adults,
      children: r.children,
      total: r.totalPrice > 0 ? r.totalPrice : null,
      source: r.source,
      specialRequest: r.specialRequest,
      createdAt: r.createdAt,
    })),
    blocks: (blocks as any[]).map((b) => ({
      id: String(b._id),
      roomId: b.roomId ? String(b.roomId) : null,
      scope: b.scope,
      from: toDay(new Date(b.startsAt)),
      to: toDay(new Date(b.endsAt)),
      reason: b.reason,
      note: b.note,
      createdByName: b.createdBy?.fullName ?? b.createdBy?.email ?? null,
      createdByRole: b.createdByRole,
      createdAt: b.createdAt,
    })),
  };
}

export interface BookingSummary {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  rejected: number;
  expired: number;
  upcomingCheckIns: number;
  upcomingCheckOuts: number;
  occupancyRate: number | null;
  window: { from: string; to: string };
}

/** Counts + occupancy over a window. `venueIds` undefined = every accommodation (admin). */
export async function bookingSummary(opts: { venueIds?: unknown[]; from?: string; to?: string; tz?: string; now?: Date } = {}): Promise<BookingSummary> {
  const now = opts.now ?? new Date();
  const tz = opts.tz ?? DEFAULT_TZ;
  const today = parseDay(todayInZone(tz, now))!;
  const from = parseDay(opts.from) ?? today;
  const to = parseDay(opts.to) ?? addDays(from, 29);
  const toExclusive = addDays(to, 1);
  const scope: Record<string, unknown> = { bookingType: 'ROOM' };
  if (opts.venueIds) scope.venueId = { $in: opts.venueIds };

  const byStatus = await Reservation.aggregate([{ $match: scope }, { $group: { _id: { $toLower: '$status' }, n: { $sum: 1 } } }]);
  const count = (k: string) => byStatus.find((x: any) => x._id === k)?.n ?? 0;
  const total = byStatus.reduce((a: number, x: any) => a + x.n, 0);

  const week = addDays(today, 7);
  const [upcomingCheckIns, upcomingCheckOuts, occupied, roomCount] = await Promise.all([
    Reservation.countDocuments({ ...scope, status: { $in: ['pending', 'confirmed', 'PENDING', 'CONFIRMED'] }, startAt: { $gte: today, $lt: week } }),
    Reservation.countDocuments({ ...scope, status: { $in: ['confirmed', 'checked_in', 'CONFIRMED'] }, endAt: { $gte: today, $lt: week } }),
    Reservation.find({ ...scope, status: { $in: ['confirmed', 'checked_in', 'completed', 'CONFIRMED', 'COMPLETED'] }, startAt: { $lt: toExclusive }, endAt: { $gt: from } }).select('startAt endAt').lean(),
    Room.countDocuments({ ...(opts.venueIds ? { venueId: { $in: opts.venueIds } } : {}), isActive: true, isReservable: true }),
  ]);

  let bookedNights = 0;
  for (const r of occupied as any[]) {
    const s = Math.max(new Date(r.startAt).getTime(), from.getTime());
    const e = Math.min(new Date(r.endAt).getTime(), toExclusive.getTime());
    if (e > s) bookedNights += Math.round((e - s) / DAY_MS);
  }
  const capacityNights = roomCount * nightsBetween(from, toExclusive);

  return {
    total,
    pending: count('pending'),
    confirmed: count('confirmed') + count('checked_in'),
    cancelled: count('cancelled'),
    rejected: count('rejected'),
    expired: count('expired'),
    upcomingCheckIns,
    upcomingCheckOuts,
    occupancyRate: capacityNights > 0 ? Math.round((bookedNights / capacityNights) * 1000) / 10 : null,
    window: { from: toDay(from), to: toDay(to) },
  };
}

export { mongoose };
