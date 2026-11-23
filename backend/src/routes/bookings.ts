/**
 * Public booking API (no account required).
 *
 *   GET  /bookings/search?...                          discovery: filters, dates, map bounds, sort
 *   GET  /bookings/venues/:venueId/calendar?from&to   per-night availability (+ booking profile)
 *   POST /bookings/quote                              server-side price + availability
 *   POST /bookings/requests                           create a booking (pending, or confirmed if instant)
 *   GET  /bookings/requests/:reference?token=         secure lookup of one's own booking
 *   POST /bookings/requests/:reference/cancel         guest cancellation (token)
 *
 * Prices, availability and ownership are NEVER taken from the client: everything is recomputed here.
 */
import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Venue } from '../models/Venue';
import { Room } from '../models/Room';
import { Reservation } from '../models/Reservation';
import { guardPublicVenueParam, isPublicVenue, publicVenueFilter } from '../config/publicCatalog';
import {
  DEFAULT_TZ,
  addDays,
  buildCalendar,
  canTransition,
  createBookingRequest,
  loadInventory,
  normalizeStatus,
  parseDay,
  pushStatus,
  quoteStay,
  todayInZone,
  toDay,
  tokenMatches,
  validateStayDates,
  venueBookability,
} from '../services/bookingEngine';
import { notifyBookingEvent } from '../services/bookingEmails';
import { publishAvailabilityEvent } from '../services/availabilityEvents';
import { logger } from '../config/logger';
import { FEATURE_KEYS, TUNISIA_GOVERNORATES } from '../config/tunisia';

const router = Router();
router.param('venueId', guardPublicVenueParam);

const readLimiter = rateLimit({ windowMs: 60 * 1000, max: Number(process.env.BOOKING_READ_LIMIT) || 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de requêtes.' } });
const writeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: Number(process.env.BOOKING_WRITE_LIMIT) || 12, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' } });

async function findVenue(idOrSlug: string) {
  const query = mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24 ? { _id: idOrSlug } : { slug: idOrSlug };
  const venue: any = await Venue.findOne(query).lean();
  if (!venue || !isPublicVenue(venue)) return null;
  return venue;
}

const phoneRe = /^[+0-9 ().-]{6,20}$/;
const guestSchema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(80),
  lastName: z.string().trim().min(1, 'Nom requis').max(80),
  email: z.string().trim().toLowerCase().email('Email invalide').max(160),
  phone: z.string().trim().regex(phoneRe, 'Téléphone invalide'),
});
const stayShape = {
  venueId: z.string().min(1),
  roomId: z.string().optional(),
  roomIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(6).optional(),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.coerce.number().int().min(1).max(20),
  children: z.coerce.number().int().min(0).max(20).default(0),
};
const quoteSchema = z.object(stayShape);
const requestSchema = z.object({
  ...stayShape,
  guest: guestSchema,
  specialRequest: z.string().trim().max(1000).optional(),
  acceptTerms: z.literal(true).optional(),
  website: z.string().optional(), // honeypot
});

function validationError(res: Response, err: z.ZodError) {
  return res.status(422).json({ error: 'Données invalides.', code: 'VALIDATION', fields: err.flatten().fieldErrors });
}

/** Public booking profile of a venue (what the widget needs to render rules & fees). */
async function bookingProfile(venue: any) {
  const b = venueBookability(venue);
  const inv = await loadInventory(venue);
  const configured = inv.units.length > 0 && inv.units.some((u) => u.pricePerNight > 0);
  return {
    bookable: b.bookable && configured,
    demo: b.demo,
    reason: !b.bookable ? (b.code === 'DEMO_VENUE_NOT_BOOKABLE' ? 'DEMO' : b.code) : configured ? undefined : 'NOT_CONFIGURED',
    message: !b.bookable ? b.message : undefined,
    bookingMode: b.bookable ? b.mode : venue.bookingMode === 'instant' ? 'instant' : 'request',
    rentalMode: inv.mode,
    minimumNights: Math.max(1, Number(venue.minimumNights) || 1),
    maxGuests: venue.maxGuests ?? (inv.units.reduce((a, u) => a + u.capacity, 0) || null),
    cleaningFee: Number(venue.cleaningFee) || 0,
    serviceFee: Number(venue.serviceFee) || 0,
    cancellationPolicy: venue.cancellationPolicy ?? 'moderate',
    requestTtlHours: Number(process.env.BOOKING_REQUEST_TTL_HOURS) || 48,
  };
}

