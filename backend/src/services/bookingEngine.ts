/**
 * Booking engine — the ONE place where availability, pricing and lifecycle rules live.
 *
 * Used by: public calendar / quote / search / booking requests, the hold + confirm checkout,
 * owner & admin calendars, manual reservations and block creation.
 *
 * Conventions
 *  - A stay is [checkIn, checkOut): check-in night inclusive, check-out day EXCLUSIVE, so a guest
 *    may arrive on the day another guest leaves.
 *  - Dates travel as `YYYY-MM-DD`; a night is the UTC-midnight Date of that calendar day.
 *  - "Today" is computed in the property's own time zone (Venue.timezone, default Africa/Tunis).
 *  - Pending requests, active (unexpired) holds and manual blocks all consume inventory;
 *    cancelled / rejected / expired / completed / no-show reservations never do.
 *  - Inventory is either the venue's ROOMS (one booking may take several) or the ENTIRE property
 *    (one pseudo-unit, id `entire`). An entire-property booking conflicts with every room and
 *    vice-versa, so switching mode can never double-book.
 *  - Prices are always computed here, server-side. The client total is never trusted.
 *  - Critical sections run under withBookingLock (per-venue mutex + Mongo transaction).
 */
import crypto from 'crypto';
import mongoose, { type ClientSession, type Types } from 'mongoose';
import { Reservation } from '../models/Reservation';
import { ReservationHold } from '../models/ReservationHold';
import { RoomBlock } from '../models/RoomBlock';
import { Room } from '../models/Room';
import { Venue } from '../models/Venue';
import { PricingRule } from '../models/PricingRule';
import { nextSequence } from '../models/Counter';
import { generateConfirmationCode } from '../utils/confirmationCode';
import { withBookingLock } from '../utils/bookingLock';
import { publishAvailabilityEvent } from './availabilityEvents';

export const DEFAULT_TZ = 'Africa/Tunis';
export const MAX_STAY_NIGHTS = 30;
export const MAX_CALENDAR_DAYS = 190;
export const MAX_GUESTS = 20;
export const MAX_ROOMS_PER_BOOKING = 6;
export const ENTIRE_UNIT_ID = 'entire';
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
const round2 = (n: number) => Math.round(n * 100) / 100;

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

/* ───────────────────────── venue booking profile ───────────────────────── */

export interface BookingVenue {
  _id: unknown;
  name?: string;
  slug?: string;
  timezone?: string;
  isDemo?: boolean;
  bookingEnabled?: boolean;
  bookingMode?: 'request' | 'instant';
  rentalMode?: 'rooms' | 'entire';
  entirePricePerNight?: number;
  cleaningFee?: number;
  serviceFee?: number;
  minimumNights?: number;
  maxGuests?: number;
  isPublished?: boolean;
  approvalStatus?: string;
  archivedAt?: Date | null;
  ownerId?: unknown;
}

export type Bookability =
  | { bookable: true; demo: boolean; mode: 'request' | 'instant' }
  | { bookable: false; demo: boolean; code: 'DEMO_VENUE_NOT_BOOKABLE' | 'BOOKING_DISABLED' | 'NOT_PUBLISHED'; message: string };

export const DEMO_CLOSED_MESSAGE =
  "Cette maison d'hôtes est présentée à titre de démonstration. Les réservations ne sont pas encore ouvertes.";

/**
 * Whether a venue accepts bookings, and in which mode.
 *  - Demo listings are bookable ONLY when the super admin explicitly enabled demo bookings
 *    (bookingEnabled === true). Those bookings are flagged isDemo and never commercial.
 *  - Real listings are bookable when published/approved, unless the admin switched bookings off
 *    (bookingEnabled === false). `undefined` keeps the historical behaviour (open).
 */
export function venueBookability(v: BookingVenue): Bookability {
  const mode = v.bookingMode === 'instant' ? 'instant' : 'request';
  if (v.isDemo) {
    if (v.bookingEnabled === true) return { bookable: true, demo: true, mode };
    return { bookable: false, demo: true, code: 'DEMO_VENUE_NOT_BOOKABLE', message: DEMO_CLOSED_MESSAGE };
  }
  if (v.isPublished === false || v.archivedAt || (v.approvalStatus && v.approvalStatus !== 'approved')) {
    return { bookable: false, demo: false, code: 'NOT_PUBLISHED', message: "Cette maison d'hôtes n'est pas publiée." };
  }
  if (v.bookingEnabled === false) {
    return { bookable: false, demo: false, code: 'BOOKING_DISABLED', message: 'Les réservations en ligne sont fermées pour cette maison.' };
  }
  return { bookable: true, demo: false, mode };
}

async function resolveVenue(v: string | BookingVenue): Promise<BookingVenue> {
  if (typeof v !== 'string') return v;
  const doc = await Venue.findById(v).lean();
  if (!doc) throw new Error('VENUE_NOT_FOUND');
  return doc as unknown as BookingVenue;
}

