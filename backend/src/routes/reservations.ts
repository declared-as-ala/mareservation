import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import mongoose from 'mongoose';
import { Reservation } from '../models/Reservation';
import { ReservationHold } from '../models/ReservationHold';
import { Table } from '../models/Table';
import { Room } from '../models/Room';
import { Seat } from '../models/Seat';
import { ReservableUnit } from '../models/ReservableUnit';
import { User } from '../models/User';
import { TableBlock } from '../models/TableBlock';
import { VenueTablePolicy } from '../models/VenueTablePolicy';
import { Venue } from '../models/Venue';
import { MenuItem } from '../models/MenuItem';
import { CoworkingAddon } from '../models/CoworkingAddon';
import { CoworkingPolicy } from '../models/CoworkingPolicy';
import { CoworkingBlock } from '../models/CoworkingBlock';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateConfirmationCode } from '../utils/confirmationCode';
import { overlaps } from '../utils/reservationConflict';
import { generateQRDataURL } from '../utils/qr';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { logAudit } from '../utils/audit.util';
import { logger } from '../config/logger';
import {
  createReservationCancellationTemplate,
  createReservationConfirmationTemplate,
  createOwnerNewReservationTemplate,
  sendEmail,
} from '../services/email.service';

const BOOKING_TYPE_LABELS: Record<string, string> = {
  TABLE: 'Réservation de table',
  COWORKING: 'Espace coworking',
  SEAT: 'Place / siège',
  ROOM: 'Chambre',
};
import { publishAvailabilityEvent } from '../services/availabilityEvents';

const router = Router();

function hhmmFromDate(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function resolveHoldUnitId(body: Record<string, unknown>) {
  return (
    (typeof body.reservableUnitId === 'string' && body.reservableUnitId) ||
    (typeof body.tableId === 'string' && body.tableId) ||
    (typeof body.roomId === 'string' && body.roomId) ||
    (typeof body.seatId === 'string' && body.seatId) ||
    undefined
  );
}

// Rate limit for reservation creation: 10 per 15 minutes per user
const reservationCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de rÃ©servations. RÃ©essayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.headers.authorization ||
    ipKeyGenerator(req.ip || req.socket?.remoteAddress || '') ||
    req.ip ||
    'unknown',
});

// POST /api/v1/reservations/check-availability â€” check if unit is available for time range
router.post('/check-availability', async (req, res) => {
  try {
    const { reservableUnitId, tableId, roomId, seatId, venueId, startsAt, endsAt, peopleCount } = req.body;
    if (!venueId || !startsAt || !endsAt) {
      return sendError(res, { message: 'venueId, startsAt et endsAt sont requis.', statusCode: 400 });
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (start >= end) return sendError(res, { message: 'startsAt doit Ãªtre avant endsAt.', statusCode: 400 });

    let unit: { capacityMax?: number; capacity?: number } | null = null;
    let conflictFilter: Record<string, unknown> = { venueId, status: { $in: ['PENDING', 'CONFIRMED'] } };

    if (reservableUnitId) {
      unit = await ReservableUnit.findOne({ _id: reservableUnitId, venueId, status: 'active', isReservable: true }).lean();
      if (!unit) return sendError(res, { message: 'UnitÃ© non trouvÃ©e ou non rÃ©servable.', statusCode: 404 });
      conflictFilter.reservableUnitId = reservableUnitId;
    } else if (tableId) {
      unit = await Table.findOne({ _id: tableId, venueId }).lean();
      if (!unit) return sendError(res, { message: 'Table non trouvÃ©e.', statusCode: 404 });
      conflictFilter.tableId = tableId;
    } else if (roomId) {
      unit = await Room.findOne({ _id: roomId, venueId }).lean();
      if (!unit) return sendError(res, { message: 'Chambre non trouvÃ©e.', statusCode: 404 });
      conflictFilter.roomId = roomId;
    } else if (seatId) {
      unit = (await Seat.findOne({ _id: seatId, venueId }).lean()) as any;
      if (!unit) return sendError(res, { message: 'SiÃ¨ge non trouvÃ©e.', statusCode: 404 });
      conflictFilter.seatId = seatId;
    } else {
      return sendError(res, { message: 'Indiquez reservableUnitId, tableId, roomId ou seatId.', statusCode: 400 });
    }

    const cap = (unit as any).capacityMax ?? (unit as any).capacity ?? 1;
    if (peopleCount != null && cap > 0 && Number(peopleCount) > cap) {
      return sendSuccess(res, { data: { available: false, reason: 'capacity_exceeded' }, statusCode: 200 });
    }

    const existing = await Reservation.find({
      ...conflictFilter,
      $or: [{ startAt: { $lt: end }, endAt: { $gt: start } }],
    }).limit(1);
    const activeHolds = reservableUnitId
      ? await ReservationHold.find({
        reservableUnitId,
        status: 'active',
        expiresAt: { $gt: new Date() },
        $or: [{ startsAt: { $lt: end }, endsAt: { $gt: start } }],
      }).limit(1)
      : [];
    const tableBlock = tableId
      ? await TableBlock.findOne({
        venueId,
        isActive: true,
        $or: [{ tableId }, { tableId: null }],
        startsAt: { $lt: end },
        endsAt: { $gt: start },
      }).lean()
      : null;
    const available = existing.length === 0 && activeHolds.length === 0 && !tableBlock;
    sendSuccess(res, { data: { available, reason: available ? null : 'slot_taken' } });
  } catch (error) {
    console.error('Error check-availability:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la vÃ©rification.' });
  }
});

