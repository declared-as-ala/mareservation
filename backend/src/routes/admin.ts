import { Router, Request } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Venue } from '../models/Venue';
import { Reservation } from '../models/Reservation';
import { Event } from '../models/Event';
import { VirtualTour } from '../models/VirtualTour';
import { TourHotspot } from '../models/TourHotspot';
import { Table } from '../models/Table';
import { Room } from '../models/Room';
import { Seat } from '../models/Seat';
import { Scene } from '../models/Scene';
import { TablePlacement } from '../models/TablePlacement';
import { ReservableUnit } from '../models/ReservableUnit';
import { BannerSlide } from '../models/BannerSlide';
import { Category } from '../models/Category';
import { AppSettings } from '../models/AppSettings';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

function parseDays(query: string): number {
  const d = parseInt(query || '30', 10);
  return Math.min(Math.max(d, 1), 90);
}

// GET /api/admin/overview?range=7d|30d|90d
router.get('/overview', async (req: Request<unknown, unknown, unknown, { range?: string }>, res) => {
  try {
    const range = req.query.range || '30d';
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      totalUsers,
      newUsers7d,
      totalVenues,
      totalReservations,
      reservationsToday,
      reservations7d,
      cancelledLast30,
      confirmedLast30,
      revenue30d,
      activeVenuesCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      Venue.countDocuments(),
      Reservation.countDocuments(),
      Reservation.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: todayStart, $lt: todayEnd } }),
      Reservation.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: weekStart } }),
      Reservation.countDocuments({ status: 'CANCELLED', createdAt: { $gte: start } }),
      Reservation.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] }, createdAt: { $gte: start } }),
      Reservation.aggregate([{ $match: { status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: start } } }, { $group: { _id: null, sum: { $sum: '$totalPrice' } } }]).then((r) => r[0]?.sum ?? 0),
      Reservation.distinct('venueId', { status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: start } }).then((ids) => ids.length),
    ]);

    const totalLast30 = cancelledLast30 + confirmedLast30;
    const cancellationRate = totalLast30 > 0 ? Math.round((cancelledLast30 / totalLast30) * 100) : 0;

    res.json({
      totalUsers,
      newUsers7d,
      totalVenues,
      totalReservations,
      reservationsToday,
      reservations7d,
      cancellationRate30d: cancellationRate,
      revenue30d,
      activeVenues30d: activeVenuesCount,
    });
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des statistiques.' });
  }
});