/* ───────────────────────── inventory ───────────────────────── */

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

/** The units a guest can book: the rooms, or the single "entire property" unit. */
export async function loadInventory(venue: BookingVenue): Promise<{ mode: 'rooms' | 'entire'; units: RentableRoom[] }> {
  const venueMin = Math.max(1, Number(venue.minimumNights) || 1);
  if (venue.rentalMode === 'entire') {
    const price = Number(venue.entirePricePerNight) || 0;
    const cap = Number(venue.maxGuests) || 0;
    if (!cap) return { mode: 'entire', units: [] }; // not configured
    return {
      mode: 'entire',
      units: [{ id: ENTIRE_UNIT_ID, name: 'Maison entière', capacity: cap, pricePerNight: price, minimumNights: venueMin }],
    };
  }
  const rooms = await loadRentableRooms(String(venue._id));
  return { mode: 'rooms', units: rooms.map((r) => ({ ...r, minimumNights: Math.max(r.minimumNights, venueMin) })) };
}

/* ───────────────────────── conflicts (single source of truth) ───────────────────────── */

export type ConflictReason = 'reserved' | 'held' | 'blocked';

const reservationOnRoom = (roomId: string, venueId: string) => ({
  $or: [{ roomId }, { roomIds: roomId }, { venueId, unitScope: 'entire' }],
});

/** Is the unit (room id or `entire`) free for [start, end)? Returns why not, or null. Pass `session` inside a lock. */
export async function roomConflict(
  roomId: string,
  venueId: string,
  start: Date,
  end: Date,
  excludeHoldId?: string,
  session?: ClientSession
): Promise<{ reason: ConflictReason } | null> {
  const entire = roomId === ENTIRE_UNIT_ID;
  const resFilter: Record<string, unknown> = { status: { $in: ACTIVE_STATUSES }, startAt: { $lt: end }, endAt: { $gt: start } };
  if (entire) Object.assign(resFilter, { venueId, bookingType: 'ROOM' });
  else Object.assign(resFilter, reservationOnRoom(roomId, venueId));
  const reservation = await Reservation.findOne(resFilter).session(session ?? null).lean();
  if (reservation) return { reason: PENDING_STATUSES.includes(String(reservation.status)) ? 'held' : 'reserved' };

  const holdFilter: Record<string, unknown> = {
    status: 'active',
    expiresAt: { $gt: new Date() },
    startsAt: { $lt: end },
    endsAt: { $gt: start },
  };
  if (entire) holdFilter.venueId = venueId;
  else holdFilter.reservableUnitId = roomId;
  if (excludeHoldId) holdFilter._id = { $ne: excludeHoldId };
  const hold = await ReservationHold.findOne(holdFilter).session(session ?? null).lean();
  if (hold) return { reason: 'held' };

  const blockFilter: Record<string, unknown> = { isActive: true, startsAt: { $lt: end }, endsAt: { $gt: start } };
  if (entire) blockFilter.venueId = venueId;
  else blockFilter.$or = [{ scope: 'room', roomId }, { scope: 'venue', venueId }];
  const block = await RoomBlock.findOne(blockFilter).session(session ?? null).lean();
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
    reservation.$or = [{ roomId }, { roomIds: roomId }, { unitScope: 'entire' }];
    hold.reservableUnitId = roomId;
  }
  if (await Reservation.findOne(reservation).session(session ?? null).lean()) return true;
  return !!(await ReservationHold.findOne(hold).session(session ?? null).lean());
}

/* ───────────────────────── calendar ───────────────────────── */

export interface CalendarDay {
  status: DayStatus;
  availableRooms: number;
  rooms: Record<string, NightStatus>;
  /** Nightly price of the cheapest available unit (server-computed), when priced. */
  price?: number | null;
}

export interface CalendarResult {
  from: string;
  to: string;
  today: string;
  timezone: string;
  rentalMode: 'rooms' | 'entire';
  rooms: RentableRoom[];
  days: Record<string, CalendarDay>;
}

const occupiesUnit = (r: any, unitId: string) =>
  unitId === ENTIRE_UNIT_ID || r.unitScope === 'entire' || String(r.roomId) === unitId || (r.roomIds ?? []).some((x: unknown) => String(x) === unitId);