// GET /api/v1/reservations/availability/table/:tableId?date=YYYY-MM-DD
// Public endpoint used by the frontend timeline UI.
router.get('/availability/table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const dateRaw = String(req.query.date || '').trim();
    const parseDateKey = (raw: string) => {
      const normalized = raw.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      return new Date().toISOString().slice(0, 10);
    };
    const date = parseDateKey(dateRaw);

    const [year, month, day] = date.split('-').map(Number);
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const now = new Date();

    const tableDoc = await Table.findById(tableId).select('venueId').lean();
    const policy = tableDoc ? await VenueTablePolicy.findOne({ venueId: (tableDoc as any).venueId }).lean() : null;

    const [reservations, holds, blocks] = await Promise.all([
      Reservation.find({
        tableId,
        status: { $in: ['PENDING', 'CONFIRMED'] },
        startAt: { $lt: dayEnd },
        endAt: { $gt: dayStart },
      })
        .select('startAt endAt status')
        .lean(),
      ReservationHold.find({
        reservableUnitId: tableId,
        status: 'active',
        expiresAt: { $gt: now },
        startsAt: { $lt: dayEnd },
        endsAt: { $gt: dayStart },
      })
        .select('startsAt endsAt')
        .lean(),
      TableBlock.find({
        tableId,
        isActive: true,
        startsAt: { $lt: dayEnd },
        endsAt: { $gt: dayStart },
      })
        .select('startsAt endsAt')
        .lean(),
    ]);

    // Helper: return null if the value cannot produce a valid Date
    const safeIso = (v: unknown): string | null => {
      if (!v) return null;
      const d = new Date(v as string | number | Date);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    const reservedRanges = [
      ...reservations
        .filter((r) => safeIso(r.startAt) && safeIso(r.endAt))
        .map((r) => ({
          startAt: safeIso(r.startAt)!,
          endAt: safeIso(r.endAt)!,
          source: 'reservation',
          status: r.status,
        })),
      ...holds
        .filter((h) => safeIso(h.startsAt) && safeIso(h.endsAt))
        .map((h) => ({
          startAt: safeIso(h.startsAt)!,
          endAt: safeIso(h.endsAt)!,
          source: 'hold',
          status: 'HELD',
        })),
      ...blocks
        .filter((b) => safeIso((b as any).startsAt) && safeIso((b as any).endsAt))
        .map((b) => ({
          startAt: safeIso((b as any).startsAt)!,
          endAt: safeIso((b as any).endsAt)!,
          source: 'block',
          status: 'BLOCKED',
        })),
    ];

    const slotMinutes = Number((policy as any)?.slotMinutes || 30);
    const reservationDurationMinutes = Number((policy as any)?.reservationDurationMinutes || 120);
    const openingHour = Number((policy as any)?.openingHour || 12);
    const closingHour = Number((policy as any)?.closingHour || 23);
    const slots: Array<{ time: string; startAt: string; endAt: string; available: boolean }> = [];

    const ranges = reservedRanges.map((r) => ({
      start: new Date(r.startAt).getTime(),
      end: new Date(r.endAt).getTime(),
    }));

    for (let h = openingHour; h <= closingHour; h += 1) {
      for (let m = 0; m < 60; m += slotMinutes) {
        const slotStart = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);
        const slotEnd = new Date(slotStart.getTime() + reservationDurationMinutes * 60 * 1000);
        if (slotEnd > dayEnd) continue;

        const slotStartMs = slotStart.getTime();
        const slotEndMs = slotEnd.getTime();
        const overlapsReserved = ranges.some((r) => slotStartMs < r.end && slotEndMs > r.start);

        slots.push({
          time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          available: !overlapsReserved,
        });
      }
    }

    return sendSuccess(res, {
      data: {
        tableId,
        date,
        slotMinutes,
        reservationDurationMinutes,
        reservedRanges,
        slots,
      },
    });
  } catch (error) {
    logger.error('Error table availability timeline:', error);
    return sendError(res, { message: 'Erreur lors du chargement des disponibilites.', statusCode: 500 });
  }
});