// GET /api/admin/charts/reservations-daily?days=30
router.get('/charts/reservations-daily', async (req, res) => {
  try {
    const days = parseDays(req.query.days as string);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const result = await Reservation.aggregate([
      { $match: { status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(result.map((r) => ({ date: r._id, count: r.count })));
  } catch (error) {
    console.error('Error fetching reservations-daily:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// GET /api/admin/charts/revenue-daily?days=30
router.get('/charts/revenue-daily', async (req, res) => {
  try {
    const days = parseDays(req.query.days as string);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const result = await Reservation.aggregate([
      { $match: { status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startAt' } }, revenue: { $sum: '$totalPrice' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(result.map((r) => ({ date: r._id, revenue: r.revenue })));
  } catch (error) {
    console.error('Error fetching revenue-daily:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// GET /api/admin/charts/reservations-by-type?days=30
router.get('/charts/reservations-by-type', async (req, res) => {
  try {
    const days = parseDays(req.query.days as string);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const result = await Reservation.aggregate([
      { $match: { status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: start } } },
      { $group: { _id: '$bookingType', count: { $sum: 1 } } },
    ]);
    const map: Record<string, number> = { TABLE: 0, ROOM: 0, SEAT: 0 };
    result.forEach((r) => { map[r._id] = r.count; });
    res.json([
      { type: 'TABLE', count: map.TABLE, label: 'Table' },
      { type: 'ROOM', count: map.ROOM, label: 'Chambre' },
      { type: 'SEAT', count: map.SEAT, label: 'Siège' },
    ]);
  } catch (error) {
    console.error('Error fetching reservations-by-type:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// GET /api/admin/charts/reservations-by-city?days=30
router.get('/charts/reservations-by-city', async (req, res) => {
  try {
    const days = parseDays(req.query.days as string);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const result = await Reservation.aggregate([
      { $match: { status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: start } } },
      { $lookup: { from: 'venues', localField: 'venueId', foreignField: '_id', as: 'venue' } },
      { $unwind: '$venue' },
      { $group: { _id: '$venue.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(result.map((r) => ({ city: r._id, count: r.count })));
  } catch (error) {
    console.error('Error fetching reservations-by-city:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// GET /api/admin/charts/top-venues?days=30&limit=5
router.get('/charts/top-venues', async (req, res) => {
  try {
    const days = parseDays(req.query.days as string);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 20);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const result = await Reservation.aggregate([
      { $match: { status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: start } } },
      { $group: { _id: '$venueId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $lookup: { from: 'venues', localField: '_id', foreignField: '_id', as: 'venue' } },
      { $unwind: '$venue' },
      { $project: { venueName: '$venue.name', city: '$venue.city', count: 1 } },
    ]);
    res.json(result.map((r) => ({ venueName: r.venueName, city: r.city, count: r.count })));
  } catch (error) {
    console.error('Error fetching top-venues:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// GET /api/admin/charts/users-signups?days=30 (optional)
router.get('/charts/users-signups', async (req, res) => {
  try {
    const days = parseDays(req.query.days as string);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const result = await User.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(result.map((r) => ({ date: r._id, count: r.count })));
  } catch (error) {
    console.error('Error fetching users-signups:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// GET /api/admin/users?page=1&q=
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const q = String(req.query.q || '').trim();

    const filter: Record<string, unknown> = {};
    if (q) filter.email = new RegExp(q, 'i');

    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u: any) => u._id);
    const resCounts = await Reservation.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    resCounts.forEach((r) => { countMap[r._id.toString()] = r.count; });

    const usersWithCount = users.map((u: any) => ({
      ...u,
      reservationsCount: countMap[u._id.toString()] ?? 0,
    }));

    res.json({ users: usersWithCount, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs.' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const allowed = ['role', 'isActive', 'fullName'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in (req.body ?? {})) update[key] = (req.body as any)[key];
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erreur de mise à jour de l’utilisateur.' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    if (String(req.userId) === req.params.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte administrateur.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ success: true, message: 'Utilisateur supprimé.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erreur de suppression de l’utilisateur.' });
  }
});

// GET /api/admin/venues?page=1&type=&city=&q=
router.get('/venues', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const type = req.query.type as string;
    const city = req.query.city as string;
    const q = String(req.query.q || '').trim();

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (city) filter.city = city;
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { city: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
      ];
    }

    const [venues, total] = await Promise.all([
      Venue.find(filter).sort({ rating: -1 }).skip(skip).limit(limit).lean(),
      Venue.countDocuments(filter),
    ]);

    const venueIds = venues.map((v: any) => v._id);
    const resCounts = await Reservation.aggregate([
      { $match: { venueId: { $in: venueIds }, status: { $in: ['PENDING', 'CONFIRMED'] } } },
      { $group: { _id: '$venueId', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    resCounts.forEach((r) => { countMap[r._id.toString()] = r.count; });

    const venuesWithCount = venues.map((v: any) => ({
      ...v,
      reservationsCount: countMap[v._id.toString()] ?? 0,
    }));

    res.json({ venues: venuesWithCount, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des lieux.' });
  }
});

// GET /api/admin/reservations?page=1&status=&type=&city=&venueId=&from=&to=
router.get('/reservations', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const city = req.query.city as string;
    const venueId = req.query.venueId as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (type) filter.bookingType = type;
    if (venueId && mongoose.Types.ObjectId.isValid(venueId)) filter.venueId = venueId;
    if (from || to) {
      filter.startAt = {};
      if (from) (filter.startAt as any).$gte = new Date(from);
      if (to) (filter.startAt as any).$lte = new Date(to);
    }
    if (city) {
      const venueIdsInCity = await Venue.find({ city }).distinct('_id');
      filter.venueId = { $in: venueIdsInCity };
    }

    const [list, total] = await Promise.all([
      Reservation.find(filter)
        .populate('userId', 'fullName email')
        .populate('venueId', 'name city type')
        .populate('tableId', 'tableNumber price')
        .populate('roomId', 'roomNumber pricePerNight')
        .populate('seatId', 'seatNumber price')
        .sort({ startAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reservation.countDocuments(filter),
    ]);

    res.json({ reservations: list, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des réservations.' });
  }
});

// ── Venue CRUD (admin) ────────────────────────────────────────────────
// Admins can create / edit / delete any venue regardless of ownership.
const ALLOWED_VENUE_TYPES = [
  'CAFE', 'CAFE_LOUNGE', 'RESTAURANT', 'HOTEL', 'MAISON_DHOTE',
  'COWORKING', 'CINEMA', 'EVENT_SPACE',
] as const;

function slugify(input: string): string {
  return String(input)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

async function deleteSceneAndRelations(sceneId: string) {
  const scene = await Scene.findByIdAndDelete(sceneId);
  if (!scene) return null;
  await Promise.all([
    TablePlacement.deleteMany({ sceneId }),
    TourHotspot.deleteMany({ virtualTourId: sceneId }),
    TourHotspot.deleteMany({ targetType: 'scene', targetId: sceneId }),
  ]);
  if (scene.roomId) {
    const [remainingScenes, room] = await Promise.all([
      Scene.countDocuments({ roomId: scene.roomId, isActive: true }),
      Room.findById(scene.roomId),
    ]);
    if (room) {
      room.hasVirtualTour = Boolean(
        remainingScenes ||
        room.virtualTourUrl ||
        room.panoramicImages?.length
      );
      await room.save();
    }
  }
  return scene;
}

async function findSceneHotspots(sceneIds: Array<mongoose.Types.ObjectId | string>) {
  if (!sceneIds.length) return [];
  return TourHotspot.find({
    virtualTourId: { $in: sceneIds },
    targetType: 'scene',
    isActive: true,
  }).lean();
}

// POST /api/v1/admin/venues — create any venue type
router.post('/venues', async (req, res) => {
  try {
    const {
      name, type, city, governorate, address, description, shortDescription,
      coverImage, gallery, phone, slug, amenities, stars,
      startingPrice, priceRangeMin, priceRangeMax,
      isPublished, isFeatured, isVedette, reservationModes,
      immersiveType, immersiveSourceType, immersiveUrl, immersiveFile, immersiveProvider,
    } = req.body ?? {};

    if (!name || !type || !city || !address) {
      return res.status(400).json({ error: 'name, type, city, address requis.' });
    }
    const upperType = String(type).toUpperCase();
    if (!ALLOWED_VENUE_TYPES.includes(upperType as any)) {
      return res.status(400).json({ error: `Type invalide: ${type}.` });
    }

    // Slug — generate from name if missing, then make sure it's unique.
    let finalSlug = slug ? slugify(slug) : slugify(String(name));
    if (finalSlug) {
      const taken = await Venue.exists({ slug: finalSlug });
      if (taken) finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    const iType = ['none', 'virtual-tour', 'view-360'].includes(String(immersiveType || 'none'))
      ? String(immersiveType || 'none')
      : 'none';

    const venue = await Venue.create({
      name: String(name).trim(),
      type: upperType,
      slug: finalSlug || undefined,
      city: String(city).trim(),
      governorate: governorate ? String(governorate).trim() : undefined,
      address: String(address).trim(),
      description: description ? String(description).trim() : `${upperType.replace('_', ' ')} ${String(name).trim()} situé à ${String(city).trim()}.`,
      shortDescription: shortDescription ? String(shortDescription).trim() : undefined,
      coverImage: coverImage ? String(coverImage).trim() : undefined,
      gallery: Array.isArray(gallery) ? gallery.filter(Boolean) : [],
      phone: phone ? String(phone).trim() : undefined,
      amenities: Array.isArray(amenities) ? amenities.filter(Boolean) : [],
      stars: typeof stars === 'number' && stars >= 1 && stars <= 5 ? stars : undefined,
      startingPrice: typeof startingPrice === 'number' ? startingPrice : 0,
      priceRangeMin: typeof priceRangeMin === 'number' ? priceRangeMin : undefined,
      priceRangeMax: typeof priceRangeMax === 'number' ? priceRangeMax : undefined,
      isPublished: typeof isPublished === 'boolean' ? isPublished : false,
      isFeatured: !!isFeatured,
      isVedette: !!isVedette,
      reservationModes: Array.isArray(reservationModes) ? reservationModes : [],
      approvalStatus: 'approved',
      immersiveType: iType,
      immersiveSourceType: iType === 'none' ? null : (immersiveSourceType || 'upload'),
      immersiveProvider: iType === 'none' ? null : (immersiveProvider || 'custom'),
      immersiveUrl: immersiveUrl || null,
      immersiveFile: immersiveFile || null,
      hasVirtualTour: iType !== 'none',
    });

    res.status(201).json(venue);
  } catch (error) {
    console.error('Error creating venue:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du lieu.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

// PATCH /api/v1/admin/venues/:id — update any field
router.patch('/venues/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Lieu introuvable.' });

    const allowed = [
      'name', 'type', 'city', 'governorate', 'address', 'description', 'shortDescription',
      'coverImage', 'gallery', 'phone', 'amenities', 'stars',
      'startingPrice', 'priceRangeMin', 'priceRangeMax',
      'isPublished', 'isFeatured', 'isVedette', 'reservationModes',
      'immersiveType', 'immersiveSourceType', 'immersiveUrl', 'immersiveFile', 'immersiveProvider',
      'checkInPolicy', 'checkOutPolicy', 'rating',
    ];
    for (const key of allowed) {
      if (req.body && key in req.body) {
        (venue as any)[key] = (req.body as any)[key];
      }
    }
    // Keep hasVirtualTour in sync with immersive fields
    if ('immersiveType' in (req.body ?? {})) {
      (venue as any).hasVirtualTour = (venue as any).immersiveType && (venue as any).immersiveType !== 'none';
    }
    await venue.save();
    res.json(venue);
  } catch (error) {
    console.error('Error updating venue:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du lieu.' });
  }
});

// DELETE /api/v1/admin/venues/:id
router.delete('/venues/:id', async (req, res) => {
  try {
    const deleted = await Venue.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Lieu introuvable.' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting venue:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du lieu.' });
  }
});

// GET /api/v1/admin/hotels — flat list used by /admin/hotels page
// Returns { hotels, total } matching the front-end fetchAdminHotels shape.
router.get('/hotels', async (req, res) => {
  try {
    const filter: Record<string, unknown> = { type: 'HOTEL' };
    if (req.query.city) filter.city = req.query.city;
    if (req.query.q) {
      const re = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { city: re }, { description: re }];
    }
    const page = Math.max(1, parseInt((req.query.page as string) || '1') || 1);
    const limit = 50;
    const [hotels, total] = await Promise.all([
      Venue.find(filter)
        .populate('ownerId', 'fullName email phone')
        .sort({ isFeatured: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Venue.countDocuments(filter),
    ]);
    res.json({ hotels, total });
  } catch (error) {
    console.error('Error fetching admin hotels:', error);
    res.status(500).json({ error: 'Erreur de chargement.' });
  }
});

// GET /api/v1/admin/hotels/:id — single hotel (front-end expects { data })
router.get('/hotels/:id', async (req, res) => {
  try {
    const hotel = await Venue.findById(req.params.id)
      .populate('ownerId', 'fullName email phone')
      .lean();
    if (!hotel) return res.status(404).json({ error: 'Hôtel introuvable.' });
    res.json({ success: true, data: hotel });
  } catch (error) {
    console.error('Error fetching admin hotel:', error);
    res.status(500).json({ error: 'Erreur de chargement.' });
  }
});

// PATCH /api/v1/admin/hotels/:id — update (mirrors /admin/venues/:id semantics)
router.patch('/hotels/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Hôtel introuvable.' });
    const allowed = [
      'name', 'city', 'governorate', 'address', 'description', 'shortDescription',
      'coverImage', 'gallery', 'phone', 'amenities', 'stars',
      'startingPrice', 'priceRangeMin', 'priceRangeMax',
      'isPublished', 'isFeatured', 'isVedette',
      'checkInPolicy', 'checkOutPolicy',
      'immersiveType', 'immersiveSourceType', 'immersiveUrl', 'immersiveFile', 'immersiveProvider',
    ];
    for (const key of allowed) {
      if (req.body && key in req.body) (venue as any)[key] = (req.body as any)[key];
    }
    if ('immersiveType' in (req.body ?? {})) {
      (venue as any).hasVirtualTour = (venue as any).immersiveType && (venue as any).immersiveType !== 'none';
    }
    await venue.save();
    res.json({ success: true, data: venue });
  } catch (error) {
    console.error('Error updating admin hotel:', error);
    res.status(500).json({ error: 'Erreur de mise à jour.' });
  }
});

// GET /api/v1/admin/hotels/:id/rooms
router.get('/hotels/:id/rooms', async (req, res) => {
  try {
    const rooms = await Room.find({ venueId: req.params.id }).sort({ roomNumber: 1 }).lean();
    const sceneRoomIds = new Set(
      (await Scene.distinct('roomId', {
        venueId: req.params.id,
        roomId: { $ne: null },
        isActive: true,
      })).filter(Boolean).map(String)
    );
    res.json({
      success: true,
      rooms: rooms.map((room: any) => ({
        ...room,
        hasVirtualTour: Boolean(
          room.hasVirtualTour ||
          room.virtualTourUrl ||
          room.panoramicImages?.length ||
          sceneRoomIds.has(String(room._id))
        ),
      })),
    });
  } catch (error) {
    console.error('Error fetching admin hotel rooms:', error);
    res.status(500).json({ error: 'Erreur de chargement des chambres.' });
  }
});

// POST /api/v1/admin/hotels/:id/rooms — add room
router.post('/hotels/:id/rooms', async (req, res) => {
  try {
    const hotel = await Venue.findById(req.params.id).lean();
    if (!hotel) return res.status(404).json({ error: 'Hôtel introuvable.' });

    const last = await Room.findOne({ venueId: req.params.id }).sort({ roomNumber: -1 }).lean();
    const nextNumber = typeof req.body?.roomNumber === 'number'
      ? Number(req.body.roomNumber)
      : ((last as any)?.roomNumber ?? 100) + 1;

    const room = await Room.create({
      venueId: req.params.id,
      name: req.body?.name,
      roomNumber: nextNumber,
      roomType: req.body?.roomType ?? 'STANDARD',
      capacity: req.body?.capacity ?? 2,
      capacityAdults: req.body?.capacityAdults,
      capacityChildren: req.body?.capacityChildren,
      bedType: req.body?.bedType,
      pricePerNight: req.body?.pricePerNight ?? 0,
      surface: req.body?.surface,
      floor: req.body?.floor,
      view: req.body?.view,
      description: req.body?.description,
      bathroomType: req.body?.bathroomType,
      amenities: Array.isArray(req.body?.amenities) ? req.body.amenities : [],
      services: Array.isArray(req.body?.services) ? req.body.services : [],
      isVip: !!req.body?.isVip,
      hasBalcony: !!req.body?.hasBalcony,
      smokingAllowed: !!req.body?.smokingAllowed,
      minimumNights: req.body?.minimumNights,
      defaultStatus: req.body?.defaultStatus,
      coverImage: req.body?.coverImage,
      gallery: Array.isArray(req.body?.gallery) ? req.body.gallery : [],
      panoramicImages: Array.isArray(req.body?.panoramicImages) ? req.body.panoramicImages : [],
      hasVirtualTour: !!(req.body?.panoramicImages?.length || req.body?.virtualTourUrl),
      virtualTourUrl: req.body?.virtualTourUrl,
      isActive: req.body?.isActive ?? true,
      isReservable: req.body?.isReservable ?? true,
    } as any);

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Erreur de création de la chambre.' });
  }
});

// PATCH /api/v1/admin/hotels/:id/rooms/:roomId
router.patch('/hotels/:id/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId, venueId: req.params.id });
    if (!room) return res.status(404).json({ error: 'Chambre introuvable.' });
    const allowed = [
      'name', 'roomType', 'capacity', 'capacityAdults', 'capacityChildren',
      'bedType', 'pricePerNight', 'surface', 'floor', 'view', 'description',
      'bathroomType', 'amenities', 'services', 'isVip', 'hasBalcony',
      'smokingAllowed', 'minimumNights', 'defaultStatus',
      'coverImage', 'gallery', 'panoramicImages', 'virtualTourUrl', 'hasVirtualTour',
      'isActive', 'isReservable',
    ];
    for (const key of allowed) {
      if (key in (req.body ?? {})) (room as any)[key] = (req.body as any)[key];
    }
    if ('panoramicImages' in (req.body ?? {}) || 'virtualTourUrl' in (req.body ?? {})) {
      const hasScenes = await Scene.exists({ roomId: room._id, isActive: true });
      (room as any).hasVirtualTour = Boolean(
        (room as any).panoramicImages?.length ||
        (room as any).virtualTourUrl ||
        hasScenes
      );
    }
    await room.save();
    res.json({ success: true, data: room });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Erreur de mise à jour de la chambre.' });
  }
});

// DELETE /api/v1/admin/hotels/:id/rooms/:roomId
router.delete('/hotels/:id/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findOneAndDelete({ _id: req.params.roomId, venueId: req.params.id });
    if (!room) return res.status(404).json({ error: 'Chambre introuvable.' });
    const scenes = await Scene.find({ roomId: req.params.roomId }).select('_id').lean();
    await Promise.all(scenes.map((scene) => deleteSceneAndRelations(String(scene._id))));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Erreur de suppression de la chambre.' });
  }
});

// Generic aliases used by the room editor after a room has been loaded.
router.patch('/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Chambre introuvable.' });
    const allowed = [
      'name', 'roomType', 'capacity', 'capacityAdults', 'capacityChildren',
      'bedType', 'pricePerNight', 'surface', 'floor', 'view', 'description',
      'bathroomType', 'amenities', 'services', 'isVip', 'hasBalcony',
      'smokingAllowed', 'minimumNights', 'defaultStatus',
      'coverImage', 'gallery', 'panoramicImages', 'virtualTourUrl', 'hasVirtualTour',
      'isActive', 'isReservable',
    ];
    for (const key of allowed) {
      if (key in (req.body ?? {})) (room as any)[key] = (req.body as any)[key];
    }
    if ('panoramicImages' in (req.body ?? {}) || 'virtualTourUrl' in (req.body ?? {})) {
      const hasScenes = await Scene.exists({ roomId: room._id, isActive: true });
      (room as any).hasVirtualTour = Boolean(
        (room as any).virtualTourUrl ||
        (room as any).panoramicImages?.length ||
        hasScenes
      );
    }
    await room.save();
    res.json({ success: true, data: room });
  } catch (error) {
    console.error('Error updating admin room:', error);
    res.status(500).json({ error: 'Erreur de mise à jour de la chambre.' });
  }
});

router.delete('/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Chambre introuvable.' });
    const scenes = await Scene.find({ roomId: req.params.roomId }).select('_id').lean();
    await Promise.all(scenes.map((scene) => deleteSceneAndRelations(String(scene._id))));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin room:', error);
    res.status(500).json({ error: 'Erreur de suppression de la chambre.' });
  }
});

// GET /api/v1/admin/venues/:id/scenes — 360 scenes for a venue
router.get('/venues/:id/scenes', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide.' });
    }
    const scenes = await Scene.find({ venueId: req.params.id, roomId: null, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    const hotspots = await findSceneHotspots(scenes.map((scene) => scene._id));
    res.json({ success: true, scenes, hotspots });
  } catch (error) {
    console.error('Error fetching scenes:', error);
    res.status(500).json({ error: 'Erreur de chargement des scènes.' });
  }
});

// POST /api/v1/admin/venues/:id/scenes — create a venue-level 360 scene
router.post('/venues/:id/scenes', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide.' });
    }
    const venueExists = await Venue.exists({ _id: req.params.id });
    if (!venueExists) return res.status(404).json({ error: 'Lieu introuvable.' });

    const { name, image, description, order } = req.body ?? {};
    if (!name || !image) {
      return res.status(400).json({ error: 'name et image requis.' });
    }

    const scene = await Scene.create({
      venueId: req.params.id,
      roomId: null,
      name: String(name).trim(),
      image: String(image).trim(),
      description: description ? String(description).trim() : undefined,
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      isActive: true,
    });
    await Venue.findByIdAndUpdate(req.params.id, {
      $set: { hasVirtualTour: true, immersiveType: 'view-360', immersiveSourceType: 'upload' },
    });

    res.status(201).json({ success: true, data: scene });
  } catch (error) {
    console.error('Error creating venue scene:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la scène.' });
  }
});

router.get('/hotels/:id/scenes', async (req, res) => {
  try {
    const scenes = await Scene.find({ venueId: req.params.id, roomId: null, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    const hotspots = await findSceneHotspots(scenes.map((scene) => scene._id));
    res.json({ success: true, scenes, hotspots });
  } catch (error) {
    console.error('Error fetching hotel scenes:', error);
    res.status(500).json({ error: 'Erreur de chargement des scènes.' });
  }
});

router.post('/hotels/:id/scenes', async (req, res) => {
  try {
    const venueExists = await Venue.exists({ _id: req.params.id });
    if (!venueExists) return res.status(404).json({ error: 'Hôtel introuvable.' });
    const { name, image, description, order } = req.body ?? {};
    if (!name || !image) return res.status(400).json({ error: 'name et image requis.' });
    const scene = await Scene.create({
      venueId: req.params.id,
      roomId: null,
      name: String(name).trim(),
      image: String(image).trim(),
      description: description ? String(description).trim() : undefined,
      order: Number(order || 0),
      isActive: true,
    });
    await Venue.findByIdAndUpdate(req.params.id, {
      $set: { hasVirtualTour: true, immersiveType: 'view-360', immersiveSourceType: 'upload' },
    });
    res.status(201).json({ success: true, data: scene });
  } catch (error) {
    console.error('Error creating hotel scene:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la scène.' });
  }
});

router.get('/rooms/:roomId/scenes', async (req, res) => {
  try {
    const scenes = await Scene.find({ roomId: req.params.roomId, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    const hotspots = await findSceneHotspots(scenes.map((scene) => scene._id));
    res.json({ success: true, scenes, hotspots });
  } catch (error) {
    console.error('Error fetching room scenes:', error);
    res.status(500).json({ error: 'Erreur de chargement des scènes.' });
  }
});

router.post('/rooms/:roomId/scenes', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).select('venueId').lean();
    if (!room) return res.status(404).json({ error: 'Chambre introuvable.' });
    const { name, image, description, order } = req.body ?? {};
    if (!name || !image) return res.status(400).json({ error: 'name et image requis.' });
    const scene = await Scene.create({
      venueId: room.venueId,
      roomId: req.params.roomId,
      name: String(name).trim(),
      image: String(image).trim(),
      description: description ? String(description).trim() : undefined,
      order: Number(order || 0),
      isActive: true,
    });
    await Room.findByIdAndUpdate(req.params.roomId, { $set: { hasVirtualTour: true } });
    res.status(201).json({ success: true, data: scene });
  } catch (error) {
    console.error('Error creating room scene:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la scène.' });
  }
});

router.patch('/scenes/:sceneId', async (req, res) => {
  try {
    const allowed = ['name', 'description', 'image', 'order', 'isActive'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in (req.body ?? {})) update[key] = (req.body as any)[key];
    }
    const scene = await Scene.findByIdAndUpdate(req.params.sceneId, { $set: update }, { new: true });
    if (!scene) return res.status(404).json({ error: 'Scène introuvable.' });
    res.json({ success: true, data: scene });
  } catch (error) {
    console.error('Error updating scene:', error);
    res.status(500).json({ error: 'Erreur de mise à jour de la scène.' });
  }
});

router.delete('/scenes/:sceneId', async (req, res) => {
  try {
    const scene = await deleteSceneAndRelations(req.params.sceneId);
    if (!scene) return res.status(404).json({ error: 'Scène introuvable.' });
    res.json({ success: true, message: 'Scène supprimée.' });
  } catch (error) {
    console.error('Error deleting scene:', error);
    res.status(500).json({ error: 'Erreur de suppression de la scène.' });
  }
});

router.post('/scene-hotspots', async (req, res) => {
  try {
    const { venueId, sceneId, targetSceneId, label, xPercent, yPercent, yaw, pitch } = req.body ?? {};
    if (!venueId || !sceneId || !targetSceneId || !label || xPercent == null || yPercent == null) {
      return res.status(400).json({ error: 'venueId, sceneId, targetSceneId, label, xPercent et yPercent requis.' });
    }
    const sceneCount = await Scene.countDocuments({
      _id: { $in: [sceneId, targetSceneId] },
      venueId,
      isActive: true,
    });
    if (sceneCount !== 2) return res.status(404).json({ error: 'Scène source ou destination introuvable.' });
    const resolvedYaw = yaw == null
      ? ((Number(xPercent) / 100) - 0.5) * Math.PI * 2
      : Number(yaw);
    const resolvedPitch = pitch == null
      ? (0.5 - (Number(yPercent) / 100)) * Math.PI
      : Number(pitch);
    const hotspot = await TourHotspot.create({
      venueId,
      virtualTourId: sceneId,
      targetType: 'scene',
      targetId: targetSceneId,
      label: String(label).trim(),
      xPercent: Number(xPercent),
      yPercent: Number(yPercent),
      yaw: resolvedYaw,
      pitch: resolvedPitch,
      isActive: true,
    });
    res.status(201).json({ success: true, data: hotspot });
  } catch (error) {
    console.error('Error creating scene hotspot:', error);
    res.status(500).json({ error: 'Erreur de création du lien 360.' });
  }
});

// GET /api/v1/admin/table-placements?venueId=...
router.get('/table-placements', async (req, res) => {
  try {
    const venueId = req.query.venueId as string;
    if (!venueId) return res.json({ success: true, placements: [] });
    const placements = await TablePlacement.find({ venueId }).lean();
    res.json({ success: true, placements });
  } catch (error) {
    console.error('Error fetching table placements:', error);
    res.status(500).json({ error: 'Erreur de chargement.' });
  }
});

router.post('/table-placements', async (req, res) => {
  try {
    const { venueId, tableId, reservableUnitId, sceneId, ...position } = req.body ?? {};
    if (!venueId || !sceneId || (!!tableId === !!reservableUnitId)) {
      return res.status(400).json({ error: 'venueId, sceneId et exactement une ressource sont requis.' });
    }
    const placement = await TablePlacement.create({
      venueId,
      tableId: tableId || undefined,
      reservableUnitId: reservableUnitId || undefined,
      sceneId: String(sceneId),
      positionType: position.positionType || 'yaw_pitch',
      yaw: position.yaw == null ? undefined : Number(position.yaw),
      pitch: position.pitch == null ? undefined : Number(position.pitch),
      anchorPosition: position.anchorPosition,
      stemVector: position.stemVector,
      floorIndex: position.floorIndex,
    });
    res.status(201).json({ success: true, data: placement });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Placement déjà existant.' });
    console.error('Error creating table placement:', error);
    res.status(500).json({ error: 'Erreur de création du placement.' });
  }
});

router.patch('/table-placements/:id', async (req, res) => {
  try {
    const allowed = ['sceneId', 'yaw', 'pitch', 'positionType', 'anchorPosition', 'stemVector', 'floorIndex'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in (req.body ?? {})) update[key] = (req.body as any)[key];
    }
    const placement = await TablePlacement.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!placement) return res.status(404).json({ error: 'Placement introuvable.' });
    res.json({ success: true, data: placement });
  } catch (error) {
    console.error('Error updating table placement:', error);
    res.status(500).json({ error: 'Erreur de mise à jour du placement.' });
  }
});

router.delete('/table-placements/:id', async (req, res) => {
  try {
    const placement = await TablePlacement.findByIdAndDelete(req.params.id);
    if (!placement) return res.status(404).json({ error: 'Placement introuvable.' });
    res.json({ success: true, message: 'Placement supprimé.' });
  } catch (error) {
    console.error('Error deleting table placement:', error);
    res.status(500).json({ error: 'Erreur de suppression du placement.' });
  }
});

// Compatibility endpoints used by the legacy venue 360 editor.
router.post('/venues/:venueId/table-placements', async (req, res) => {
  try {
    const placement = await TablePlacement.create({
      ...req.body,
      venueId: req.params.venueId,
      sceneId: String(req.body?.sceneId || 'default'),
      positionType: req.body?.positionType || 'yaw_pitch',
    });
    res.status(201).json({ success: true, data: placement });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Placement déjà existant.' });
    console.error('Error creating venue table placement:', error);
    res.status(500).json({ error: 'Erreur de création du placement.' });
  }
});

router.delete('/venues/:venueId/table-placements/:placementId', async (req, res) => {
  try {
    const placement = await TablePlacement.findOneAndDelete({
      _id: req.params.placementId,
      venueId: req.params.venueId,
    });
    if (!placement) return res.status(404).json({ error: 'Placement introuvable.' });
    res.json({ success: true, message: 'Placement supprimé.' });
  } catch (error) {
    console.error('Error deleting venue table placement:', error);
    res.status(500).json({ error: 'Erreur de suppression du placement.' });
  }
});

router.delete('/venues/:venueId/table-placements', async (req, res) => {
  try {
    const result = await TablePlacement.deleteMany({ venueId: req.params.venueId });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error resetting venue table placements:', error);
    res.status(500).json({ error: 'Erreur de suppression des placements.' });
  }
});

router.get('/venues/:id/tables', async (req, res) => {
  try {
    const tables = await Table.find({ venueId: req.params.id }).sort({ displayOrder: 1, tableNumber: 1 }).lean();
    res.json({ success: true, data: tables });
  } catch (error) {
    console.error('Error fetching admin tables:', error);
    res.status(500).json({ error: 'Erreur de chargement des tables.' });
  }
});

router.post('/tables', async (req, res) => {
  try {
    const { venueId, tableNumber, name, code, capacity, capacityMax, locationLabel, price, minimumSpend, defaultStatus, isVip, isActive } = req.body ?? {};
    if (!venueId || !capacity) return res.status(400).json({ error: 'venueId et capacity requis.' });
    const last = await Table.findOne({ venueId }).sort({ tableNumber: -1 }).select('tableNumber').lean();
    const number = Number(tableNumber || Number((last as any)?.tableNumber || 0) + 1);
    const table = await Table.create({
      venueId,
      tableNumber: number,
      code: code || `T${number}`,
      name: name || `Table ${number}`,
      capacity: Number(capacity),
      capacityMax: Number(capacityMax || capacity),
      locationLabel: locationLabel || '',
      price: Number(price || 0),
      basePrice: Number(price || 0),
      minimumSpend: minimumSpend == null ? undefined : Number(minimumSpend),
      defaultStatus: defaultStatus || 'available',
      isVip: !!isVip,
      isActive: isActive !== false,
      isReservable: true,
      priceType: 'fixed',
      currency: 'TND',
    });
    res.status(201).json({ success: true, data: table });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Numéro ou code de table déjà utilisé.' });
    console.error('Error creating admin table:', error);
    res.status(500).json({ error: 'Erreur de création de la table.' });
  }
});

router.patch('/tables/:id', async (req, res) => {
  try {
    const allowed = ['tableNumber', 'name', 'code', 'capacity', 'capacityMax', 'locationLabel', 'price', 'minimumSpend', 'defaultStatus', 'isVip', 'isActive'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in (req.body ?? {})) update[key] = (req.body as any)[key];
    }
    if ('price' in update) update.basePrice = update.price;
    const table = await Table.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!table) return res.status(404).json({ error: 'Table introuvable.' });
    res.json({ success: true, data: table });
  } catch (error) {
    console.error('Error updating admin table:', error);
    res.status(500).json({ error: 'Erreur de mise à jour de la table.' });
  }
});

router.delete('/tables/:id', async (req, res) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table introuvable.' });
    await TablePlacement.deleteMany({ tableId: req.params.id });
    res.json({ success: true, message: 'Table supprimée.' });
  } catch (error) {
    console.error('Error deleting admin table:', error);
    res.status(500).json({ error: 'Erreur de suppression de la table.' });
  }
});

router.get('/reservable-units', async (req, res) => {
  try {
    const venueId = req.query.venueId as string;
    if (!venueId) return res.status(400).json({ error: 'venueId requis.' });
    const units = await ReservableUnit.find({ venueId }).sort({ displayOrder: 1 }).lean();
    res.json({ success: true, data: units });
  } catch (error) {
    console.error('Error fetching reservable units:', error);
    res.status(500).json({ error: 'Erreur de chargement des unités.' });
  }
});

// GET /api/admin/events
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find().populate('venueId', 'name city').sort({ startAt: 1 }).limit(100).lean();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des événements.' });
  }
});

// Whitelist of fields an admin may write on an Event.
function pickEventFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const stringFields = ['title', 'type', 'description', 'coverImage', 'afficheImageUrl', 'virtualTourUrl', 'ageRestriction', 'termsFr', 'organizerName', 'status'];
  for (const f of stringFields) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  if (body.venueId !== undefined && mongoose.Types.ObjectId.isValid(String(body.venueId))) {
    out.venueId = body.venueId;
  }
  if (body.startAt !== undefined) out.startAt = body.startAt ? new Date(String(body.startAt)) : undefined;
  if (body.endsAt !== undefined) out.endsAt = body.endsAt ? new Date(String(body.endsAt)) : undefined;
  if (body.isPublished !== undefined) out.isPublished = Boolean(body.isPublished);
  if (body.isVedette !== undefined) out.isVedette = Boolean(body.isVedette);
  if (Array.isArray(body.galleryUrls)) out.galleryUrls = body.galleryUrls.filter((u) => typeof u === 'string');
  if (Array.isArray(body.panoramicImages)) {
    out.panoramicImages = body.panoramicImages.filter((u) => typeof u === 'string');
    out.hasVirtualTour = (out.panoramicImages as string[]).length > 0 || Boolean(body.virtualTourUrl);
  }
  if (body.hasVirtualTour !== undefined) out.hasVirtualTour = Boolean(body.hasVirtualTour);
  if (Array.isArray(body.ticketTypes)) {
    out['ticketTypes'] = body.ticketTypes.map((t: any) => ({
      _id: t._id && mongoose.Types.ObjectId.isValid(t._id) ? t._id : new mongoose.Types.ObjectId(),
      name: t.name || 'Standard',
      price: Number(t.price || 0),
      capacity: Number(t.capacity || 0),
      sold: Number(t.sold || 0),
      salesStartAt: t.salesStartAt ? new Date(t.salesStartAt) : undefined,
      salesEndAt: t.salesEndAt ? new Date(t.salesEndAt) : undefined,
      maxPerOrder: Number(t.maxPerOrder || 10),
      isActive: t.isActive !== false,
    }));
  }
  return out;
}

// PATCH /api/admin/events/:id
router.patch('/events/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }
    const update = pickEventFields(req.body ?? {});

    // Preserve server-side sold counters when ticketTypes are being updated
    if (Array.isArray(update.ticketTypes)) {
      const current = await Event.findById(req.params.id, { ticketTypes: 1 }).lean();
      if (current?.ticketTypes) {
        const soldMap = new Map(
          (current.ticketTypes as any[]).map((t: any) => [String(t._id), Number(t.sold || 0)])
        );
        (update.ticketTypes as any[]) = (update.ticketTypes as any[]).map((t: any) => {
          const serverSold = soldMap.get(String(t._id));
          if (serverSold !== undefined) t.sold = Math.max(serverSold, Number(t.sold || 0));
          else t.sold = Math.max(0, Number(t.sold || 0));
          // Clamp capacity >= sold
          t.capacity = Math.max(Number(t.capacity || 0), t.sold);
          return t;
        });
      }
    }

    const event = await Event.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
      .populate('venueId', 'name city')
      .lean();
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'événement.' });
  }
});

