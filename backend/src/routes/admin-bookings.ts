/**
 * Super-admin view over every accommodation's bookings and availability.
 * Mutations (block / unblock / accept / reject / cancel) reuse the owner-hotel endpoints, which accept
 * ADMIN for any property and record who did what.
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth';
import { Venue } from '../models/Venue';
import { Room } from '../models/Room';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { logger } from '../config/logger';
import { DEFAULT_TZ, addDays, bookingSummary, buildManagementCalendar, parseDay, todayInZone, toDay } from '../services/bookingEngine';

const router = Router();
router.use(authenticate, requireAdmin);

const ACCOMMODATION_TYPES = ['HOTEL', 'MAISON_DHOTE'];

// GET /admin-bookings/properties — every accommodation with its owner and bookability
router.get('/properties', async (_req: AuthRequest, res) => {
  try {
    const venues: any[] = await Venue.find({ type: { $in: ACCOMMODATION_TYPES }, archivedAt: null })
      .populate('ownerId', 'fullName email')
      .select('name slug type city isDemo isPublished ownerId timezone')
      .sort({ name: 1 })
      .lean();
    const counts = await Room.aggregate([
      { $match: { venueId: { $in: venues.map((v) => v._id) }, isActive: true, isReservable: true } },
      { $group: { _id: '$venueId', n: { $sum: 1 } } },
    ]);
    const roomsBy = new Map<string, number>(counts.map((c: any) => [String(c._id), c.n]));
    return sendSuccess(res, {
      data: venues.map((v) => ({
        id: String(v._id),
        name: v.name,
        slug: v.slug,
        type: v.type,
        city: v.city,
        isDemo: !!v.isDemo,
        isPublished: v.isPublished !== false,
        timezone: v.timezone || DEFAULT_TZ,
        owner: v.ownerId ? { id: String(v.ownerId._id), fullName: v.ownerId.fullName, email: v.ownerId.email } : null,
        roomsCount: roomsBy.get(String(v._id)) ?? 0,
        bookable: !v.isDemo && (roomsBy.get(String(v._id)) ?? 0) > 0,
      })),
    });
  } catch (err) {
    logger.error('admin-bookings/properties failed', err);
    return sendError(res, { message: 'Échec du chargement des hébergements.', statusCode: 500 });
  }
});

// GET /admin-bookings/summary?venueId=&ownerId=&from=&to=
router.get('/summary', async (req: AuthRequest, res) => {
  try {
    let venueIds: unknown[] | undefined;
    const venueId = typeof req.query.venueId === 'string' ? req.query.venueId : '';
    const ownerId = typeof req.query.ownerId === 'string' ? req.query.ownerId : '';
    if (venueId && mongoose.Types.ObjectId.isValid(venueId)) venueIds = [new mongoose.Types.ObjectId(venueId)];
    else if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
      venueIds = await Venue.find({ ownerId, type: { $in: ACCOMMODATION_TYPES } }).distinct('_id');
    }
    const data = await bookingSummary({
      venueIds,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });
    return sendSuccess(res, { data });
  } catch (err) {
    logger.error('admin-bookings/summary failed', err);
    return sendError(res, { message: 'Échec du chargement des statistiques.', statusCode: 500 });
  }
});

// GET /admin-bookings/properties/:venueId/calendar?from=&to=
router.get('/properties/:venueId/calendar', async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.venueId)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
    const venue: any = await Venue.findById(req.params.venueId).lean();
    if (!venue) return sendError(res, { message: 'Hébergement introuvable.', statusCode: 404 });
    const tz = venue.timezone || DEFAULT_TZ;
    const today = todayInZone(tz);
    const from = typeof req.query.from === 'string' ? req.query.from : today.slice(0, 8) + '01';
    const start = parseDay(from);
    const to = typeof req.query.to === 'string' ? req.query.to : start ? toDay(addDays(start, 41)) : today;
    try {
      const data = await buildManagementCalendar(String(venue._id), from, to, tz);
      return sendSuccess(res, { data: { venue: { id: String(venue._id), name: venue.name, isDemo: !!venue.isDemo }, ...data } });
    } catch {
      return sendError(res, { message: 'Plage de dates invalide (190 jours maximum).', statusCode: 400 });
    }
  } catch (err) {
    logger.error('admin-bookings/calendar failed', err);
    return sendError(res, { message: 'Échec du chargement du calendrier.', statusCode: 500 });
  }
});

export default router;