/** Per-night, per-unit availability for [from, to] (both inclusive days). */
export async function buildCalendar(
  venueOrId: string | BookingVenue,
  from: string,
  to: string,
  tz?: string,
  now: Date = new Date()
): Promise<CalendarResult> {
  const venue = await resolveVenue(venueOrId);
  const venueId = String(venue._id);
  const zone = tz || venue.timezone || DEFAULT_TZ;
  const start = parseDay(from);
  const endDay = parseDay(to);
  if (!start || !endDay || endDay < start) throw new Error('INVALID_RANGE');
  if (nightsBetween(start, endDay) + 1 > MAX_CALENDAR_DAYS) throw new Error('RANGE_TOO_LARGE');
  const endExclusive = addDays(endDay, 1);

  const { mode, units } = await loadInventory(venue);
  const today = todayInZone(zone, now);
  const overlapRange = { startAt: { $lt: endExclusive }, endAt: { $gt: start } };

  const [reservations, holds, blocks, rules] = units.length
    ? await Promise.all([
        Reservation.find({ venueId, bookingType: 'ROOM', status: { $in: ACTIVE_STATUSES }, ...overlapRange })
          .select('roomId roomIds unitScope startAt endAt status')
          .lean(),
        ReservationHold.find({ venueId, status: 'active', expiresAt: { $gt: now }, startsAt: { $lt: endExclusive }, endsAt: { $gt: start } })
          .select('reservableUnitId startsAt endsAt')
          .lean(),
        RoomBlock.find({ venueId, isActive: true, startsAt: { $lt: endExclusive }, endsAt: { $gt: start } })
          .select('roomId scope startsAt endsAt')
          .lean(),
        loadPricingRules(venueId),
      ])
    : [[], [], [], []];

  const days: Record<string, CalendarDay> = {};
  for (let d = start; d < endExclusive; d = addDays(d, 1)) {
    const key = toDay(d);
    const nightEnd = addDays(d, 1);
    const overlaps = (s: Date, e: Date) => s < nightEnd && e > d;
    const perRoom: Record<string, NightStatus> = {};
    let available = 0;
    let anyPending = false;
    let anyReserved = false;
    let cheapest: number | null = null;

    for (const unit of units) {
      let st: NightStatus = 'available';
      const mine = (reservations as any[]).filter((r) => occupiesUnit(r, unit.id) && overlaps(r.startAt, r.endAt));
      if (key < today) st = 'past';
      else if (mine.some((r) => !PENDING_STATUSES.includes(String(r.status)))) st = 'reserved';
      else if ((blocks as any[]).some((b) => (unit.id === ENTIRE_UNIT_ID || b.scope === 'venue' || String(b.roomId) === unit.id) && overlaps(b.startsAt, b.endsAt))) st = 'blocked';
      else if (mine.length || (holds as any[]).some((h) => (unit.id === ENTIRE_UNIT_ID || String(h.reservableUnitId) === unit.id) && overlaps(h.startsAt, h.endsAt))) st = 'pending';
      perRoom[unit.id] = st;
      if (st === 'available') {
        available += 1;
        if (unit.pricePerNight > 0) {
          const p = nightlyPrice(unit, d, rules as PricingRuleLite[]);
          cheapest = cheapest == null ? p : Math.min(cheapest, p);
        }
      }
      if (st === 'pending') anyPending = true;
      if (st === 'reserved') anyReserved = true;
    }

    let status: DayStatus;
    if (!units.length) status = key < today ? 'past' : 'unconfigured';
    else if (key < today) status = 'past';
    else if (available > 0) status = 'available';
    else if (anyPending) status = 'pending';
    else if (anyReserved) status = 'reserved';
    else status = 'blocked';

    days[key] = { status, availableRooms: available, rooms: perRoom, price: cheapest };
  }

  return { from, to, today, timezone: zone, rentalMode: mode, rooms: units, days };
}

/* ───────────────────────── pricing ───────────────────────── */

export interface PricingRuleLite {
  roomId?: unknown;
  kind: string;
  startsAt?: Date;
  endsAt?: Date;
  daysOfWeek?: number[];
  multiplier?: number;
  amount?: number;
  minNights?: number;
  priority?: number;
}

export async function loadPricingRules(venueId: string): Promise<PricingRuleLite[]> {
  const rules = await PricingRule.find({ venueId, isActive: true, kind: { $in: ['seasonal', 'weekend', 'holiday'] } })
    .sort({ priority: 1, createdAt: 1 })
    .lean();
  return rules as unknown as PricingRuleLite[];
}

function ruleAppliesToNight(rule: PricingRuleLite, unitId: string, night: Date): boolean {
  if (rule.roomId && String(rule.roomId) !== unitId) return false;
  if (rule.kind === 'weekend') {
    const dow = night.getUTCDay();
    const days = rule.daysOfWeek?.length ? rule.daysOfWeek : [5, 6]; // Fri & Sat nights by default
    if (!days.includes(dow)) return false;
  }
  // Date window: startsAt and endsAt are inclusive calendar days.
  if (rule.startsAt && toDay(night) < toDay(new Date(rule.startsAt))) return false;
  if (rule.endsAt && toDay(night) > toDay(new Date(rule.endsAt))) return false;
  if ((rule.kind === 'seasonal' || rule.kind === 'holiday') && !rule.startsAt && !rule.endsAt) return false;
  return true;
}

