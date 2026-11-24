/**
 * Super-admin analytics for the guesthouse marketplace — one place for every metric definition.
 *
 * Definitions (all dates are Tunis calendar days):
 *  - Period attribution: a reservation belongs to the period in which it was CREATED.
 *  - Confirmed: current status confirmed | checked_in | completed (case-insensitive).
 *  - Booking value: Σ totalPrice of confirmed reservations — booked value, NOT collected payments.
 *  - Occupancy: booked unit-nights ÷ (inventory unit-nights − blocked unit-nights) over the stay dates of the
 *    period. Inventory = 1 unit per entire-property listing, or its active reservable rooms otherwise; only
 *    published & approved maisons count. Live stays (confirmed/checked_in/completed) count as booked.
 *  - Demo data (isDemo reservations / demo maisons) is excluded unless `includeDemo` is set.
 *  - Comparisons are only returned when the previous equivalent period has data (no invented trends).
 */
import mongoose from 'mongoose';
import { Venue } from '../models/Venue';
import { Room } from '../models/Room';
import { RoomBlock } from '../models/RoomBlock';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';
import { EmailOutbox } from '../models/EmailOutbox';
import { PartnerApplication } from '../models/PartnerApplication';
import { DEFAULT_TZ, venueBookability } from './bookingEngine';

export const TZ = DEFAULT_TZ; // Africa/Tunis
const DAY = 86_400_000;
export const LIVE = ['confirmed', 'checked_in', 'completed'];
const ci = (list: string[]) => list.flatMap((s) => [s, s.toUpperCase()]);
const OVERDUE_WINDOW_H = 12;
/** Text used for required fields of a draft maison created from an application; counts as missing. */
export const DRAFT_PLACEHOLDER = 'À compléter';

export type Group = 'day' | 'week' | 'month';