// POST /api/admin/events
router.post('/events', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.title || !body.venueId || !body.startAt) {
      return res.status(400).json({ error: 'Titre, lieu et date de début requis.' });
    }
    if (!mongoose.Types.ObjectId.isValid(String(body.venueId))) {
      return res.status(400).json({ error: 'Lieu invalide.' });
    }
    const fields = pickEventFields(body);
    const created = await Event.create({
      ...fields,
      slug: body.slug ? slugify(String(body.slug)) : slugify(String(body.title)),
    });
    const event = await Event.findById(created._id).populate('venueId', 'name city').lean();
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'événement.' });
  }
});

// DELETE /api/admin/events/:id
router.delete('/events/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Événement introuvable.' });
    res.json({ message: 'Événement supprimé.' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement.' });
  }
});

// PATCH /api/admin/reservations/:id/cancel
router.patch('/reservations/:id/cancel', async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Réservation introuvable.' });
    if (r.status === 'CANCELLED') return res.status(400).json({ error: 'Déjà annulée.' });
    r.status = 'CANCELLED';
    await r.save();
    res.json({ message: 'Réservation annulée.', reservation: r });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation.' });
  }
});

// GET /api/admin/virtual-tours?venueId=
router.get('/virtual-tours', async (req, res) => {
  try {
    const venueId = req.query.venueId as string;
    if (!venueId || !mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ error: 'venueId requis.' });
    }
    const tours = await VirtualTour.find({ venueId }).sort({ createdAt: 1 }).lean();
    res.json(tours);
  } catch (error) {
    console.error('Error fetching virtual tours:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// POST /api/admin/virtual-tours
router.post('/virtual-tours', async (req, res) => {
  try {
    const { venueId, provider, embedUrl, videoUrl, previewImage, isActive } = req.body;
    if (!venueId) return res.status(400).json({ error: 'venueId requis.' });
    const tour = await VirtualTour.create({
      venueId,
      provider: provider || 'klapty',
      embedUrl: embedUrl || undefined,
      videoUrl: videoUrl || undefined,
      previewImage: previewImage || undefined,
      isActive: isActive !== false,
    });
    res.status(201).json(tour);
  } catch (error) {
    console.error('Error creating virtual tour:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// PATCH /api/admin/virtual-tours/:id
router.patch('/virtual-tours/:id', async (req, res) => {
  try {
    const tour = await VirtualTour.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!tour) return res.status(404).json({ error: 'Visite virtuelle introuvable.' });
    res.json(tour);
  } catch (error) {
    console.error('Error updating virtual tour:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// GET /api/admin/tour-hotspots?virtualTourId=
router.get('/tour-hotspots', async (req, res) => {
  try {
    const virtualTourId = req.query.virtualTourId as string;
    if (!virtualTourId || !mongoose.Types.ObjectId.isValid(virtualTourId)) {
      return res.status(400).json({ error: 'virtualTourId requis.' });
    }
    const hotspots = await TourHotspot.find({ virtualTourId }).lean();
    res.json(hotspots);
  } catch (error) {
    console.error('Error fetching tour hotspots:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// POST /api/admin/tour-hotspots
router.post('/tour-hotspots', async (req, res) => {
  try {
    const { virtualTourId, label, targetType, targetId, xPercent, yPercent, tooltipText, isActive } = req.body;
    if (!virtualTourId || !label || targetType == null || !targetId || xPercent == null || yPercent == null) {
      return res.status(400).json({ error: 'virtualTourId, label, targetType, targetId, xPercent, yPercent requis.' });
    }
    const hotspot = await TourHotspot.create({
      virtualTourId,
      label,
      targetType,
      targetId,
      xPercent: Number(xPercent),
      yPercent: Number(yPercent),
      tooltipText: tooltipText || undefined,
      isActive: isActive !== false,
    });
    res.status(201).json(hotspot);
  } catch (error) {
    console.error('Error creating tour hotspot:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// PATCH /api/admin/tour-hotspots/:id
router.patch('/tour-hotspots/:id', async (req, res) => {
  try {
    const hotspot = await TourHotspot.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!hotspot) return res.status(404).json({ error: 'Point d\'intérêt introuvable.' });
    res.json(hotspot);
  } catch (error) {
    console.error('Error updating tour hotspot:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

// DELETE /api/admin/tour-hotspots/:id
router.delete('/tour-hotspots/:id', async (req, res) => {
  try {
    const result = await TourHotspot.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Point d\'intérêt introuvable.' });
    res.json({ message: 'Point d\'intérêt supprimé.' });
  } catch (error) {
    console.error('Error deleting tour hotspot:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

router.get('/banner-slides', async (_req, res) => {
  try {
    const slides = await BannerSlide.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ success: true, data: slides });
  } catch (error) {
    console.error('Error fetching banner slides:', error);
    res.status(500).json({ error: 'Erreur de chargement des bannières.' });
  }
});

router.post('/banner-slides', async (req, res) => {
  try {
    if (!req.body?.titleFr || !req.body?.imageUrlDesktop) {
      return res.status(400).json({ error: 'titleFr et imageUrlDesktop requis.' });
    }
    const slide = await BannerSlide.create(req.body);
    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    console.error('Error creating banner slide:', error);
    res.status(500).json({ error: 'Erreur de création de la bannière.' });
  }
});

router.patch('/banner-slides/:id', async (req, res) => {
  try {
    const slide = await BannerSlide.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!slide) return res.status(404).json({ error: 'Bannière introuvable.' });
    res.json({ success: true, data: slide });
  } catch (error) {
    console.error('Error updating banner slide:', error);
    res.status(500).json({ error: 'Erreur de mise à jour de la bannière.' });
  }
});

router.delete('/banner-slides/:id', async (req, res) => {
  try {
    const slide = await BannerSlide.findByIdAndDelete(req.params.id);
    if (!slide) return res.status(404).json({ error: 'Bannière introuvable.' });
    res.json({ success: true, message: 'Bannière supprimée.' });
  } catch (error) {
    console.error('Error deleting banner slide:', error);
    res.status(500).json({ error: 'Erreur de suppression de la bannière.' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1 }).lean();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Erreur de chargement des catégories.' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    if (!req.body?.name || !req.body?.slug) return res.status(400).json({ error: 'name et slug requis.' });
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Slug déjà utilisé.' });
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Erreur de création de la catégorie.' });
  }
});

router.patch('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!category) return res.status(404).json({ error: 'Catégorie introuvable.' });
    res.json({ success: true, data: category });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Slug déjà utilisé.' });
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Erreur de mise à jour de la catégorie.' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Catégorie introuvable.' });
    res.json({ success: true, message: 'Catégorie supprimée.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Erreur de suppression de la catégorie.' });
  }
});

router.get('/settings', async (_req, res) => {
  try {
    const settings = await AppSettings.findOne().lean();
    res.json({ success: true, data: settings ?? {} });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Erreur de chargement des paramètres.' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const payload = { ...req.body };
    if ('maintenanceMode' in payload) {
      payload.isMaintenanceMode = payload.maintenanceMode;
      delete payload.maintenanceMode;
    }
    const settings = await AppSettings.findOneAndUpdate({}, { $set: payload }, { new: true, upsert: true });
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Erreur de mise à jour des paramètres.' });
  }
});

// Legacy /stats for backward compatibility
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [totalUsers, totalVenues, reservationsToday, reservationsWeek, upcomingEvents] = await Promise.all([
      User.countDocuments(),
      Venue.countDocuments(),
      Reservation.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: todayStart, $lt: todayEnd } }),
      Reservation.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gte: weekStart } }),
      Event.countDocuments({ startAt: { $gte: now } }),
    ]);

    res.json({
      totalUsers,
      totalVenues,
      reservationsToday,
      reservationsWeek,
      upcomingEvents,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Erreur.' });
  }
});

export default router;