/** Price of one night of `unit` after seasonal / weekend / holiday rules (applied by priority). */
export function nightlyPrice(unit: RentableRoom, night: Date, rules: PricingRuleLite[]): number {
  let price = unit.pricePerNight;
  for (const rule of rules) {
    if (!ruleAppliesToNight(rule, unit.id, night)) continue;
    if (typeof rule.multiplier === 'number' && rule.multiplier > 0) price *= rule.multiplier;
    if (typeof rule.amount === 'number') price += rule.amount;
  }
  return Math.max(0, round2(price));
}

/** Seasonal minimum stay attached to the check-in night (rules with minNights). */
function seasonalMinNights(unit: RentableRoom, checkIn: Date, rules: PricingRuleLite[]): number {
  let min = 0;
  for (const rule of rules) if (rule.minNights && ruleAppliesToNight(rule, unit.id, checkIn)) min = Math.max(min, rule.minNights);
  return min;
}

/* ───────────────────────── quote ───────────────────────── */

export interface StayInput {
  checkIn: unknown;
  checkOut: unknown;
  adults: unknown;
  children?: unknown;
  roomId?: unknown;
  roomIds?: unknown;
}

export interface QuoteUnit {
  id: string;
  name: string;
  capacity: number;
  subtotal: number;
}

export interface QuoteLine {
  date: string;
  price: number;
}