/* ── search (discovery page + map) ─────────────────────────── */
const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  where: z.string().trim().max(80).optional(),
  governorate: z.string().trim().max(40).optional(),
  city: z.string().trim().max(60).optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  adults: z.coerce.number().int().min(1).max(20).optional(),
  children: z.coerce.number().int().min(0).max(20).optional(),
  minPrice: z.coerce.number().min(0).max(100000).optional(),
  maxPrice: z.coerce.number().min(0).max(100000).optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  guests: z.coerce.number().int().min(1).max(50).optional(),
  features: z.string().max(300).optional(),
  instant: z.enum(['1', 'true']).optional(),
  tour: z.enum(['1', 'true']).optional(),
  bbox: z.string().regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/).optional(), // west,south,east,north
  sort: z.enum(['recommended', 'price_asc', 'price_desc', 'newest']).default('recommended'),
});

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/search', readLimiter, async (req: Request, res: Response) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const f = parsed.data;
  try {
    const and: Record<string, unknown>[] = [publicVenueFilter(), { type: 'MAISON_DHOTE' }];
    if (f.governorate) and.push({ governorate: new RegExp(`^${escapeRegex(f.governorate)}$`, 'i') });
    if (f.city) and.push({ city: new RegExp(`^${escapeRegex(f.city)}$`, 'i') });
    if (f.where) {
      const rx = new RegExp(`^${escapeRegex(f.where)}$`, 'i');
      and.push({ $or: [{ city: rx }, { governorate: rx }] });
    }
    if (f.q) {
      const rx = new RegExp(escapeRegex(f.q), 'i');
      and.push({ $or: [{ name: rx }, { city: rx }, { governorate: rx }, { shortDescription: rx }] });
    }
    const wanted = (f.features ?? '').split(',').map((s) => s.trim()).filter((s) => (FEATURE_KEYS as readonly string[]).includes(s));
    if (wanted.length) and.push({ features: { $all: wanted } });
    if (f.instant) and.push({ bookingMode: 'instant' });
    if (f.tour) and.push({ $or: [{ hasVirtualTour: true }, { immersiveUrl: { $nin: [null, ''] } }] });
    if (f.bbox) {
      const [w, s, e, n] = f.bbox.split(',').map(Number);
      and.push({ 'coordinates.lat': { $gte: s, $lte: n }, 'coordinates.lng': { $gte: w, $lte: e } });
    }

    const venues: any[] = await Venue.find({ $and: and })
      .select('name slug type shortDescription city governorate address coverImage gallery coordinates features bookingMode rentalMode entirePricePerNight minimumNights maxGuests bedrooms beds bathrooms isDemo bookingEnabled isPublished approvalStatus archivedAt hasVirtualTour immersiveUrl rating ratingCount isFeatured createdAt cleaningFee serviceFee')
      .limit(200)
      .lean();
    const ids = venues.map((v) => v._id);
    const rooms = await Room.aggregate([
      { $match: { venueId: { $in: ids }, isActive: true, isReservable: true } },
      { $group: { _id: '$venueId', minPrice: { $min: { $cond: [{ $gt: ['$pricePerNight', 0] }, '$pricePerNight', null] } }, count: { $sum: 1 }, capacity: { $sum: '$capacity' } } },
    ]);
    const roomInfo = new Map(rooms.map((r: any) => [String(r._id), r]));

    const guestsWanted = f.guests ?? (f.adults ? f.adults + (f.children ?? 0) : undefined);
    const stay = f.checkIn || f.checkOut ? validateStayDates(f.checkIn, f.checkOut, DEFAULT_TZ) : null;
    if (stay && !stay.ok) return res.status(400).json({ error: stay.error, code: stay.code });

    const results = [];
    for (const v of venues) {
      const ri: any = roomInfo.get(String(v._id));
      const entire = v.rentalMode === 'entire';
      const fromPrice: number | null = entire ? (v.entirePricePerNight > 0 ? v.entirePricePerNight : null) : ri?.minPrice ?? null;
      const capacity: number | null = v.maxGuests ?? (entire ? null : ri?.capacity ?? null);
      const bedrooms: number | null = v.bedrooms ?? (entire ? null : ri?.count ?? null);
      if (guestsWanted && (capacity == null || capacity < guestsWanted)) continue;
      if (f.bedrooms && (bedrooms == null || bedrooms < f.bedrooms)) continue;
      if (f.minPrice != null && (fromPrice == null || fromPrice < f.minPrice)) continue;
      if (f.maxPrice != null && (fromPrice == null || fromPrice > f.maxPrice)) continue;

      const b = venueBookability(v);
      let availability: { available: boolean; total: number | null; nights: number; message?: string } | undefined;
      if (stay?.ok) {
        if (!b.bookable) continue; // dates requested: only listings that can actually take them
        const q = await quoteStay(v, { checkIn: f.checkIn, checkOut: f.checkOut, adults: f.adults ?? Math.max(1, guestsWanted ?? 2), children: f.children ?? 0 });
        if (!q.ok || !q.available || q.total == null) continue;
        availability = { available: true, total: q.total, nights: q.nights };
      }
      results.push({
        id: String(v._id),
        slug: v.slug,
        name: v.name,
        shortDescription: v.shortDescription,
        city: v.city,
        governorate: v.governorate ?? null,
        coverImage: v.coverImage ?? v.gallery?.[0] ?? null,
        coordinates: v.coordinates?.lat != null && v.coordinates?.lng != null ? { lat: v.coordinates.lat, lng: v.coordinates.lng } : null,
        features: v.features ?? [],
        fromPrice,
        maxGuests: capacity,
        bedrooms,
        bathrooms: v.bathrooms ?? null,
        instantBooking: v.bookingMode === 'instant' && b.bookable,
        bookable: b.bookable && fromPrice != null,
        isDemo: !!v.isDemo,
        hasVirtualTour: !!(v.hasVirtualTour || v.immersiveUrl),
        // Only real, review-backed ratings are exposed.
        rating: v.ratingCount > 0 ? v.rating : null,
        ratingCount: v.ratingCount > 0 ? v.ratingCount : 0,
        isFeatured: !!v.isFeatured,
        createdAt: v.createdAt,
        availability,
      });
    }

    const price = (x: any) => x.availability?.total ?? x.fromPrice;
    results.sort((a, b) => {
      if (f.sort === 'price_asc') return (price(a) ?? Infinity) - (price(b) ?? Infinity);
      if (f.sort === 'price_desc') return (price(b) ?? -1) - (price(a) ?? -1);
      if (f.sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      // recommended: bookable real listings first, then featured, tour, rating, newest
      const score = (x: any) => (x.bookable && !x.isDemo ? 8 : 0) + (x.isFeatured ? 4 : 0) + (x.hasVirtualTour ? 2 : 0) + (x.rating ?? 0) / 5;
      return score(b) - score(a) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ total: results.length, results, governorates: TUNISIA_GOVERNORATES, features: FEATURE_KEYS });
  } catch (err) {
    logger.error('bookings/search failed', err);
    return res.status(500).json({ error: 'Recherche impossible.' });
  }
});