/* ── time helpers (Tunis has no DST but we never hard-code the offset) ── */
function tzOffsetMs(at: Date, tz = TZ): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(at)
    .reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - at.getTime();
}
/** Instant of 00:00 (Tunis) on calendar day `day` (YYYY-MM-DD). */
export function zonedMidnight(day: string, tz = TZ): Date {
  const utc = Date.parse(`${day}T00:00:00Z`);
  return new Date(utc - tzOffsetMs(new Date(utc), tz));
}
export function todayTunis(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const addDayStr = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

export interface Period { from: string; to: string; days: number }
/** Normalise a period (inclusive days). Defaults to the last 30 days; capped at 366 days. */
export function resolvePeriod(from?: unknown, to?: unknown, now = new Date()): Period {
  const today = todayTunis(now);
  let t = isDay(to) ? (to as string) : today;
  let f = isDay(from) ? (from as string) : addDayStr(t, -29);
  if (daysBetween(f, t) < 0) [f, t] = [t, f];
  if (daysBetween(f, t) > 365) f = addDayStr(t, -365);
  return { from: f, to: t, days: daysBetween(f, t) + 1 };
}
export function previousPeriod(p: Period): Period {
  const to = addDayStr(p.from, -1);
  return { from: addDayStr(to, -(p.days - 1)), to, days: p.days };
}

/* ── scopes ─────────────────────────────────────────────────── */
async function maisonIds(includeDemo: boolean, onlyActive = false) {
  const f: Record<string, unknown> = { type: 'MAISON_DHOTE', archivedAt: null };
  if (!includeDemo) f.isDemo = { $ne: true };
  if (onlyActive) Object.assign(f, { isPublished: { $ne: false }, approvalStatus: { $in: ['approved', null] } });
  return Venue.find(f).distinct('_id');
}
function reservationScope(venueIds: unknown[], includeDemo: boolean): Record<string, unknown> {
  const s: Record<string, unknown> = { bookingType: 'ROOM', venueId: { $in: venueIds } };
  if (!includeDemo) s.isDemo = { $ne: true };
  return s;
}

function bucketKey(day: string, group: Group): string {
  if (group === 'month') return `${day.slice(0, 7)}-01`;
  if (group === 'week') {
    const d = new Date(`${day}T00:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
    return addDayStr(day, -dow);
  }
  return day;
}
function bucketsFor(p: Period, group: Group): string[] {
  const keys: string[] = [];
  for (let i = 0; i < p.days; i++) {
    const k = bucketKey(addDayStr(p.from, i), group);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  return keys;
}
const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

/* ── period aggregates ──────────────────────────────────────── */
async function createdInPeriod(scope: Record<string, unknown>, p: Period) {
  const start = zonedMidnight(p.from);
  const end = zonedMidnight(addDayStr(p.to, 1));
  const rows: any[] = await Reservation.aggregate([
    { $match: { ...scope, createdAt: { $gte: start, $lt: end } } },
    {
      $project: {
        day: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: TZ } },
        status: { $toLower: '$status' },
        totalPrice: { $ifNull: ['$totalPrice', 0] },
        nights: { $ifNull: ['$nights', { $divide: [{ $subtract: ['$endAt', '$startAt'] }, DAY] }] },
        leadDays: { $divide: [{ $subtract: ['$startAt', '$createdAt'] }, DAY] },
        venueId: 1,
      },
    },
  ]);
  return rows as { day: string; status: string; totalPrice: number; nights: number; leadDays: number; venueId: mongoose.Types.ObjectId }[];
}

/** Booked and bookable unit-nights per stay day across [from, to], per venue. */
async function occupancy(venueIds: unknown[], includeDemo: boolean, p: Period) {
  const startDay = new Date(`${p.from}T00:00:00Z`); // stay days are stored as UTC midnights
  const endDay = new Date(`${addDayStr(p.to, 1)}T00:00:00Z`);
  const venues: any[] = await Venue.find({ _id: { $in: venueIds } }).select('rentalMode maxGuests isPublished approvalStatus').lean();
  const rooms: any[] = await Room.aggregate([
    { $match: { venueId: { $in: venueIds }, isActive: true, isReservable: true } },
    { $group: { _id: '$venueId', n: { $sum: 1 } } },
  ]);
  const roomCount = new Map(rooms.map((r) => [String(r._id), r.n as number]));
  const units = new Map<string, number>();
  for (const v of venues) units.set(String(v._id), v.rentalMode === 'entire' ? (v.maxGuests ? 1 : 0) : roomCount.get(String(v._id)) ?? 0);

  const [stays, blocks] = await Promise.all([
    Reservation.find({ ...reservationScope(venueIds, includeDemo), status: { $in: ci(LIVE) }, startAt: { $lt: endDay }, endAt: { $gt: startDay } })
      .select('startAt endAt roomIds unitScope venueId')
      .lean(),
    RoomBlock.find({ venueId: { $in: venueIds }, isActive: true, startsAt: { $lt: endDay }, endsAt: { $gt: startDay } }).select('venueId roomId scope startsAt endsAt').lean(),
  ]);

  const overlapNights = (s: Date, e: Date) => {
    const a = Math.max(new Date(s).getTime(), startDay.getTime());
    const b = Math.min(new Date(e).getTime(), endDay.getTime());
    return b > a ? Math.round((b - a) / DAY) : 0;
  };
  const booked = new Map<string, number>();
  for (const r of stays as any[]) {
    const vid = String(r.venueId);
    const n = overlapNights(r.startAt, r.endAt) * (r.unitScope === 'entire' ? Math.max(1, units.get(vid) ?? 1) : Math.max(1, r.roomIds?.length ?? 1));
    booked.set(vid, (booked.get(vid) ?? 0) + n);
  }
  const blocked = new Map<string, number>();
  for (const b of blocks as any[]) {
    const vid = String(b.venueId);
    const n = overlapNights(b.startsAt, b.endsAt) * (b.scope === 'venue' ? units.get(vid) ?? 0 : 1);
    blocked.set(vid, (blocked.get(vid) ?? 0) + n);
  }
  let bookedTotal = 0;
  let capacityTotal = 0;
  const perVenue = new Map<string, { booked: number; capacity: number; rate: number | null }>();
  for (const [vid, u] of units) {
    const cap = Math.max(0, u * p.days - (blocked.get(vid) ?? 0));
    const bk = Math.min(cap, booked.get(vid) ?? 0);
    bookedTotal += bk;
    capacityTotal += cap;
    perVenue.set(vid, { booked: bk, capacity: cap, rate: cap > 0 ? Math.round((bk / cap) * 1000) / 10 : null });
  }
  return {
    bookedNights: bookedTotal,
    bookableNights: capacityTotal,
    blockedNights: [...blocked.values()].reduce((a, b) => a + b, 0),
    rate: capacityTotal > 0 ? Math.round((bookedTotal / capacityTotal) * 1000) / 10 : null,
    perVenue,
  };
}

export interface AnalyticsOptions { from?: unknown; to?: unknown; group?: unknown; includeDemo?: boolean; now?: Date }

export async function adminAnalytics(opts: AnalyticsOptions = {}) {
  const now = opts.now ?? new Date();
  const includeDemo = !!opts.includeDemo;
  const period = resolvePeriod(opts.from, opts.to, now);
  const prev = previousPeriod(period);
  const group: Group = opts.group === 'week' || opts.group === 'month' ? opts.group : period.days > 120 ? 'month' : period.days > 45 ? 'week' : 'day';

  const allVenueIds = await maisonIds(includeDemo);
  const activeVenueIds = await maisonIds(includeDemo, true);
  const scope = reservationScope(allVenueIds, includeDemo);

  const [cur, before, occ, prevOcc] = await Promise.all([
    createdInPeriod(scope, period),
    createdInPeriod(scope, prev),
    occupancy(activeVenueIds, includeDemo, period),
    occupancy(activeVenueIds, includeDemo, prev),
  ]);

  const isLive = (s: string) => LIVE.includes(s);
  const sum = (rows: typeof cur, pred: (r: (typeof cur)[number]) => boolean, f: (r: (typeof cur)[number]) => number = () => 1) =>
    rows.reduce((a, r) => (pred(r) ? a + f(r) : a), 0);

  const confirmed = sum(cur, (r) => isLive(r.status));
  const confirmedPrev = sum(before, (r) => isLive(r.status));
  const value = round2(sum(cur, (r) => isLive(r.status), (r) => r.totalPrice));
  const valuePrev = round2(sum(before, (r) => isLive(r.status), (r) => r.totalPrice));

  /* status breakdown (created in period) */
  const STATUSES = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'expired', 'no_show'];
  const statusBreakdown = STATUSES.map((s) => ({ status: s, count: sum(cur, (r) => r.status === s) })).filter((s) => s.count > 0);

  /* time series */
  const keys = bucketsFor(period, group);
  const prevKeys = bucketsFor(prev, group);
  const series = keys.map((k, i) => {
    const inB = (r: (typeof cur)[number]) => bucketKey(r.day, group) === k;
    const inPrev = (r: (typeof before)[number]) => bucketKey(r.day, group) === prevKeys[i];
    return {
      date: k,
      confirmed: sum(cur, (r) => inB(r) && isLive(r.status)),
      pending: sum(cur, (r) => inB(r) && r.status === 'pending'),
      cancelled: sum(cur, (r) => inB(r) && ['cancelled', 'rejected', 'expired', 'no_show'].includes(r.status)),
      value: round2(sum(cur, (r) => inB(r) && isLive(r.status), (r) => r.totalPrice)),
      previousValue: prevKeys[i] ? round2(sum(before, (r) => inPrev(r) && isLive(r.status), (r) => r.totalPrice)) : null,
    };
  });

  /* snapshot counts */
  const pendingFilter = { ...scope, status: { $in: ci(['pending']) } };
  const startToday = new Date(`${todayTunis(now)}T00:00:00Z`);
  const startTomorrow = new Date(startToday.getTime() + DAY);
  const liveStay = { ...scope, status: { $in: ci(['confirmed', 'checked_in']) } };
  const [pendingNow, overdue, arrivalsToday, departuresToday, venuesForActive, ownersWithMaison, failedEmails, newApplications] = await Promise.all([
    Reservation.countDocuments(pendingFilter),
    Reservation.countDocuments({ ...pendingFilter, expiresAt: { $lte: new Date(now.getTime() + OVERDUE_WINDOW_H * 3_600_000) } }),
    Reservation.countDocuments({ ...liveStay, startAt: { $gte: startToday, $lt: startTomorrow } }),
    Reservation.countDocuments({ ...liveStay, endAt: { $gte: startToday, $lt: startTomorrow } }),
    Venue.find({ _id: { $in: activeVenueIds } }).select('name isDemo isPublished approvalStatus bookingEnabled bookingMode rentalMode entirePricePerNight maxGuests coverImage coordinates description address').lean(),
    Venue.find({ type: 'MAISON_DHOTE', archivedAt: null, ownerId: { $ne: null } }).distinct('ownerId'),
    EmailOutbox.countDocuments({ status: 'failed' }),
    PartnerApplication.countDocuments({ status: { $in: ['new', 'in_review'] } }),
  ]);
  const activeOwners = await User.countDocuments({ _id: { $in: ownersWithMaison }, role: 'ESTABLISHMENT_OWNER', isActive: { $ne: false } });

  const pricedRooms = await Room.aggregate([
    { $match: { venueId: { $in: activeVenueIds }, isActive: true, isReservable: true, pricePerNight: { $gt: 0 } } },
    { $group: { _id: '$venueId', n: { $sum: 1 } } },
  ]);
  const priced = new Set(pricedRooms.map((r: any) => String(r._id)));
  const notReady: { id: string; name: string; missing: string[] }[] = [];
  let activeGuesthouses = 0;
  for (const v of venuesForActive as any[]) {
    const configured = v.rentalMode === 'entire' ? v.entirePricePerNight > 0 && v.maxGuests > 0 : priced.has(String(v._id));
    if (venueBookability(v).bookable && configured) activeGuesthouses++;
    const missing = [
      !configured && 'tarifs / capacité',
      !v.coverImage && 'photo de couverture',
      v.coordinates?.lat == null && 'localisation',
      (!v.description || v.description === DRAFT_PLACEHOLDER) && 'description',
      (!v.address || v.address === DRAFT_PLACEHOLDER) && 'adresse',
    ].filter(Boolean) as string[];
    if (missing.length) notReady.push({ id: String(v._id), name: v.name, missing });
  }

  /* top maisons & governorates (period) */
  const byVenue = new Map<string, { bookings: number; value: number }>();
  for (const r of cur) {
    if (!isLive(r.status)) continue;
    const k = String(r.venueId);
    const e = byVenue.get(k) ?? { bookings: 0, value: 0 };
    e.bookings++;
    e.value += r.totalPrice;
    byVenue.set(k, e);
  }
  const venueInfo: any[] = await Venue.find({ _id: { $in: allVenueIds } }).select('name slug city governorate coverImage').lean();
  const info = new Map(venueInfo.map((v) => [String(v._id), v]));
  const topProperties = [...byVenue.entries()]
    .map(([id, e]) => ({
      id,
      name: info.get(id)?.name ?? '—',
      slug: info.get(id)?.slug ?? null,
      city: info.get(id)?.city ?? null,
      bookings: e.bookings,
      value: round2(e.value),
      occupancy: occ.perVenue.get(id)?.rate ?? null,
    }))
    .sort((a, b) => b.value - a.value || b.bookings - a.bookings)
    .slice(0, 8);

  const gov = new Map<string, { bookings: number; value: number; properties: number }>();
  for (const v of venueInfo) {
    if (!v.governorate) continue;
    const g = gov.get(v.governorate) ?? { bookings: 0, value: 0, properties: 0 };
    g.properties++;
    const e = byVenue.get(String(v._id));
    if (e) { g.bookings += e.bookings; g.value += e.value; }
    gov.set(v.governorate, g);
  }
  const governorates = [...gov.entries()].map(([name, g]) => ({ name, ...g, value: round2(g.value) })).sort((a, b) => b.bookings - a.bookings || b.properties - a.properties);
  const withoutGovernorate = venueInfo.filter((v) => !v.governorate).length;

  /* insights (only when there is data) */
  const liveRows = cur.filter((r) => isLive(r.status));
  const decided = cur.filter((r) => r.status !== 'pending');
  const insights = {
    averageBookingValue: liveRows.length ? round2(value / liveRows.length) : null,
    averageStayNights: liveRows.length ? Math.round((liveRows.reduce((a, r) => a + r.nights, 0) / liveRows.length) * 10) / 10 : null,
    cancellationRate: decided.length ? Math.round((decided.filter((r) => ['cancelled', 'rejected', 'expired', 'no_show'].includes(r.status)).length / decided.length) * 1000) / 10 : null,
    averageLeadDays: liveRows.length ? Math.round(liveRows.reduce((a, r) => a + Math.max(0, r.leadDays), 0) / liveRows.length) : null,
  };

  const demoCount = includeDemo ? null : await Reservation.countDocuments({ bookingType: 'ROOM', isDemo: true, createdAt: { $gte: zonedMidnight(period.from), $lt: zonedMidnight(addDayStr(period.to, 1)) } });

  return {
    period: { ...period, group, timezone: TZ },
    previousPeriod: prev,
    includeDemo,
    excludedDemoReservations: demoCount,
    kpis: {
      confirmedReservations: { value: confirmed, previous: confirmedPrev, changePct: pct(confirmed, confirmedPrev) },
      pendingReservations: { value: pendingNow, overdue, overdueWindowHours: OVERDUE_WINDOW_H },
      bookingValue: { value, previous: valuePrev, changePct: pct(value, valuePrev), currency: 'TND' },
      activeGuesthouses: { value: activeGuesthouses, total: allVenueIds.length },
      activeOwners: { value: activeOwners },
      occupancy: {
        rate: occ.rate,
        bookedNights: occ.bookedNights,
        bookableNights: occ.bookableNights,
        blockedNights: occ.blockedNights,
        previousRate: prevOcc.rate,
        changePts: occ.rate != null && prevOcc.rate != null && prevOcc.bookableNights > 0 && prevOcc.bookedNights > 0 ? Math.round((occ.rate - prevOcc.rate) * 10) / 10 : null,
      },
    },
    series,
    statusBreakdown,
    topProperties,
    governorates,
    withoutGovernorate,
    insights,
    operations: { pending: pendingNow, overdue, arrivalsToday, departuresToday, newApplications, failedEmails, notReady },
    generatedAt: now.toISOString(),
  };
}
