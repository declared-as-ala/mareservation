import { Router } from 'express';
import mongoose from 'mongoose';
import { Venue } from '../models/Venue';
import { VenueMedia } from '../models/VenueMedia';
import { VirtualTour } from '../models/VirtualTour';
import { TourHotspot } from '../models/TourHotspot';
import { Table } from '../models/Table';
import { Room } from '../models/Room';
import { Seat } from '../models/Seat';
import { TableHotspot } from '../models/TableHotspot';
import { Event } from '../models/Event';
import { Reservation } from '../models/Reservation';
import { Scene } from '../models/Scene';
import { TablePlacement } from '../models/TablePlacement';
import { ReservationHold } from '../models/ReservationHold';
import { TableBlock } from '../models/TableBlock';
import { subscribeToVenueAvailability } from '../services/availabilityEvents';

const router = Router();

async function findVenueId(idOrSlug: string) {
  const venue = await (mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24
    ? Venue.findById(idOrSlug).select('_id')
    : Venue.findOne({ slug: idOrSlug }).select('_id')
  ).lean();
  return venue ? (venue as any)._id : null;
}

async function attachRoomTours(rooms: any[]) {
  if (!rooms.length) return rooms;

  const roomIds = rooms.map((room) => room._id);
  const scenes = await Scene.find({ roomId: { $in: roomIds }, isActive: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  const sceneIds = scenes.map((scene) => scene._id);
  const hotspots = sceneIds.length
    ? await TourHotspot.find({
        virtualTourId: { $in: sceneIds },
        targetType: 'scene',
        isActive: true,
      }).lean()
    : [];

  const scenesByRoom = new Map<string, any[]>();
  const hotspotsByScene = new Map<string, any[]>();

  for (const scene of scenes) {
    const key = String((scene as any).roomId);
    scenesByRoom.set(key, [...(scenesByRoom.get(key) ?? []), scene]);
  }
  for (const hotspot of hotspots) {
    const key = String((hotspot as any).virtualTourId);
    hotspotsByScene.set(key, [...(hotspotsByScene.get(key) ?? []), hotspot]);
  }

  return rooms.map((room) => {
    const tourScenes = scenesByRoom.get(String(room._id)) ?? [];
    const tourHotspots = tourScenes.flatMap((scene) => hotspotsByScene.get(String(scene._id)) ?? []);
    return {
      ...room,
      hasVirtualTour: Boolean(
        room.hasVirtualTour ||
        room.virtualTourUrl ||
        room.panoramicImages?.length ||
        tourScenes.length
      ),
      tourScenes,
      tourHotspots,
    };
  });
}

// GET /api/v1/venues/:id/virtual-tours — list virtual tours for a venue
router.get('/:id/virtual-tours', async (req, res) => {
  try {
    const venue = await Venue.findOne(
      mongoose.Types.ObjectId.isValid(req.params.id) && req.params.id.length === 24
        ? { _id: req.params.id }
        : { slug: req.params.id }
    ).lean();
    if (!venue) return res.status(404).json({ error: 'Lieu non trouvé' });
    const tours = await VirtualTour.find({ venueId: (venue as any)._id, isActive: true }).lean();
    res.json(tours);
  } catch (error) {
    console.error('Error fetching virtual tours:', error);
    res.status(500).json({ error: 'Échec du chargement des visites virtuelles.' });
  }
});

// GET /api/v1/venues/:id/hotspots — list tour hotspots for a venue (all active tours)
router.get('/:id/hotspots', async (req, res) => {
  try {
    const venue = await Venue.findOne(
      mongoose.Types.ObjectId.isValid(req.params.id) && req.params.id.length === 24
        ? { _id: req.params.id }
        : { slug: req.params.id }
    ).lean();
    if (!venue) return res.status(404).json({ error: 'Lieu non trouvé' });
    const tours = await VirtualTour.find({ venueId: (venue as any)._id, isActive: true }).select('_id').lean();
    const tourIds = (tours as any[]).map((t) => t._id);
    const hotspots = tourIds.length
      ? await TourHotspot.find({ virtualTourId: { $in: tourIds }, isActive: true }).lean()
      : [];
    res.json(hotspots);
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Échec du chargement des points d\'intérêt.' });
  }
});