// POST /api/v1/reservations/holds â€” create temporary hold (optional)
router.post('/holds', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const { venueId, eventSessionId, startsAt, endsAt, peopleCount } = req.body;
    const reservableUnitId = resolveHoldUnitId(req.body);
    if (!venueId || !startsAt || !endsAt) {
      return res.status(400).json({ error: 'venueId, startsAt et endsAt sont requis.' });
    }
    if (!reservableUnitId) {
      return res.status(400).json({ error: 'Une unite reservable est requise.' });
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (start >= end) {
      return res.status(400).json({ error: 'startsAt doit etre avant endsAt.' });
    }

    const conflictFilter: Record<string, unknown> = {
      venueId,
      status: { $in: ['PENDING', 'CONFIRMED'] },
      $or: [{ startAt: { $lt: end }, endAt: { $gt: start } }],
    };
    if (req.body.tableId) conflictFilter.tableId = req.body.tableId;
    else if (req.body.roomId) conflictFilter.roomId = req.body.roomId;
    else if (req.body.seatId) conflictFilter.seatId = req.body.seatId;
    else conflictFilter.reservableUnitId = reservableUnitId;

    const [existingReservation, existingHold] = await Promise.all([
      Reservation.findOne(conflictFilter).lean(),
      ReservationHold.findOne({
        reservableUnitId,
        status: 'active',
        expiresAt: { $gt: new Date() },
        $or: [{ startsAt: { $lt: end }, endsAt: { $gt: start } }],
      }),
    ]);
    const tableBlock = req.body.tableId
      ? await TableBlock.findOne({
        venueId,
        isActive: true,
        $or: [{ tableId: req.body.tableId }, { tableId: null }],
        startsAt: { $lt: end },
        endsAt: { $gt: start },
      }).lean()
      : null;

    if (existingReservation) {
      return res.status(409).json({ error: 'Ce creneau est deja reserve.' });
    }
    if (existingHold && existingHold.userId?.toString() !== req.userId) {
      return res.status(409).json({ error: 'Ce creneau est deja maintenu par un autre utilisateur.' });
    }
    if (tableBlock) {
      return res.status(409).json({ error: 'Cette table est bloquee sur ce creneau.' });
    }

    const expiresAt = new Date(Date.now() + 8 * 60 * 1000);
    const dateKey = start.toISOString().slice(0, 10);

    if (existingHold && existingHold.userId?.toString() === req.userId) {
      existingHold.startsAt = start;
      existingHold.endsAt = end;
      existingHold.peopleCount = Number(peopleCount) || 1;
      existingHold.expiresAt = expiresAt;
      existingHold.status = 'active';
      await existingHold.save();
      publishAvailabilityEvent({
        venueId: String(venueId),
        type: 'hold_created',
        at: new Date().toISOString(),
        holdId: existingHold._id.toString(),
      });
      return res.status(200).json({ success: true, data: existingHold, message: 'Hold mis a jour.' });
    }

    const hold = new ReservationHold({
      venueId,
      reservableUnitId,
      eventSessionId: eventSessionId || undefined,
      userId: req.userId,
      dateKey,
      startsAt: start,
      endsAt: end,
      peopleCount: Number(peopleCount) || 1,
      status: 'active',
      expiresAt,
    });
    await hold.save();
    publishAvailabilityEvent({
      venueId: String(venueId),
      type: 'hold_created',
      at: new Date().toISOString(),
      holdId: hold._id.toString(),
    });
    res.status(201).json({ success: true, data: hold, message: 'Hold cree.' });
  } catch (error) {
    console.error('Error creating hold:', error);
    res.status(500).json({ success: false, message: 'Erreur.' });
  }
});

// DELETE /api/v1/reservations/holds/:id â€” release hold
router.delete('/holds/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const hold = await ReservationHold.findOne({ _id: req.params.id, userId: req.userId });
    if (!hold) return res.status(404).json({ error: 'Hold non trouve' });
    if (hold.status !== 'active') {
      return res.json({ success: true, message: 'Hold deja traite.' });
    }
    hold.status = 'released';
    await hold.save();
    publishAvailabilityEvent({
      venueId: hold.venueId.toString(),
      type: 'hold_released',
      at: new Date().toISOString(),
      holdId: hold._id.toString(),
    });
    res.json({ success: true, message: 'Hold libere.' });
  } catch (error) {
    console.error('Error releasing hold:', error);
    res.status(500).json({ success: false, message: 'Erreur.' });
  }
});