export type QuoteResult =
  | {
      ok: true;
      available: true;
      rentalMode: 'rooms' | 'entire';
      room: { id: string; name: string };
      units: QuoteUnit[];
      checkIn: string;
      checkOut: string;
      nights: number;
      adults: number;
      children: number;
      pricePerNight: number | null;
      nightly: QuoteLine[];
      subtotal: number | null;
      cleaningFee: number;
      serviceFee: number;
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

function requestedUnitIds(input: StayInput): string[] | null {
  const ids: string[] = [];
  if (Array.isArray(input.roomIds)) for (const x of input.roomIds) if (typeof x === 'string' && x) ids.push(x);
  if (typeof input.roomId === 'string' && input.roomId && !ids.includes(input.roomId)) ids.unshift(input.roomId);
  return ids.length ? [...new Set(ids)] : null;
}

export async function quoteStay(
  venueOrId: string | BookingVenue,
  input: StayInput,
  opts: { now?: Date; session?: ClientSession } = {}
): Promise<QuoteResult> {
  const venue = await resolveVenue(venueOrId);
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

  const { mode, units: all } = await loadInventory(venue);
  if (!all.length) {
    return { ok: true, available: false, reason: 'NOT_CONFIGURED', message: 'Les disponibilités de cette maison ne sont pas encore configurées.', nights: dates.nights };
  }
  const rules = await loadPricingRules(venueId);
  const minFor = (u: RentableRoom) => Math.max(u.minimumNights, seasonalMinNights(u, dates.start, rules));

  let chosen: RentableRoom[];
  const wanted = mode === 'rooms' ? requestedUnitIds(input) : null;

  if (wanted) {
    if (wanted.length > MAX_ROOMS_PER_BOOKING) return { ok: false, code: 'TOO_MANY_ROOMS', error: `Maximum ${MAX_ROOMS_PER_BOOKING} chambres par réservation.` };
    chosen = all.filter((u) => wanted.includes(u.id));
    if (chosen.length !== wanted.length) return { ok: false, code: 'ROOM_NOT_FOUND', error: 'Hébergement introuvable.' };
    const cap = chosen.reduce((a, u) => a + u.capacity, 0);
    if (guests > cap) return { ok: true, available: false, reason: 'CAPACITY', message: `Capacité insuffisante : ${cap} voyageur${cap > 1 ? 's' : ''} maximum pour cette sélection.`, nights: dates.nights };
    const min = Math.max(...chosen.map(minFor));
    if (dates.nights < min) return { ok: true, available: false, reason: 'MIN_NIGHTS', message: `Séjour minimum : ${min} nuit${min > 1 ? 's' : ''}.`, nights: dates.nights };
    for (const u of chosen) {
      if (await roomConflict(u.id, venueId, dates.start, dates.end, undefined, opts.session)) {
        return { ok: true, available: false, reason: 'UNAVAILABLE', message: `${u.name} n'est plus disponible à ces dates.`, nights: dates.nights };
      }
    }
  } else {
    // Automatic choice: the cheapest single free unit that fits; otherwise the smallest set of free rooms.
    const longEnough = all.filter((u) => dates.nights >= minFor(u));
    if (!longEnough.length) {
      const min = Math.min(...all.map(minFor));
      return { ok: true, available: false, reason: 'MIN_NIGHTS', message: `Séjour minimum : ${min} nuit${min > 1 ? 's' : ''}.`, nights: dates.nights };
    }
    const free: RentableRoom[] = [];
    for (const u of longEnough) if (!(await roomConflict(u.id, venueId, dates.start, dates.end, undefined, opts.session))) free.push(u);
    const totalCap = all.reduce((a, u) => a + u.capacity, 0);
    if (guests > totalCap) return { ok: true, available: false, reason: 'CAPACITY', message: 'Aucun hébergement ne peut accueillir ce nombre de voyageurs.', nights: dates.nights };
    if (!free.length) return { ok: true, available: false, reason: 'UNAVAILABLE', message: 'Ces dates ne sont plus disponibles.', nights: dates.nights };
    const byPrice = (a: RentableRoom, b: RentableRoom) => (a.pricePerNight || Infinity) - (b.pricePerNight || Infinity);
    const single = free.filter((u) => guests <= u.capacity && (u.capacityAdults == null || adults <= u.capacityAdults)).sort(byPrice);
    if (single.length) chosen = [single[0]];
    else {
      chosen = [];
      let cap = 0;
      for (const u of [...free].sort((a, b) => b.capacity - a.capacity)) {
        if (cap >= guests || chosen.length >= MAX_ROOMS_PER_BOOKING) break;
        chosen.push(u);
        cap += u.capacity;
      }
      if (cap < guests) return { ok: true, available: false, reason: 'CAPACITY', message: "Pas assez de chambres libres pour ce nombre de voyageurs à ces dates.", nights: dates.nights };
    }
  }

  // Server-side price: every night of every unit, with rules, then fees.
  const priced = chosen.every((u) => u.pricePerNight > 0);
  const nightly: QuoteLine[] = [];
  const units: QuoteUnit[] = chosen.map((u) => ({ id: u.id, name: u.name, capacity: u.capacity, subtotal: 0 }));
  if (priced) {
    for (let d = dates.start; d < dates.end; d = addDays(d, 1)) {
      let night = 0;
      chosen.forEach((u, i) => {
        const p = nightlyPrice(u, d, rules);
        units[i].subtotal = round2(units[i].subtotal + p);
        night += p;
      });
      nightly.push({ date: toDay(d), price: round2(night) });
    }
  }
  const subtotal = priced ? round2(nightly.reduce((a, n) => a + n.price, 0)) : null;
  const cleaningFee = priced ? Math.max(0, Number(venue.cleaningFee) || 0) : 0;
  const serviceFee = priced ? Math.max(0, Number(venue.serviceFee) || 0) : 0;

  return {
    ok: true,
    available: true,
    rentalMode: mode,
    room: { id: chosen[0].id, name: chosen.map((u) => u.name).join(' + ') },
    units,
    checkIn: toDay(dates.start),
    checkOut: toDay(dates.end),
    nights: dates.nights,
    adults,
    children,
    pricePerNight: subtotal != null ? round2(subtotal / dates.nights) : null,
    nightly,
    subtotal,
    cleaningFee,
    serviceFee,
    total: subtotal != null ? round2(subtotal + cleaningFee + serviceFee) : null,
    currency: 'TND',
  };
}

/* ───────────────────────── status machine ───────────────────────── */

export interface Actor {
  userId?: unknown;
  role?: string;
}

export type BookingState = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired' | 'completed' | 'no_show' | 'checked_in';

const TRANSITIONS: Record<string, BookingState[]> = {
  pending: ['confirmed', 'rejected', 'cancelled', 'expired'],
  confirmed: ['cancelled', 'completed', 'no_show', 'checked_in'],
  checked_in: ['completed'],
};

export const normalizeStatus = (s: unknown): string => {
  const v = String(s ?? '').toLowerCase();
  return v === 'no-show' ? 'no_show' : v;
};

export function canTransition(from: unknown, to: BookingState): boolean {
  return (TRANSITIONS[normalizeStatus(from)] ?? []).includes(to);
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

/* ───────────────────────── references ───────────────────────── */

/** EX-2026-000001 (real) / EX-DEMO-2026-000001 (demonstration). Sequential per year, never reused. */
export async function nextReservationReference(now: Date, demo: boolean, session?: ClientSession): Promise<string> {
  const year = now.getUTCFullYear();
  const seq = await nextSequence(`reservation:${demo ? 'demo:' : ''}${year}`, session);
  return `EX-${demo ? 'DEMO-' : ''}${year}-${String(seq).padStart(6, '0')}`;
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
  venue: BookingVenue;
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
  const bookability = venueBookability(args.venue);
  if (!bookability.bookable) return { ok: false, status: 403, code: bookability.code, error: bookability.message };
  const demo = bookability.demo;
  const instant = bookability.mode === 'instant';

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
    if (quote.total == null) {
      return { kind: 'error' as const, status: 422, code: 'PRICE_NOT_CONFIGURED', error: "Le tarif de cet hébergement n'est pas encore configuré." };
    }

    const start = parseDay(quote.checkIn)!;
    const end = parseDay(quote.checkOut)!;
    const token = crypto.randomBytes(24).toString('hex');
    const reservationCode = await nextReservationReference(now, demo, session);
    const entire = quote.rentalMode === 'entire';
    const roomIds = entire ? undefined : quote.units.map((u) => u.id);
    const status = instant ? 'confirmed' : 'pending';

    const [created] = await Reservation.create(
      [
        {
          userId: args.userId || undefined,
          venueId: args.venue._id,
          roomId: entire ? undefined : roomIds![0],
          roomIds,
          unitScope: entire ? 'entire' : 'room',
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
          roomsCount: entire ? 1 : roomIds!.length,
          guestFirstName: args.guest.firstName,
          guestLastName: args.guest.lastName,
          guestPhone: args.guest.phone,
          customerFirstName: args.guest.firstName,
          customerLastName: args.guest.lastName,
          customerEmail: args.guest.email,
          customerPhone: args.guest.phone,
          specialRequest: args.specialRequest || undefined,
          totalPrice: quote.total,
          remainingAmount: quote.total,
          amountPaid: 0,
          priceBreakdown: {
            subtotal: quote.subtotal,
            cleaningFee: quote.cleaningFee,
            serviceFee: quote.serviceFee,
            taxes: 0,
            discount: 0,
            extrasTotal: 0,
            total: quote.total,
            currency: 'TND',
          },
          paymentOption: 'pay_at_hotel',
          paymentStatus: 'unpaid', // never paid until a payment is verified
          status,
          bookingMode: instant ? 'instant' : 'request',
          isDemo: demo,
          source: 'web-request',
          reservationCode,
          confirmationCode: generateConfirmationCode(8),
          accessTokenHash: hashToken(token),
          idempotencyKey: idemKey,
          expiresAt: instant ? undefined : new Date(now.getTime() + requestTtlHours() * 60 * 60 * 1000),
          statusHistory: [
            {
              to: status,
              byRole: instant ? 'SYSTEM' : 'CUSTOMER',
              reason: instant ? 'Réservation instantanée confirmée automatiquement' : 'Demande de réservation',
              at: now,
            },
          ],
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

/* ───────────────────────── manual reservation (owner / admin) ───────────────────────── */

export async function createManualReservation(args: {
  venue: BookingVenue;
  stay: StayInput;
  guest: { firstName: string; lastName: string; phone: string; email?: string };
  price?: number;
  source: string;
  notes?: string;
  actor: Actor;
  now?: Date;
}): Promise<CreateRequestResult> {
  const venueId = String(args.venue._id);
  const now = args.now ?? new Date();
  const outcome = await withBookingLock(`venue:${venueId}`, async (session) => {
    const quote = await quoteStay(args.venue, args.stay, { now, session });
    if (!quote.ok) return { kind: 'error' as const, status: 400, code: quote.code, error: quote.error };
    if (!quote.available) return { kind: 'error' as const, status: quote.reason === 'UNAVAILABLE' ? 409 : 422, code: quote.reason, error: quote.message };
    const total = Number.isFinite(args.price) && (args.price as number) >= 0 ? round2(args.price as number) : quote.total ?? 0;
    const entire = quote.rentalMode === 'entire';
    const roomIds = entire ? undefined : quote.units.map((u) => u.id);
    const demo = !!args.venue.isDemo;
    const [created] = await Reservation.create(
      [
        {
          userId: args.actor.userId,
          venueId: args.venue._id,
          roomId: entire ? undefined : roomIds![0],
          roomIds,
          unitScope: entire ? 'entire' : 'room',
          bookingType: 'ROOM',
          reservableType: 'room',
          startAt: parseDay(quote.checkIn),
          endAt: parseDay(quote.checkOut),
          reservationDate: parseDay(quote.checkIn),
          nights: quote.nights,
          adults: quote.adults,
          children: quote.children,
          partySize: quote.adults + quote.children,
          peopleCount: quote.adults + quote.children,
          roomsCount: entire ? 1 : roomIds!.length,
          guestFirstName: args.guest.firstName,
          guestLastName: args.guest.lastName,
          guestPhone: args.guest.phone,
          customerFirstName: args.guest.firstName,
          customerLastName: args.guest.lastName,
          customerPhone: args.guest.phone,
          customerEmail: args.guest.email || undefined,
          totalPrice: total,
          amountPaid: 0,
          remainingAmount: total,
          priceBreakdown: { subtotal: total, total, currency: 'TND' },
          paymentStatus: 'unpaid',
          paymentOption: 'pay_at_hotel',
          status: 'confirmed',
          isDemo: demo,
          checkInStatus: 'not_checked_in',
          source: args.source,
          notes: args.notes,
          reservationCode: await nextReservationReference(now, demo, session),
          confirmationCode: generateConfirmationCode(8),
          statusHistory: [{ to: 'confirmed', byUserId: args.actor.userId, byRole: args.actor.role, reason: `Réservation manuelle (${args.source})`, at: now }],
        },
      ],
      { session }
    );
    return { kind: 'created' as const, reservation: created };
  });
  if (outcome.kind === 'error') return { ok: false, status: outcome.status, code: outcome.code, error: outcome.error };
  publishAvailabilityEvent({ venueId, type: 'reservation_created', at: new Date().toISOString(), reservationId: String(outcome.reservation._id) });
  return { ok: true, replay: false, reservation: outcome.reservation };
}

/* ───────────────────────── expiry ───────────────────────── */

/** Pending requests past their TTL stop blocking inventory. Returns the expired reservations. */
export async function expirePendingRequests(now: Date = new Date()): Promise<any[]> {
  const stale = await Reservation.find({ status: { $in: PENDING_STATUSES }, expiresAt: { $lt: now } });
  const done: any[] = [];
  for (const r of stale) {
    // Re-check atomically so a concurrent accept wins over expiry.
    const res = await Reservation.updateOne(
      { _id: r._id, status: { $in: PENDING_STATUSES } },
      {
        $set: { status: 'expired' },
        $unset: { expiresAt: 1 },
        $push: { statusHistory: { from: r.status, to: 'expired', byRole: 'SYSTEM', reason: 'Délai de réponse dépassé', at: now } },
      }
    );
    if (!res.modifiedCount) continue;
    done.push(r);
    publishAvailabilityEvent({ venueId: String(r.venueId), type: 'reservation_cancelled', at: now.toISOString(), reservationId: String(r._id) });
  }
  return done;
}

/* ───────────────────────── management (owner / admin) ───────────────────────── */

const MANAGED_STATUSES = [...ACTIVE_STATUSES];

/** Calendar + the actual reservations and blocks behind each coloured night. */
export async function buildManagementCalendar(venueOrId: string | BookingVenue, from: string, to: string, tz?: string, now: Date = new Date()) {
  const venue = await resolveVenue(venueOrId);
  const venueId = String(venue._id);
  const calendar = await buildCalendar(venue, from, to, tz, now);
  const start = parseDay(from)!;
  const endExclusive = addDays(parseDay(to)!, 1);

  const [reservations, blocks, roomDocs] = await Promise.all([
    Reservation.find({ venueId, bookingType: 'ROOM', status: { $in: MANAGED_STATUSES }, startAt: { $lt: endExclusive }, endAt: { $gt: start } })
      .populate('roomId', 'name roomNumber')
      .sort({ startAt: 1 })
      .lean(),
    RoomBlock.find({ venueId, isActive: true, startsAt: { $lt: endExclusive }, endsAt: { $gt: start } })
      .populate('createdBy', 'fullName email')
      .sort({ startsAt: 1 })
      .lean(),
    Room.find({ venueId }).select('name roomNumber').lean(),
  ]);
  const roomName = new Map((roomDocs as any[]).map((r) => [String(r._id), r.name || `Chambre ${r.roomNumber}`]));

  return {
    ...calendar,
    reservations: (reservations as any[]).map((r) => {
      const ids: string[] = r.roomIds?.length ? r.roomIds.map(String) : r.roomId ? [String(r.roomId._id ?? r.roomId)] : [];
      return {
        id: String(r._id),
        reference: r.reservationCode ?? r.confirmationCode,
        roomId: r.unitScope === 'entire' ? ENTIRE_UNIT_ID : ids[0] ?? null,
        roomIds: r.unitScope === 'entire' ? [ENTIRE_UNIT_ID] : ids,
        roomName: r.unitScope === 'entire' ? 'Maison entière' : ids.map((id) => roomName.get(id)).filter(Boolean).join(' + ') || null,
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
        paymentStatus: r.paymentStatus,
        isDemo: !!r.isDemo,
        source: r.source,
        specialRequest: r.specialRequest,
        createdAt: r.createdAt,
      };
    }),
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
  completed: number;
  noShow: number;
  upcomingCheckIns: number;
  upcomingCheckOuts: number;
  arrivalsToday: number;
  departuresToday: number;
  revenueMonth: number;
  bookingValue: number;
  occupancyRate: number | null;
  window: { from: string; to: string };
}

/** Counts + occupancy over a window. `venueIds` undefined = every accommodation (admin). Demo bookings are excluded from money. */
export async function bookingSummary(opts: { venueIds?: unknown[]; from?: string; to?: string; tz?: string; now?: Date } = {}): Promise<BookingSummary> {
  const now = opts.now ?? new Date();
  const tz = opts.tz ?? DEFAULT_TZ;
  const todayStr = todayInZone(tz, now);
  const today = parseDay(todayStr)!;
  const from = parseDay(opts.from) ?? today;
  const to = parseDay(opts.to) ?? addDays(from, 29);
  const toExclusive = addDays(to, 1);
  const scope: Record<string, unknown> = { bookingType: 'ROOM' };
  if (opts.venueIds) scope.venueId = { $in: opts.venueIds };
  const live = ['confirmed', 'checked_in', 'completed', 'CONFIRMED', 'COMPLETED'];
  const monthStart = parseDay(`${todayStr.slice(0, 7)}-01`)!;
  const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));

  const byStatus = await Reservation.aggregate([{ $match: scope }, { $group: { _id: { $toLower: '$status' }, n: { $sum: 1 } } }]);
  const count = (k: string) => byStatus.find((x: any) => x._id === k)?.n ?? 0;
  const total = byStatus.reduce((a: number, x: any) => a + x.n, 0);

  const week = addDays(today, 7);
  const tomorrow = addDays(today, 1);
  const [upcomingCheckIns, upcomingCheckOuts, arrivalsToday, departuresToday, occupied, inventory, money] = await Promise.all([
    Reservation.countDocuments({ ...scope, status: { $in: ['pending', 'confirmed', 'PENDING', 'CONFIRMED'] }, startAt: { $gte: today, $lt: week } }),
    Reservation.countDocuments({ ...scope, status: { $in: ['confirmed', 'checked_in', 'CONFIRMED'] }, endAt: { $gte: today, $lt: week } }),
    Reservation.countDocuments({ ...scope, status: { $in: ['confirmed', 'checked_in', 'CONFIRMED'] }, startAt: { $gte: today, $lt: tomorrow } }),
    Reservation.countDocuments({ ...scope, status: { $in: ['confirmed', 'checked_in', 'CONFIRMED'] }, endAt: { $gte: today, $lt: tomorrow } }),
    Reservation.find({ ...scope, status: { $in: live }, startAt: { $lt: toExclusive }, endAt: { $gt: from } }).select('startAt endAt roomIds unitScope venueId').lean(),
    inventorySize(opts.venueIds),
    Reservation.aggregate([
      { $match: { ...scope, status: { $in: live }, isDemo: { $ne: true } } },
      {
        $group: {
          _id: null,
          all: { $sum: '$totalPrice' },
          month: { $sum: { $cond: [{ $and: [{ $gte: ['$startAt', monthStart] }, { $lt: ['$startAt', nextMonth] }] }, '$totalPrice', 0] } },
        },
      },
    ]),
  ]);

  let bookedNights = 0;
  for (const r of occupied as any[]) {
    const s = Math.max(new Date(r.startAt).getTime(), from.getTime());
    const e = Math.min(new Date(r.endAt).getTime(), toExclusive.getTime());
    if (e <= s) continue;
    const units = r.unitScope === 'entire' ? inventory.unitsByVenue.get(String(r.venueId)) ?? 1 : Math.max(1, r.roomIds?.length ?? 1);
    bookedNights += Math.round((e - s) / DAY_MS) * units;
  }
  const capacityNights = inventory.total * nightsBetween(from, toExclusive);

  return {
    total,
    pending: count('pending'),
    confirmed: count('confirmed') + count('checked_in'),
    cancelled: count('cancelled'),
    rejected: count('rejected'),
    expired: count('expired'),
    completed: count('completed'),
    noShow: count('no_show'),
    upcomingCheckIns,
    upcomingCheckOuts,
    arrivalsToday,
    departuresToday,
    revenueMonth: round2(money[0]?.month ?? 0),
    bookingValue: round2(money[0]?.all ?? 0),
    occupancyRate: capacityNights > 0 ? Math.min(100, Math.round((bookedNights / capacityNights) * 1000) / 10) : null,
    window: { from: toDay(from), to: toDay(to) },
  };
}

/** Bookable units per venue: rooms, or 1 for an entire-property listing. */
async function inventorySize(venueIds?: unknown[]): Promise<{ total: number; unitsByVenue: Map<string, number> }> {
  const vFilter: Record<string, unknown> = { type: { $in: ['MAISON_DHOTE', 'HOTEL'] } };
  if (venueIds) vFilter._id = { $in: venueIds };
  const venues = await Venue.find(vFilter).select('rentalMode maxGuests').lean();
  const rooms = await Room.aggregate([
    { $match: { venueId: { $in: venues.map((v: any) => v._id) }, isActive: true, isReservable: true } },
    { $group: { _id: '$venueId', n: { $sum: 1 } } },
  ]);
  const roomCount = new Map(rooms.map((r: any) => [String(r._id), r.n as number]));
  const unitsByVenue = new Map<string, number>();
  let total = 0;
  for (const v of venues as any[]) {
    const units = v.rentalMode === 'entire' ? (v.maxGuests ? 1 : 0) : roomCount.get(String(v._id)) ?? 0;
    unitsByVenue.set(String(v._id), units);
    total += units;
  }
  // Entire-property bookings count as one unit in occupancy.
  for (const v of venues as any[]) if (v.rentalMode === 'entire') unitsByVenue.set(String(v._id), 1);
  return { total, unitsByVenue };
}

export { mongoose };