/* ── destinations (home page + autocomplete) ───────────────── */
router.get('/destinations', readLimiter, async (_req: Request, res: Response) => {
  try {
    const venues: any[] = await Venue.find({ $and: [publicVenueFilter(), { type: 'MAISON_DHOTE' }] })
      .select('city governorate coverImage gallery isDemo')
      .lean();
    const byKey = new Map<string, { name: string; governorate: string | null; kind: 'city' | 'governorate'; count: number; image: string | null }>();
    const add = (name: string, kind: 'city' | 'governorate', governorate: string | null, image: string | null) => {
      const key = `${kind}:${name.toLowerCase()}`;
      const cur = byKey.get(key);
      if (cur) {
        cur.count += 1;
        if (!cur.image && image) cur.image = image;
      } else byKey.set(key, { name, kind, governorate, count: 1, image });
    };
    for (const v of venues) {
      const img = v.coverImage ?? v.gallery?.[0] ?? null;
      if (v.governorate) add(v.governorate, 'governorate', v.governorate, img);
      // Demo listings have no real city.
      if (v.city && v.city !== v.governorate && !/^tunisie$/i.test(v.city)) add(v.city, 'city', v.governorate ?? null, img);
    }
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ total: venues.length, destinations: [...byKey.values()].sort((a, b) => b.count - a.count), governorates: TUNISIA_GOVERNORATES });
  } catch (err) {
    logger.error('bookings/destinations failed', err);
    return res.status(500).json({ error: 'Erreur.' });
  }
});

