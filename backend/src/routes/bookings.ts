/**
 * Public booking API (no account required).
 *
 *   GET  /bookings/venues/:venueId/calendar?from&to   per-night availability
 *   POST /bookings/quote                              server-side price + availability
 *   POST /bookings/requests                           create a booking request (status: pending)
 *   GET  /bookings/requests/:reference?token=         secure lookup of one's own request
 *
 * Prices, availability and ownership are NEVER taken from the client: everything is recomputed here.
 */
import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Venue } from '../models/Venue';
import { Room } from '../models/Room';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { guardPublicVenueParam, isPublicVenue } from '../config/publicCatalog';
import {
  DEFAULT_TZ,
  addDays,
  buildCalendar,
  createBookingRequest,
  parseDay,
  quoteStay,
  todayInZone,
  toDay,
  tokenMatches,
} from '../services/bookingEngine';
import { sendEmail } from '../services/email.service';
import { logger } from '../config/logger';

const router = Router();
router.param('venueId', guardPublicVenueParam);

const DEMO_MESSAGE =
  "Cette maison d'hôtes est présentée à titre de démonstration. Les réservations ne sont pas encore ouvertes.";

const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de requêtes.' } });
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
  website: z.string().optional(), // honeypot
});

function validationError(res: Response, err: z.ZodError) {
  return res.status(422).json({ error: 'Données invalides.', code: 'VALIDATION', fields: err.flatten().fieldErrors });
}

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
      calendar = await buildCalendar(String(venue._id), from, to, tz);
    } catch (e) {
      return res.status(400).json({ error: 'Plage de dates invalide (190 jours maximum).' });
    }
    const configured = calendar.rooms.length > 0;
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      venue: { id: String(venue._id), slug: venue.slug, name: venue.name, timezone: tz, isDemo: !!venue.isDemo },
      bookable: !venue.isDemo && configured,
      reason: venue.isDemo ? 'DEMO' : configured ? undefined : 'NOT_CONFIGURED',
      ...calendar,
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
    if (venue.isDemo) return res.json({ ok: true, available: false, reason: 'DEMO', message: DEMO_MESSAGE, nights: 0 });
    const quote = await quoteStay(venue, parsed.data);
    if (!quote.ok) return res.status(400).json(quote);
    return res.json(quote);
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
    if (venue.isDemo) return res.status(403).json({ error: DEMO_MESSAGE, code: 'DEMO_VENUE_NOT_BOOKABLE' });

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
    if (!result.replay) void notifyNewRequest(r, venue);
    return res.status(result.replay ? 200 : 201).json({
      reference: r.reservationCode,
      status: r.status,
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
router.get('/requests/:reference', readLimiter, async (req: Request, res: Response) => {
  try {
    const reservation: any = await Reservation.findOne({ reservationCode: req.params.reference, source: 'web-request' }).select('+accessTokenHash');
    // Same answer for "unknown" and "wrong token": no enumeration.
    if (!reservation || !tokenMatches(req.query.token, reservation.accessTokenHash)) {
      return res.status(404).json({ error: 'Réservation introuvable.' });
    }
    const venue: any = await Venue.findById(reservation.venueId).lean();
    const last = (reservation.statusHistory ?? []).slice(-1)[0];
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      reference: reservation.reservationCode,
      status: reservation.status,
      statusReason: ['rejected', 'cancelled', 'expired'].includes(String(reservation.status).toLowerCase()) ? last?.reason : undefined,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      summary: await summarise(reservation, venue),
    });
  } catch (err) {
    logger.error('bookings/lookup failed', err);
    return res.status(500).json({ error: 'Erreur.' });
  }
});

async function summarise(r: any, venue: any) {
  const room: any = r.roomId ? await Room.findById(r.roomId).select('name roomNumber').lean() : null;
  return {
    venueName: venue?.name,
    roomName: room ? room.name || `Chambre ${room.roomNumber}` : undefined,
    checkIn: toDay(new Date(r.startAt)),
    checkOut: toDay(new Date(r.endAt)),
    nights: r.nights,
    adults: r.adults,
    children: r.children,
    total: r.totalPrice > 0 ? r.totalPrice : null,
    currency: 'TND',
    customerName: [r.customerFirstName, r.customerLastName].filter(Boolean).join(' '),
  };
}

/** Best-effort e-mails: owner (new request) + customer (receipt). Never blocks or fails the request. */
async function notifyNewRequest(r: any, venue: any) {
  try {
    const s = await summarise(r, venue);
    const owner: any = venue.ownerId ? await User.findById(venue.ownerId).select('email fullName').lean() : null;
    const line = `${s.venueName} — ${s.checkIn} → ${s.checkOut} (${s.nights} nuit${s.nights > 1 ? 's' : ''}), ${s.adults} adulte(s)${s.children ? `, ${s.children} enfant(s)` : ''}`;
    if (owner?.email) {
      await sendEmail({
        to: owner.email,
        subject: `Nouvelle demande de réservation ${r.reservationCode}`,
        html: `<p>Bonjour ${owner.fullName ?? ''},</p><p>Une nouvelle demande de réservation est en attente de votre confirmation.</p><p><strong>${line}</strong><br/>Client : ${s.customerName} — ${r.customerPhone} — ${r.customerEmail}</p><p>Connectez-vous à votre espace propriétaire pour la confirmer ou la refuser. Sans réponse, elle expirera automatiquement.</p>`,
      });
    }
    await sendEmail({
      to: r.customerEmail,
      subject: `Votre demande de réservation ${r.reservationCode}`,
      html: `<p>Bonjour ${s.customerName},</p><p>Nous avons bien reçu votre demande : <strong>${line}</strong>.</p><p>Référence : <strong>${r.reservationCode}</strong>. Elle est en attente de confirmation par la maison d'hôtes ; vous serez informé(e) de sa décision. Aucun paiement n'est demandé à ce stade.</p>`,
    });
  } catch (err) {
    logger.warn('bookings: notification failed', { error: String(err) });
  }
}

export default router;