// GET /api/v1/venues — list venues (filters: type, city, categoryId, hasEvent, hasVirtualTour, priceRange, q)
router.get('/', async (req, res) => {
  try {
    const { type, city, categoryId, hasEvent, hasVirtualTour, priceMin, priceMax, q } = req.query;
    const filter: Record<string, unknown> = {};
    if (type) filter.type = String(type).toUpperCase();
    if (city) filter.city = city;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId as string)) {
      filter.categoryIds = new mongoose.Types.ObjectId(categoryId as string);
    }
    if (priceMin != null && priceMin !== '') filter.priceRangeMin = { $gte: Number(priceMin) };
    if (priceMax != null && priceMax !== '') filter.priceRangeMax = { $lte: Number(priceMax) };
    if (q && String(q).trim()) {
      filter.$text = { $search: String(q).trim() };
    }

    let venues = await Venue.find(filter).sort({ rating: -1, isFeatured: -1 }).lean();

    const venueIds = venues.map((v) => (v as any)._id);
    const [venuesWithEvents, venueIdsWithTours, venueIdsWithScenes] = await Promise.all([
      Event.distinct('venueId', { venueId: { $in: venueIds } }),
      VirtualTour.distinct('venueId', { venueId: { $in: venueIds }, isActive: true }),
      Scene.distinct('venueId', { venueId: { $in: venueIds }, roomId: null, isActive: true }),
    ]);
    const immersiveVenueIds = new Set([
      ...venueIdsWithTours.map((id: any) => id.toString()),
      ...venueIdsWithScenes.map((id: any) => id.toString()),
    ]);

    if (hasEvent === 'true') {
      venues = venues.filter((v) => venuesWithEvents.some((id: any) => id.toString() === (v as any)._id.toString()));
    }
    if (hasVirtualTour === 'true') {
      venues = venues.filter((v) =>
        Boolean((v as any).hasVirtualTour || (v as any).immersiveFile || immersiveVenueIds.has((v as any)._id.toString()))
      );
    }

    const result = await Promise.all(
      venues.map(async (venue) => {
        const vid = (venue as any)._id;
        const tables = await Table.countDocuments({ venueId: vid });
        return {
          ...venue,
          availableTables: tables,
          hasEvent: venuesWithEvents.some((id: any) => id.toString() === vid.toString()),
          hasVirtualTour: Boolean((venue as any).hasVirtualTour || (venue as any).immersiveFile || immersiveVenueIds.has(vid.toString())),
        };
      })
    );
    res.json(result);
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ error: 'Échec du chargement des lieux.' });
  }
});

// GET /api/v1/venues/:idOrSlug/scenes — public venue-level 360 scenes and navigation hotspots
router.get('/:id/scenes', async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const venue = await (mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24
      ? Venue.findById(idOrSlug).select('_id')
      : Venue.findOne({ slug: idOrSlug }).select('_id')
    ).lean();
    if (!venue) return res.status(404).json({ error: 'Lieu non trouvé' });

    const venueId = (venue as any)._id;
    const scenes = await Scene.find({ venueId, roomId: null, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    const sceneIds = scenes.map((scene) => scene._id);
    const hotspots = sceneIds.length
      ? await TourHotspot.find({
          virtualTourId: { $in: sceneIds },
          targetType: 'scene',
          isActive: true,
        }).lean()
      : [];

    res.json({ scenes, hotspots });
  } catch (error) {
    console.error('Error fetching venue scenes:', error);
    res.status(500).json({ error: 'Échec du chargement des scènes.' });
  }
});

// GET /api/v1/venues/:idOrSlug/table-placements — public placements with live table availability
// GET /api/v1/venues/:id/rooms — public: list rooms with per-room 360 panoramas
// Optional ?startAt=&endAt= to compute live availability per room.
router.get('/:id/rooms', async (req, res) => {
  try {
    const venueId = await findVenueId(req.params.id);
    if (!venueId) return res.status(404).json({ error: 'Lieu non trouvé' });

    const roomRows = await Room.find({ venueId, isActive: true }).sort({ roomNumber: 1 }).lean();
    const rooms = await attachRoomTours(roomRows as any[]);

    const { startAt, endAt } = req.query;
    if (startAt && endAt) {
      const s = new Date(String(startAt));
      const e = new Date(String(endAt));
      const reservedRoomIds = await Reservation.find({
        venueId,
        bookingType: 'ROOM',
        status: { $in: ['PENDING', 'CONFIRMED', 'pending', 'confirmed', 'checked_in'] },
        startAt: { $lt: e },
        endAt: { $gt: s },
      }).distinct('roomId');

      const reservedSet = new Set(reservedRoomIds.map(String));
      const withStatus = rooms.map((r: any) => ({
        ...r,
        status: reservedSet.has(String(r._id)) ? 'reserved' : (r.defaultStatus ?? 'available'),
      }));
      return res.json(withStatus);
    }

    res.json(rooms.map((r: any) => ({ ...r, status: r.defaultStatus ?? 'available' })));
  } catch (error) {
    console.error('Error fetching venue rooms:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des chambres.' });
  }
});