/* ── calendar ─────────────────────────────────────────────── */
router.get('/venues/:venueId/calendar', readLimiter, async (req: Request, res: Response) => {
  try {
    const venue = await findVenue(req.params.venueId);
    if (!venue) return res.status(404).json({ error: 'Lieu non trouvé' });
    const tz = venue.timezone || DEFAULT_TZ;
    const today = todayInZone(tz);
    const from = typeof req.query.from === 'string' ? req.query.from : today;
    const start = parseDay(from);
    if (!start) return res.status(400).json({ error: 'Paramètre from invalide (AAAA-MM-JJ).' });
    const to = typeof req.query.to === 'string' ? req.query.to : toDay(addDays(start, 89));

    let calendar;
    try {
      calendar = await buildCalendar(venue, from, to, tz);
    } catch {
      return res.status(400).json({ error: 'Plage de dates invalide (190 jours maximum).' });
    }
    const profile = await bookingProfile(venue);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      venue: { id: String(venue._id), slug: venue.slug, name: venue.name, timezone: tz, isDemo: !!venue.isDemo },
      ...profile,
      ...calendar,
      // Closed listings expose no per-night prices.
      days: profile.bookable ? calendar.days : Object.fromEntries(Object.entries(calendar.days).map(([k, d]) => [k, { ...d, price: null }])),
    });
  } catch (err) {
    logger.error('bookings/calendar failed', err);
    return res.status(500).json({ error: 'Impossible de charger les disponibilités.' });
  }
});

/* ── quote ────────────────────────────────────────────────── */
router.post('/quote', readLimiter, async (req: Request, res: Response) => {
  const parsed = quoteSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const venue = await findVenue(parsed.data.venueId);
    if (!venue) return res.status(404).json({ error: 'Lieu non trouvé' });
    const b = venueBookability(venue);
    if (!b.bookable) return res.json({ ok: true, available: false, reason: b.code === 'DEMO_VENUE_NOT_BOOKABLE' ? 'DEMO' : b.code, message: b.message, nights: 0 });
    const quote = await quoteStay(venue, parsed.data);
    if (!quote.ok) return res.status(400).json(quote);
    return res.json({ ...quote, demo: b.demo, bookingMode: b.mode });
  } catch (err) {
    logger.error('bookings/quote failed', err);
    return res.status(500).json({ error: 'Impossible de calculer le tarif.' });
  }
});

/* ── create request ───────────────────────────────────────── */
router.post('/requests', writeLimiter, async (req: Request, res: Response) => {
  const parsed = requestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  if (parsed.data.website) return res.status(400).json({ error: 'Requête invalide.' });

  try {
    const venue = await findVenue(parsed.data.venueId);
    if (!venue) return res.status(404).json({ error: 'Lieu non trouvé' });

    const rawKey = req.header('Idempotency-Key');
    const idempotencyKey = rawKey && /^[A-Za-z0-9_-]{8,100}$/.test(rawKey) ? rawKey : undefined;

    const result = await createBookingRequest({
      venue,
      stay: parsed.data,
      guest: parsed.data.guest,
      specialRequest: parsed.data.specialRequest,
      idempotencyKey,
    });
    if (!result.ok) return res.status(result.status).json({ error: result.error, code: result.code });

    const r = result.reservation;
    if (!result.replay) {
      const event = normalizeStatus(r.status) === 'confirmed' ? 'instant_confirmed' : 'request_received';
      void notifyBookingEvent(r._id, event, { trackToken: result.accessToken });
    }
    return res.status(result.replay ? 200 : 201).json({
      reference: r.reservationCode,
      status: r.status,
      bookingMode: r.bookingMode,
      isDemo: !!r.isDemo,
      paymentStatus: r.paymentStatus,
      replay: result.replay,
      // The secret is shown exactly once (never stored in clear).
      accessToken: result.accessToken,
      expiresAt: r.expiresAt,
      summary: await summarise(r, venue),
    });
  } catch (err) {
    logger.error('bookings/requests failed', err);
    return res.status(500).json({ error: "Impossible d'enregistrer la demande." });
  }
});

/* ── secure lookup ────────────────────────────────────────── */
async function findByToken(reference: string, token: unknown) {
  const reservation: any = await Reservation.findOne({ reservationCode: reference, source: 'web-request' }).select('+accessTokenHash');
  if (!reservation || !tokenMatches(token, reservation.accessTokenHash)) return null;
  return reservation;
}

function cancellable(r: any, tz: string): boolean {
  const st = normalizeStatus(r.status);
  if (st !== 'pending' && st !== 'confirmed') return false;
  return toDay(new Date(r.startAt)) > todayInZone(tz);
}