// POST /api/v1/reservations â€” create reservation (TABLE | ROOM | SEAT); prevent conflicts
router.post('/', reservationCreateLimiter, authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const currentUser = await User.findById(req.userId).select('emailVerified');
    if (!currentUser) return res.status(401).json({ error: 'Utilisateur introuvable.' });
    if (!currentUser.emailVerified) {
      return res.status(403).json({
        error: 'Veuillez verifier votre adresse email avant de reserver.',
      });
    }

    const { venueId, bookingType, tableId, roomId, seatId, reservableUnitId, startAt, endAt, totalPrice, guestFirstName, guestLastName, guestPhone, partySize } = req.body;
    if (!venueId || !startAt || !endAt) {
      return res.status(400).json({ error: 'venueId, startAt and endAt are required' });
    }
    if (!guestFirstName?.trim()) return res.status(400).json({ error: 'PrÃ©nom est requis' });
    if (!guestLastName?.trim()) return res.status(400).json({ error: 'Nom est requis' });
    if (!guestPhone?.trim()) return res.status(400).json({ error: 'TÃ©lÃ©phone est requis' });
    const phone = String(guestPhone).trim().replace(/\s/g, '');
    if (!/^(\+216|216)?[0-9]{8}$/.test(phone) && !/^[0-9]{8}$/.test(phone)) {
      return res.status(400).json({ error: 'Format tÃ©lÃ©phone invalide (ex: 12345678 ou +21612345678)' });
    }
    const party = Number(partySize) || 1;
    if (party < 1 || party > 20) return res.status(400).json({ error: 'Nombre de personnes doit Ãªtre entre 1 et 20' });
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (start >= end) return res.status(400).json({ error: 'startAt must be before endAt' });

    const type = bookingType === 'ROOM' || bookingType === 'SEAT' || bookingType === 'COWORKING' ? bookingType : 'TABLE';
    let total = Number(totalPrice) || 0;
    let matchingUserHold: InstanceType<typeof ReservationHold> | null = null;

    if (type === 'TABLE') {
      if (!tableId) return res.status(400).json({ error: 'tableId required for table booking' });
      const table = await Table.findOne({ _id: tableId, venueId });
      if (!table) return res.status(404).json({ error: 'Table not found' });
      const tableCap = (table as any).capacityMax ?? (table as any).capacity ?? 4;
      if (party > tableCap) return res.status(400).json({ error: `CapacitÃ© max: ${tableCap} personnes` });
      total = total || (table as any).price;
      const existing = await Reservation.find({ tableId, status: { $in: ['PENDING', 'CONFIRMED'] } });
      for (const r of existing) {
        if (overlaps(start, end, r.startAt, r.endAt))
          return res.status(409).json({ error: 'This table is already reserved for the selected time.' });
      }
      const activeHolds = await ReservationHold.find({
        reservableUnitId: tableId,
        status: 'active',
        expiresAt: { $gt: new Date() },
        $or: [{ startsAt: { $lt: end }, endsAt: { $gt: start } }],
      });
      const blockingHold = activeHolds.find((hold) => hold.userId?.toString() !== req.userId);
      if (blockingHold) {
        return res.status(409).json({ error: 'Cette table est actuellement maintenue par un autre utilisateur.' });
      }
      const tableBlock = await TableBlock.findOne({
        venueId,
        isActive: true,
        $or: [{ tableId }, { tableId: null }],
        startsAt: { $lt: end },
        endsAt: { $gt: start },
      }).lean();
      if (tableBlock) {
        return res.status(409).json({ error: 'Cette table est bloquee sur ce creneau.' });
      }
      matchingUserHold = activeHolds.find((hold) => hold.userId?.toString() === req.userId) ?? null;
    } else if (type === 'ROOM') {
      if (!roomId) return res.status(400).json({ error: 'roomId required for room booking' });
      const room = await Room.findOne({ _id: roomId, venueId });
      if (!room) return res.status(404).json({ error: 'Room not found' });
      const roomCap = (room as any).capacity ?? 4;
      if (party > roomCap) return res.status(400).json({ error: `CapacitÃ© max: ${roomCap} personnes` });
      total = total || (room as any).pricePerNight;
      const existing = await Reservation.find({ roomId, status: { $in: ['PENDING', 'CONFIRMED'] } });
      for (const r of existing) {
        if (overlaps(start, end, r.startAt, r.endAt))
          return res.status(409).json({ error: 'This room is already reserved for the selected nights.' });
      }
    } else if (type === 'SEAT') {
      if (!seatId) return res.status(400).json({ error: 'seatId required for seat booking' });
      const seat = await Seat.findOne({ _id: seatId, venueId });
      if (!seat) return res.status(404).json({ error: 'Seat not found' });
      if (party > 1) return res.status(400).json({ error: '1 place par siÃ¨ge' });
      total = total || (seat as any).price;
      const existing = await Reservation.find({ seatId, status: { $in: ['PENDING', 'CONFIRMED'] } });
      for (const r of existing) {
        if (overlaps(start, end, r.startAt, r.endAt))
          return res.status(409).json({ error: 'This seat is already reserved.' });
      }
    } else {
      if (!reservableUnitId) return res.status(400).json({ error: 'reservableUnitId required for coworking booking' });
      const unit = await ReservableUnit.findOne({ _id: reservableUnitId, venueId, status: 'active', isReservable: true }).lean();
      if (!unit) return res.status(404).json({ error: 'Coworking unit not found' });
      const policy = await CoworkingPolicy.findOne({ venueId }).lean();
      const cap = Number((unit as any).capacityMax || 1);
      if (party > cap) return res.status(400).json({ error: `Capacité max: ${cap} personnes` });
      const hasBlock = await CoworkingBlock.exists({
        venueId,
        isActive: true,
        startsAt: { $lt: end },
        endsAt: { $gt: start },
        $or: [
          { scope: 'venue' },
          { scope: 'unit', reservableUnitId },
        ],
      });
      if (hasBlock) return res.status(409).json({ error: 'Un bloc de disponibilité couvre ce créneau coworking.' });
      const existing = await Reservation.find({
        reservableUnitId,
        bookingType: 'COWORKING',
        status: { $in: ['pending', 'confirmed', 'checked_in', 'PENDING', 'CONFIRMED'] },
      });
      for (const r of existing) {
        if (overlaps(start, end, r.startAt, r.endAt)) return res.status(409).json({ error: 'Cette unité coworking est déjà réservée sur ce créneau.' });
      }
      const durationType = req.body?.coworkingDurationType as 'hourly' | 'half_day' | 'full_day' | undefined;
      let hours = Number(req.body?.coworkingHours || 0);
      if (durationType === 'half_day') hours = Number(policy?.halfDayHours || 4);
      if (durationType === 'full_day') hours = Number(policy?.fullDayHours || 8);
      if (!hours || hours < 1) {
        const diffHours = Math.ceil((end.getTime() - start.getTime()) / 3_600_000);
        hours = Math.max(1, diffHours);
      }
      const maxHours = Number(policy?.maxBookingHours || 12);
      if (hours > maxHours) return res.status(400).json({ error: `Durée maximale autorisée: ${maxHours}h.` });
      total = total || Number((unit as any).basePrice || 0);
      if ((unit as any).priceType === 'perSession') total = Number((unit as any).basePrice || 0);
      else total = Number((unit as any).basePrice || 0) * hours;
      const overtimeAfter = Number(policy?.overtimeAfterHours || 8);
      if (hours > overtimeAfter) {
        if (!policy?.allowOvertime) {
          return res.status(400).json({ error: `Ce créneau dépasse ${overtimeAfter}h et l'option overtime n'est pas autorisée.` });
        }
        const overtimeHours = hours - overtimeAfter;
        const overtimeRate = Number(policy?.overtimeHourlyRate || 0);
        total += overtimeHours * overtimeRate;
      }

      const requestedAddons = Array.isArray(req.body?.coworkingAddons) ? req.body.coworkingAddons : [];
      let addonsTotal = 0;
      const normalizedAddons: Array<{ key: string; name: string; quantity: number; unitPrice: number }> = [];
      if (requestedAddons.length) {
        const addonRows = await CoworkingAddon.find({ venueId, isActive: true }).lean();
        const byKey = new Map(addonRows.map((a: any) => [String(a.key), a]));
        for (const a of requestedAddons) {
          const key = String(a?.key || '');
          const row: any = byKey.get(key);
          if (!row) return res.status(400).json({ error: `Addon inconnu: ${key}` });
          const qty = Math.max(0, Number(a?.quantity || 0));
          if (!qty) continue;
          if (row.maxQty && qty > Number(row.maxQty)) return res.status(400).json({ error: `Quantité max dépassée pour ${row.name}` });
          normalizedAddons.push({ key: row.key, name: row.name, quantity: qty, unitPrice: Number(row.unitPrice || 0) });
          addonsTotal += qty * Number(row.unitPrice || 0);
        }
      }
      total += addonsTotal;
      (req.body as any).__coworkingNormalizedAddons = normalizedAddons;
      (req.body as any).__coworkingAddonsTotal = addonsTotal;
      (req.body as any).__coworkingHours = hours;
    }

    let confirmationCode = generateConfirmationCode(8);
    let exists = await Reservation.findOne({ confirmationCode });
    while (exists) {
      confirmationCode = generateConfirmationCode(8);
      exists = await Reservation.findOne({ confirmationCode });
    }
    const reservationCode = confirmationCode;

    const orderType = req.body?.orderType === 'with_menu' ? 'with_menu' : 'table_only';
    const requestedMenuItems = Array.isArray(req.body?.menuItems) ? req.body.menuItems : [];
    const normalizedMenuItems: Array<{ menuItemId: mongoose.Types.ObjectId; name: string; quantity: number; unitPrice: number }> = [];
    let menuTotal = 0;

    if (type === 'TABLE' && orderType === 'with_menu') {
      if (!requestedMenuItems.length) {
        return res.status(400).json({ error: 'Veuillez selectionner au moins un article menu.' });
      }
      const ids = requestedMenuItems
        .map((m: any) => String(m?.itemId || ''))
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id));
      const uniqueIds = [...new Set(ids)];
      const menuRows = await MenuItem.find({
        _id: { $in: uniqueIds },
        venueId,
        isAvailable: true,
      }).lean();
      const byId = new Map(menuRows.map((row: any) => [String(row._id), row]));
      const hhmm = hhmmFromDate(start);

      for (const requested of requestedMenuItems) {
        const itemId = String(requested?.itemId || '');
        const row: any = byId.get(itemId);
        if (!row) return res.status(400).json({ error: 'Un article menu est indisponible.' });
        const qty = Math.max(0, Number(requested?.quantity || 0));
        if (qty < 1) continue;
        if (row.availableFrom && hhmm < String(row.availableFrom)) {
          return res.status(400).json({ error: `L'article "${row.name}" n'est pas encore disponible.` });
        }
        if (row.availableTo && hhmm > String(row.availableTo)) {
          return res.status(400).json({ error: `L'article "${row.name}" n'est plus disponible.` });
        }
        if (row.trackStock && Number(row.stockQty || 0) < qty) {
          return res.status(400).json({ error: `Stock insuffisant pour "${row.name}".` });
        }
        normalizedMenuItems.push({
          menuItemId: new mongoose.Types.ObjectId(itemId),
          name: String(row.name || ''),
          quantity: qty,
          unitPrice: Number(row.price || 0),
        });
      }

      if (!normalizedMenuItems.length) return res.status(400).json({ error: 'Aucun article menu valide.' });
      menuTotal = normalizedMenuItems.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0);
      total += menuTotal;
    }

    let paymentStatus: 'unpaid' | 'pending' | 'paid' = 'unpaid';
    let paymentOption: 'online' | 'deposit' | 'pay_at_hotel' | undefined;
    let amountPaid = 0;
    let remainingAmount = total;
    let cancellationDeadline: Date | undefined;
    if (type === 'TABLE') {
      const venuePolicy = await VenueTablePolicy.findOne({ venueId }).lean();
      if (venuePolicy?.depositRequired) {
        paymentOption = 'deposit';
        paymentStatus = 'pending';
        if (venuePolicy.depositType === 'percent') {
          amountPaid = Math.max(0, Math.round((total * Number(venuePolicy.depositValue || 0)) / 100));
        } else if (venuePolicy.depositType === 'fixed') {
          amountPaid = Math.max(0, Math.min(total, Number(venuePolicy.depositValue || 0)));
        }
        remainingAmount = Math.max(0, total - amountPaid);
      }
      const cutoffMin = Number(venuePolicy?.cancellationCutoffMinutes || 120);
      cancellationDeadline = new Date(start.getTime() - cutoffMin * 60 * 1000);
    }

    const reservation = new Reservation({
      userId: req.userId,
      venueId,
      bookingType: type,
      tableId: type === 'TABLE' ? tableId : undefined,
      roomId: type === 'ROOM' ? roomId : undefined,
      seatId: type === 'SEAT' ? seatId : undefined,
      reservableUnitId: type === 'COWORKING' ? reservableUnitId : undefined,
      startAt: start,
      endAt: end,
      status: 'CONFIRMED',
      paymentStatus,
      paymentOption,
      amountPaid,
      remainingAmount,
      cancellationDeadline,
      confirmationCode,
      reservationCode,
      totalPrice: total,
      guestFirstName: String(guestFirstName).trim(),
      guestLastName: String(guestLastName).trim(),
      guestPhone: phone,
      customerFirstName: String(guestFirstName).trim(),
      customerLastName: String(guestLastName).trim(),
      customerPhone: phone,
      customerEmail: req.body.guestEmail || req.body.customerEmail,
      partySize: party,
      peopleCount: party,
      notes: req.body.notes,
      specialRequest: req.body.specialRequest,
      orderType,
      menuItems: normalizedMenuItems,
      menuTotal,
      menuPrepStatus: orderType === 'with_menu' ? 'pending' : undefined,
      menuPrepUpdatedAt: orderType === 'with_menu' ? new Date() : undefined,
      coworkingDurationType: type === 'COWORKING' ? (req.body?.coworkingDurationType || 'hourly') : undefined,
      coworkingHours: type === 'COWORKING' ? Number((req.body as any).__coworkingHours || 1) : undefined,
      coworkingAddons: type === 'COWORKING' ? ((req.body as any).__coworkingNormalizedAddons || []) : undefined,
      coworkingAddonsTotal: type === 'COWORKING' ? Number((req.body as any).__coworkingAddonsTotal || 0) : undefined,
      priceBreakdown: {
        subtotal: Math.max(0, total - menuTotal),
        extrasTotal: menuTotal,
        total,
        currency: 'TND',
      },
      source: 'web',
    });
    await reservation.save();

    if (type === 'TABLE' && orderType === 'with_menu' && normalizedMenuItems.length) {
      for (const row of normalizedMenuItems) {
        await MenuItem.updateOne(
          { _id: row.menuItemId, trackStock: true },
          { $inc: { stockQty: -row.quantity } }
        );
      }
    }
    const qrCodeData = JSON.stringify({ code: confirmationCode, id: reservation._id.toString() });
    reservation.qrCodeData = qrCodeData;
    await reservation.save();
    try {
      const dataUrl = await generateQRDataURL(qrCodeData, { width: 256 });
      reservation.qrCodeImageUrl = dataUrl;
      await reservation.save();
    } catch {
      // QR generation optional
    }
    await reservation.populate(['tableId', 'roomId', 'seatId', 'venueId']);

    if (matchingUserHold) {
      matchingUserHold.status = 'converted';
      await matchingUserHold.save();
      publishAvailabilityEvent({
        venueId: String(venueId),
        type: 'hold_converted',
        at: new Date().toISOString(),
        holdId: matchingUserHold._id.toString(),
        reservationId: reservation._id.toString(),
      });
    }

    publishAvailabilityEvent({
      venueId: String(venueId),
      type: 'reservation_created',
      at: new Date().toISOString(),
      reservationId: reservation._id.toString(),
    });

    const emailTarget = reservation.customerEmail;
    const venueName = ((reservation.venueId as any)?.name as string) || 'Votre lieu';
    if (emailTarget) {
      const confirmationTemplate = createReservationConfirmationTemplate(
        `${reservation.guestFirstName} ${reservation.guestLastName}`.trim() || 'Client',
        reservation.reservationCode || reservation.confirmationCode || reservation._id.toString(),
        venueName,
        start.toLocaleDateString('fr-FR'),
        start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        party
      );
      void sendEmail({
        to: String(emailTarget),
        subject: confirmationTemplate.subject,
        html: confirmationTemplate.html,
        text: confirmationTemplate.text,
      });
    }

    // Notify the venue owner (café / restaurant / coworking — ROOM is handled by hotel-checkout)
    if (reservation.bookingType !== 'ROOM') {
      try {
        const ownerId = (reservation.venueId as any)?.ownerId;
        if (ownerId) {
          const owner = await User.findById(ownerId).select('email fullName').lean();
          if (owner?.email) {
            const ownerTpl = createOwnerNewReservationTemplate({
              ownerName: (owner as any).fullName || 'Propriétaire',
              venueName,
              bookingTypeLabel: BOOKING_TYPE_LABELS[String(reservation.bookingType)] || 'Réservation',
              reservationCode: reservation.reservationCode || reservation.confirmationCode || reservation._id.toString(),
              date: start.toLocaleDateString('fr-FR'),
              time: start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              partySize: party,
              guestName: `${reservation.guestFirstName} ${reservation.guestLastName}`.trim() || 'Client',
              guestPhone: reservation.guestPhone,
            });
            void sendEmail({
              to: (owner as any).email,
              subject: ownerTpl.subject,
              html: ownerTpl.html,
              text: ownerTpl.text,
            });
          }
        }
      } catch {
        // owner notification is best-effort
      }
    }

    res.status(201).json({
      success: true,
      message: 'RÃ©servation crÃ©Ã©e',
      data: {
        _id: reservation._id,
        reservationCode: reservation.reservationCode || reservation.confirmationCode,
        userId: reservation.userId,
        venueId: reservation.venueId,
        bookingType: reservation.bookingType,
        tableId: reservation.tableId,
        roomId: reservation.roomId,
        seatId: reservation.seatId,
        startAt: reservation.startAt,
        endAt: reservation.endAt,
        status: reservation.status,
        paymentStatus: reservation.paymentStatus,
        confirmationCode: reservation.confirmationCode,
        totalPrice: reservation.totalPrice,
        guestFirstName: reservation.guestFirstName,
        guestLastName: reservation.guestLastName,
        guestPhone: reservation.guestPhone,
        partySize: reservation.partySize,
        qrCodeData: reservation.qrCodeData,
        qrCodeImageUrl: reservation.qrCodeImageUrl,
        createdAt: reservation.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

async function getMyReservations(req: AuthRequest, res: import('express').Response) {
  if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
  const list = await Reservation.find({ userId: req.userId })
    .populate('tableId', 'tableNumber capacity locationLabel price isVip')
    .populate('roomId', 'roomNumber roomType capacity pricePerNight')
    .populate('seatId', 'seatNumber zone price')
    .populate('venueId', 'name address city')
    .sort({ startAt: -1 });
  res.json(list);
}

// GET /api/v1/reservations/me â€” current user's reservations
router.get(['/me', '/'], authenticate, async (req: AuthRequest, res) => {
  try {
    await getMyReservations(req, res);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// GET /api/v1/reservations/me/:id â€” single reservation for current user
router.get('/me/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({ _id: req.params.id, userId: req.userId })
      .populate('tableId')
      .populate('roomId')
      .populate('seatId')
      .populate('venueId', 'name address city type coverImage phone')
      .populate('eventId', 'title slug type description coverImage afficheImageUrl galleryUrls startAt endsAt organizerName ageRestriction termsFr')
      .lean();
    if (!reservation) return res.status(404).json({ error: 'RÃ©servation non trouvÃ©e' });
    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// GET /api/v1/reservations/me/:id/qr â€” QR code data or image URL for ticket
router.get('/me/:id/qr', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({ _id: req.params.id, userId: req.userId }).select('qrCodeData qrCodeImageUrl confirmationCode reservationCode').lean();
    if (!reservation) return res.status(404).json({ error: 'RÃ©servation non trouvÃ©e' });
    const r = reservation as any;
    res.json({
      success: true,
      data: {
        qrCodeData: r.qrCodeData || r.confirmationCode,
        qrCodeImageUrl: r.qrCodeImageUrl,
        reservationCode: r.reservationCode || r.confirmationCode,
      },
    });
  } catch (error) {
    console.error('Error fetching QR:', error);
    res.status(500).json({ error: 'Failed to fetch QR' });
  }
});

// GET /api/v1/reservations/me/:id/ticket-print â€” ticket data for print view
router.get('/me/:id/ticket-print', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({ _id: req.params.id, userId: req.userId })
      .populate('venueId', 'name address city')
      .populate('tableId', 'tableNumber capacity price')
      .populate('roomId', 'roomNumber roomType pricePerNight')
      .populate('seatId', 'seatNumber zone price')
      .lean();
    if (!reservation) return res.status(404).json({ error: 'RÃ©servation non trouvÃ©e' });
    const v = reservation.venueId as any;
    const payload = (reservation as any).qrCodeData || (reservation as any).confirmationCode || reservation._id.toString();
    res.json({
      success: true,
      data: {
        _id: reservation._id,
        startAt: reservation.startAt,
        endAt: reservation.endAt,
        status: reservation.status,
        bookingType: reservation.bookingType,
        totalPrice: reservation.totalPrice,
        partySize: reservation.partySize ?? reservation.peopleCount,
        confirmationCode: (reservation as any).confirmationCode,
        reservationCode: (reservation as any).reservationCode,
        venueName: v?.name,
        venueAddress: v?.address,
        venueCity: v?.city,
        tableNumber: (reservation.tableId as any)?.tableNumber,
        roomNumber: (reservation.roomId as any)?.roomNumber,
        seatNumber: (reservation.seatId as any)?.seatNumber,
        guestFirstName: (reservation as any).guestFirstName,
        guestLastName: (reservation as any).guestLastName,
        guestPhone: (reservation as any).guestPhone,
        qrPayload: payload,
        qrCodeImageUrl: (reservation as any).qrCodeImageUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// PATCH /api/v1/reservations/me/:id/cancel â€” cancel own reservation
router.patch('/me/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({ _id: req.params.id, userId: req.userId }).populate('venueId', 'name');
    if (!reservation) return res.status(404).json({ error: 'RÃ©servation non trouvÃ©e' });
    if (reservation.status === 'CANCELLED') return res.status(400).json({ error: 'RÃ©servation dÃ©jÃ  annulÃ©e' });
    if (reservation.bookingType === 'TABLE') {
      const venue = await Venue.findById(reservation.venueId).select('type').lean();
      if (venue && ['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'].includes(String((venue as any).type || ''))) {
        const policy = await VenueTablePolicy.findOne({ venueId: reservation.venueId }).lean();
        const cutoffMin = Number(policy?.cancellationCutoffMinutes || 120);
        const now = Date.now();
        const cutoffAt = new Date(new Date(reservation.startAt).getTime() - cutoffMin * 60 * 1000).getTime();
        if (now > cutoffAt) {
          return res.status(400).json({ error: `Annulation impossible moins de ${cutoffMin} min avant le debut.` });
        }
      }
    }
    reservation.status = 'CANCELLED';
    await reservation.save();

    // Cancellation email to the customer
    const cancelTarget = reservation.customerEmail;
    if (cancelTarget) {
      const start = new Date(reservation.startAt);
      const cancelTpl = createReservationCancellationTemplate(
        `${reservation.guestFirstName ?? ''} ${reservation.guestLastName ?? ''}`.trim() || 'Client',
        reservation.reservationCode || reservation.confirmationCode || reservation._id.toString(),
        ((reservation.venueId as any)?.name as string) || 'Votre lieu',
        start.toLocaleDateString('fr-FR'),
        start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      );
      void sendEmail({
        to: String(cancelTarget),
        subject: cancelTpl.subject,
        html: cancelTpl.html,
        text: cancelTpl.text,
      });
      (reservation as any).cancellationEmailSentAt = new Date();
      await reservation.save();
    }

    res.json({ success: true, message: 'RÃ©servation annulÃ©e', data: reservation });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

// GET /api/v1/reservations/:id/ticket â€” ticket data (backward compat)
router.get('/:id/ticket', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.userId,
    })
      .populate('venueId', 'name address city')
      .populate('tableId', 'tableNumber capacity price')
      .populate('roomId', 'roomNumber roomType pricePerNight')
      .populate('seatId', 'seatNumber zone price')
      .lean();
    if (!reservation) return res.status(404).json({ error: 'RÃ©servation non trouvÃ©e' });

    const v = reservation.venueId as any;
    const payload = (reservation as any).qrCodeData || (reservation as any).confirmationCode || reservation._id.toString();
    res.json({
      success: true,
      data: {
        _id: reservation._id,
        startAt: reservation.startAt,
        endAt: reservation.endAt,
        status: reservation.status,
        bookingType: reservation.bookingType,
        totalPrice: reservation.totalPrice,
        partySize: reservation.partySize ?? reservation.peopleCount,
        confirmationCode: (reservation as any).confirmationCode,
        reservationCode: (reservation as any).reservationCode,
        venueName: v?.name,
        venueAddress: v?.address,
        venueCity: v?.city,
        tableNumber: (reservation.tableId as any)?.tableNumber,
        roomNumber: (reservation.roomId as any)?.roomNumber,
        seatNumber: (reservation.seatId as any)?.seatNumber,
        qrPayload: payload,
      },
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// GET /api/v1/reservations/scan?code= â€” admin: look up reservation by confirmation code for QR entry
router.get('/scan', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.userRole === 'ADMIN') {
      return sendError(res, { message: 'Scanner admin desactive. Utilisez le scanner proprietaire.', statusCode: 403 });
    }
    const code = (req.query.code as string)?.trim();
    if (!code) return sendError(res, { message: 'code requis.', statusCode: 400 });

    let lookupCode = code;
    try { const p = JSON.parse(code); if (p.code) lookupCode = p.code; } catch { /* raw code */ }

    const reservation = await Reservation.findOne({
      $or: [{ confirmationCode: lookupCode }, { reservationCode: lookupCode }],
    }).populate('venueId', 'name').lean();

    if (!reservation) return sendError(res, { message: 'RÃ©servation introuvable.', statusCode: 404 });
    sendSuccess(res, { data: reservation });
  } catch (err) {
    sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// GET /api/reservations/:id
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.userId,
    })
      .populate('tableId')
      .populate('roomId')
      .populate('seatId')
      .populate('venueId');
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// PATCH /api/v1/reservations/:id/checkin â€” admin: validate entry via QR scan
router.patch('/:id/checkin', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.userRole === 'ADMIN') {
      return sendError(res, { message: 'Check-in admin desactive. Utilisez le flux proprietaire.', statusCode: 403 });
    }
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return sendError(res, { message: 'RÃ©servation introuvable.', statusCode: 404 });
    reservation.checkInStatus = 'checked_in';
    reservation.checkedInAt = new Date();
    if (reservation.status === 'CONFIRMED') reservation.status = 'COMPLETED';
    await reservation.save();
    sendSuccess(res, { data: reservation });
  } catch (err) {
    sendError(res, { message: 'Erreur lors du check-in.', statusCode: 500 });
  }
});

// PATCH /api/reservations/:id/cancel
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Authentication required' });
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Reservation already cancelled' });
    }
    reservation.status = 'CANCELLED';
    await reservation.save();
    res.json({ message: 'Reservation cancelled', reservation });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

export default router;