// GET /api/v1/venues/:idOrSlug/rooms/:roomId/scenes - public room-level 360 tour
router.get('/:id/rooms/:roomId/scenes', async (req, res) => {
  try {
    const venueId = await findVenueId(req.params.id);
    if (!venueId) return res.status(404).json({ error: 'Lieu non trouve' });

    const room = await Room.findOne({ _id: req.params.roomId, venueId, isActive: true }).select('_id').lean();
    if (!room) return res.status(404).json({ error: 'Chambre introuvable.' });

    const scenes = await Scene.find({ roomId: room._id, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    const sceneIds = scenes.map((scene) => scene._id);
    const hotspots = sceneIds.length
      ? await TourHotspot.find({
          virtualTourId: { $in: sceneIds },
          targetType: 'scene',
          isActive: true,
        }).lean()
      : [];

    res.json({ scenes, hotspots });
  } catch (error) {
    console.error('Error fetching room scenes:', error);
    res.status(500).json({ error: 'Erreur lors du chargement de la visite de la chambre.' });
  }
});

router.get('/:id/table-placements', async (req, res) => {
  try {
    const venueId = await findVenueId(req.params.id);
    if (!venueId) return res.status(404).json({ error: 'Lieu non trouvé' });

    const placements = await TablePlacement.find({
      venueId,
      tableId: { $exists: true },
    })
      .populate('tableId')
      .sort({ createdAt: 1 })
      .lean();

    const { startAt, endAt } = req.query;
    if ((startAt && !endAt) || (!startAt && endAt)) {
      return res.status(400).json({ error: 'startAt et endAt doivent être fournis ensemble.' });
    }

    const reservedTableIds = new Set<string>();
    const blockedTableIds = new Set<string>();
    const blockedZones = new Set<string>();
    let allTablesBlocked = false;

    if (startAt && endAt) {
      const start = new Date(String(startAt));
      const end = new Date(String(endAt));
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
        return res.status(400).json({ error: 'Période invalide.' });
      }

      const tableIds = placements
        .map((placement: any) => placement.tableId?._id)
        .filter(Boolean);
      const [reservations, holds, blocks] = await Promise.all([
        Reservation.find({
          venueId,
          tableId: { $in: tableIds },
          status: { $in: ['PENDING', 'CONFIRMED', 'pending', 'confirmed', 'checked_in'] },
          startAt: { $lt: end },
          endAt: { $gt: start },
        }).select('tableId').lean(),
        ReservationHold.find({
          venueId,
          status: 'active',
          expiresAt: { $gt: new Date() },
          startsAt: { $lt: end },
          endsAt: { $gt: start },
          $or: [
            { tableId: { $in: tableIds } },
            { reservableUnitId: { $in: tableIds } },
          ],
        }).select('tableId reservableUnitId').lean(),
        TableBlock.find({
          venueId,
          isActive: true,
          startsAt: { $lt: end },
          endsAt: { $gt: start },
        }).select('tableId zone').lean(),
      ]);

      reservations.forEach((reservation: any) => {
        if (reservation.tableId) reservedTableIds.add(String(reservation.tableId));
      });
      holds.forEach((hold: any) => {
        const tableId = hold.tableId || hold.reservableUnitId;
        if (tableId) reservedTableIds.add(String(tableId));
      });
      blocks.forEach((block: any) => {
        if (block.tableId) blockedTableIds.add(String(block.tableId));
        else if (block.zone) blockedZones.add(String(block.zone).trim().toLowerCase());
        else allTablesBlocked = true;
      });
    }

    const result = placements.flatMap((placement: any) => {
      const table = placement.tableId;
      if (!table?._id) return [];

      const tableId = String(table._id);
      const location = String(table.locationLabel || '').trim().toLowerCase();
      const isBlocked = allTablesBlocked
        || blockedTableIds.has(tableId)
        || (location && blockedZones.has(location))
        || table.isActive === false
        || table.isReservable === false
        || table.defaultStatus === 'blocked';
      const status = isBlocked
        ? 'blocked'
        : reservedTableIds.has(tableId) || table.defaultStatus === 'reserved'
          ? 'reserved'
          : 'available';

      return [{
        ...placement,
        tableId,
        table: {
          ...table,
          status,
          defaultStatus: table.defaultStatus || 'available',
        },
      }];
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching venue table placements:', error);
    res.status(500).json({ error: 'Échec du chargement des placements.' });
  }
});

// GET /api/v1/venues/:idOrSlug/availability-stream — public availability updates
router.get('/:id/availability-stream', async (req, res) => {
  try {
    const venueId = await findVenueId(req.params.id);
    if (!venueId) return res.status(404).json({ error: 'Lieu non trouvé' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ venueId: String(venueId), type: 'connected', at: new Date().toISOString() })}\n\n`);

    const unsubscribe = subscribeToVenueAvailability(String(venueId), (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (error) {
    console.error('Error opening venue availability stream:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Échec du flux de disponibilité.' });
  }
});

// GET /api/v1/venues/:idOrSlug — venue details with media, tables/rooms/seats, virtualTours, hotspots, events; optional startAt/endAt for availability
router.get('/:id', async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const venue = await (mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24
      ? Venue.findById(idOrSlug)
      : Venue.findOne({ slug: idOrSlug })
    ).lean();
    if (!venue) return res.status(404).json({ error: 'Lieu non trouvé' });

    const venueId = (venue as any)._id.toString();
    const venueType = (venue as any).type;
    const hasTables = venueType === 'CAFE' || venueType === 'RESTAURANT' || venueType === 'EVENT_SPACE';
    const hasRooms = venueType === 'HOTEL';
    const hasSeats = venueType === 'CINEMA';

    const [media, tables, rooms, seats, tableHotspots, virtualTours, events, hasVenueScenes] = await Promise.all([
      VenueMedia.find({ venueId }).lean(),
      hasTables ? Table.find({ venueId }).sort({ displayOrder: 1, tableNumber: 1 }).lean() : [],
      hasRooms ? Room.find({ venueId }).sort({ roomNumber: 1 }).lean() : [],
      hasSeats ? Seat.find({ venueId }).sort({ seatNumber: 1 }).lean() : [],
      TableHotspot.find({ venueId }).populate('tableId').lean(),
      VirtualTour.find({ venueId, isActive: true }).lean(),
      Event.find({ venueId }).sort({ startAt: 1 }).limit(10).lean(),
      Scene.exists({ venueId, roomId: null, isActive: true }),
    ]);

    const tourIds = (virtualTours as any[]).map((t) => t._id);
    const tourHotspots = tourIds.length
      ? await TourHotspot.find({ virtualTourId: { $in: tourIds }, isActive: true }).lean()
      : [];

    const { startAt, endAt } = req.query;
    const roomsWithTours = await attachRoomTours(rooms as any[]);
    let tablesWithStatus = (tables as any[]).map((t) => ({ ...t, status: 'available' as string }));
    let roomsWithStatus = roomsWithTours.map((r) => ({ ...r, status: 'available' as string }));
    let seatsWithStatus = (seats as any[]).map((s) => ({ ...s, status: 'available' as string }));

    if (startAt && endAt) {
      const start = new Date(startAt as string);
      const end = new Date(endAt as string);
      const overlapping = await Reservation.find({
        venueId,
        status: { $in: ['PENDING', 'CONFIRMED'] },
        $or: [{ startAt: { $lt: end }, endAt: { $gt: start } }],
      });
      const reservedTableIds = new Set(overlapping.filter((r) => r.tableId).map((r) => r.tableId!.toString()));
      const reservedRoomIds = new Set(overlapping.filter((r) => r.roomId).map((r) => r.roomId!.toString()));
      const reservedSeatIds = new Set(overlapping.filter((r) => r.seatId).map((r) => r.seatId!.toString()));
      tablesWithStatus = (tables as any[]).map((t) => ({
        ...t,
        status: reservedTableIds.has(t._id.toString()) ? 'reserved' : 'available',
      }));
      roomsWithStatus = roomsWithTours.map((r) => ({
        ...r,
        status: reservedRoomIds.has(r._id.toString()) ? 'reserved' : 'available',
      }));
      seatsWithStatus = (seats as any[]).map((s) => ({
        ...s,
        status: reservedSeatIds.has(s._id.toString()) ? 'reserved' : 'available',
      }));
    }

    res.json({
      ...venue,
      hasVirtualTour: Boolean((venue as any).hasVirtualTour || (venue as any).immersiveFile || virtualTours.length || hasVenueScenes),
      media,
      tables: tablesWithStatus,
      rooms: roomsWithStatus,
      seats: seatsWithStatus,
      hotspots: (tableHotspots as any[]).map((h) => ({
        _id: h._id,
        venueId: h.venueId,
        tableId: h.tableId,
        sceneId: h.sceneId,
        pitch: h.pitch,
        yaw: h.yaw,
        radius: h.radius,
        label: h.label,
      })),
      virtualTours,
      tourHotspots,
      events,
    });
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ error: 'Échec du chargement du lieu.' });
  }
});

export default router;