router.get('/requests/:reference', readLimiter, async (req: Request, res: Response) => {
  try {
    const reservation = await findByToken(req.params.reference, req.query.token);
    // Same answer for "unknown" and "wrong token": no enumeration.
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable.' });
    const venue: any = await Venue.findById(reservation.venueId).lean();
    const last = (reservation.statusHistory ?? []).slice(-1)[0];
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      reference: reservation.reservationCode,
      status: reservation.status,
      statusReason: ['rejected', 'cancelled', 'expired'].includes(normalizeStatus(reservation.status)) ? last?.reason : undefined,
      isDemo: !!reservation.isDemo,
      bookingMode: reservation.bookingMode,
      paymentStatus: reservation.paymentStatus,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      cancellable: cancellable(reservation, venue?.timezone || DEFAULT_TZ),
      cancellationPolicy: venue?.cancellationPolicy ?? 'moderate',
      cancellationNotes: venue?.cancellationNotes,
      arrivalInstructions: normalizeStatus(reservation.status) === 'confirmed' ? venue?.arrivalInstructions : undefined,
      history: (reservation.statusHistory ?? []).map((h: any) => ({ to: h.to, at: h.at, reason: h.reason })),
      summary: await summarise(reservation, venue),
    });
  } catch (err) {
    logger.error('bookings/lookup failed', err);
    return res.status(500).json({ error: 'Erreur.' });
  }
});

const cancelSchema = z.object({ token: z.string().min(10).max(200), reason: z.string().trim().max(500).optional() });

router.post('/requests/:reference/cancel', writeLimiter, async (req: Request, res: Response) => {
  const parsed = cancelSchema.safeParse(req.body ?? {});
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const reservation = await findByToken(req.params.reference, parsed.data.token);
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable.' });
    const venue: any = await Venue.findById(reservation.venueId).select('timezone').lean();
    if (!cancellable(reservation, venue?.timezone || DEFAULT_TZ) || !canTransition(reservation.status, 'cancelled')) {
      return res.status(409).json({ error: 'Cette réservation ne peut plus être annulée en ligne. Contactez la maison d’hôtes.', code: 'NOT_CANCELLABLE' });
    }
    const from = reservation.status;
    pushStatus(reservation, 'cancelled', { role: 'CUSTOMER' }, parsed.data.reason || 'Annulée par le client');
    reservation.expiresAt = undefined;
    // Optimistic guard: only if nobody changed the status meanwhile.
    const upd = await Reservation.updateOne(
      { _id: reservation._id, status: from },
      { $set: { status: 'cancelled', statusHistory: reservation.statusHistory }, $unset: { expiresAt: 1 } }
    );
    if (!upd.modifiedCount) return res.status(409).json({ error: 'La réservation a changé entre-temps. Rechargez la page.', code: 'CONFLICT' });
    publishAvailabilityEvent({ venueId: String(reservation.venueId), type: 'reservation_cancelled', at: new Date().toISOString(), reservationId: String(reservation._id) });
    void notifyBookingEvent(reservation._id, 'cancelled_by_customer');
    return res.json({ reference: reservation.reservationCode, status: 'cancelled' });
  } catch (err) {
    logger.error('bookings/cancel failed', err);
    return res.status(500).json({ error: 'Annulation impossible.' });
  }
});

async function summarise(r: any, venue: any) {
  let roomName: string | undefined;
  if (r.unitScope === 'entire') roomName = 'Maison entière';
  else {
    const ids = r.roomIds?.length ? r.roomIds : r.roomId ? [r.roomId] : [];
    const rooms: any[] = ids.length ? await Room.find({ _id: { $in: ids } }).select('name roomNumber').lean() : [];
    roomName = rooms.map((x) => x.name || `Chambre ${x.roomNumber}`).join(' + ') || undefined;
  }
  return {
    venueName: venue?.name,
    venueSlug: venue?.slug,
    roomName,
    checkIn: toDay(new Date(r.startAt)),
    checkOut: toDay(new Date(r.endAt)),
    nights: r.nights,
    adults: r.adults,
    children: r.children,
    subtotal: r.priceBreakdown?.subtotal ?? null,
    cleaningFee: r.priceBreakdown?.cleaningFee ?? 0,
    serviceFee: r.priceBreakdown?.serviceFee ?? 0,
    total: r.totalPrice > 0 ? r.totalPrice : null,
    currency: 'TND',
    customerName: [r.customerFirstName, r.customerLastName].filter(Boolean).join(' '),
  };
}

export default router;
