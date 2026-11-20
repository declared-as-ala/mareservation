/**
 * Public catalogue visibility (feature flag).
 *
 * Exploria360 launches with maisons d'hôtes only. Every other venue type keeps
 * its data, models, owner/admin tooling and historical reservations — it is
 * simply not exposed on PUBLIC discovery endpoints.
 *
 * Configure with the env var PUBLIC_VENUE_TYPES (comma separated), e.g.
 *   PUBLIC_VENUE_TYPES=MAISON_DHOTE                -> launch default
 *   PUBLIC_VENUE_TYPES=MAISON_DHOTE,HOTEL,RESTAURANT -> re-enable later
 *
 * Optional second gate, PUBLIC_VENUE_SLUGS (comma separated slugs): when set,
 * ONLY those venues are public, even if their type is enabled. Use it to keep
 * demo/seed or not-yet-verified properties private without touching the DB.
 *
 * Read lazily (not at import time) because dotenv.config() runs after imports.
 */
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Venue, type VenueType } from '../models/Venue';

const DEFAULT_PUBLIC_TYPES: VenueType[] = ['MAISON_DHOTE'];

let cached: { raw: string | undefined; types: VenueType[] } | null = null;

export function getPublicVenueTypes(): VenueType[] {
  const raw = process.env.PUBLIC_VENUE_TYPES;
  if (cached && cached.raw === raw) return cached.types;
  const parsed = (raw ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean) as VenueType[];
  const types = parsed.length ? parsed : DEFAULT_PUBLIC_TYPES;
  cached = { raw, types };
  return types;
}

export function getPublicVenueSlugs(): string[] | null {
  const parsed = (process.env.PUBLIC_VENUE_SLUGS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length ? parsed : null;
}

export function isPublicVenueType(type: unknown): boolean {
  return typeof type === 'string' && (getPublicVenueTypes() as string[]).includes(type);
}

/** Type enabled AND (no slug allowlist OR slug in allowlist). */
export function isPublicVenue(venue: { type?: unknown; slug?: unknown } | null | undefined): boolean {
  if (!venue || !isPublicVenueType(venue.type)) return false;
  const slugs = getPublicVenueSlugs();
  if (!slugs) return true;
  return typeof venue.slug === 'string' && slugs.includes(venue.slug.toLowerCase());
}

/** Mongo filter fragment for PUBLIC venue listings. */
export function publicVenueFilter(): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    type: { $in: getPublicVenueTypes() },
    isPublished: { $ne: false },
    archivedAt: null,
  };
  const slugs = getPublicVenueSlugs();
  if (slugs) filter.slug = { $in: slugs };
  return filter;
}

/** Ids of venues visible on public surfaces (used to scope events, rooms, …). */
export async function getPublicVenueIds(): Promise<mongoose.Types.ObjectId[]> {
  return Venue.find(publicVenueFilter()).distinct('_id');
}

/**
 * router.param handler: 404 when the venue (id or slug) belongs to a type that
 * is not publicly enabled. Unknown ids fall through so the route's own 404
 * logic still applies. Use ONLY on public routers.
 */
export async function guardPublicVenueParam(
  req: Request,
  res: Response,
  next: NextFunction,
  value: string
): Promise<void> {
  try {
    const query =
      mongoose.Types.ObjectId.isValid(value) && value.length === 24 ? { _id: value } : { slug: value };
    const venue = await Venue.findOne(query).select('type slug').lean();
    if (venue && !isPublicVenue(venue as { type?: string; slug?: string })) {
      res.status(404).json({ error: 'Lieu non trouvé' });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

const UNAVAILABLE = { error: "Ce type de réservation n'est pas disponible actuellement." };
const DEMO_BLOCKED = {
  error: "Cette maison d'hôtes est présentée à titre de démonstration. Les réservations ne sont pas encore ouvertes.",
  code: 'DEMO_VENUE_NOT_BOOKABLE',
};

/**
 * Blocks NEW bookings/holds for venues whose type is not publicly enabled.
 * Reads req.body.venueId. Existing reservations, confirmations and history are
 * unaffected (they never pass through this guard).
 */
export async function requirePublicVenueInBody(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const venueId = req.body?.venueId;
    if (venueId && mongoose.Types.ObjectId.isValid(String(venueId))) {
      const venue = await Venue.findById(venueId).select('type slug isDemo').lean();
      if (venue && (venue as { isDemo?: boolean }).isDemo) {
        res.status(403).json(DEMO_BLOCKED);
        return;
      }
      if (venue && !isPublicVenue(venue as { type?: string; slug?: string })) {
        res.status(403).json(UNAVAILABLE);
        return;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Same as above for event ticket orders (req.body.eventId → event.venueId). */
export async function requirePublicEventInBody(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const eventId = req.body?.eventId;
    if (eventId && mongoose.Types.ObjectId.isValid(String(eventId))) {
      const { Event } = await import('../models/Event');
      const event = await Event.findById(eventId).select('venueId').lean();
      const venue = event ? await Venue.findById((event as { venueId?: unknown }).venueId).select('type slug').lean() : null;
      if (venue && !isPublicVenue(venue as { type?: string; slug?: string })) {
        res.status(403).json(UNAVAILABLE);
        return;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
