import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAnyServiceDomains, requireEstablishmentOwner, type AuthRequest } from '../middleware/auth';
import { Venue } from '../models/Venue';
import { ReservableUnit } from '../models/ReservableUnit';
import { CoworkingAddon } from '../models/CoworkingAddon';
import { CoworkingPolicy } from '../models/CoworkingPolicy';
import { CoworkingBlock } from '../models/CoworkingBlock';
import { Reservation } from '../models/Reservation';
import { logAudit } from '../utils/audit.util';

const router = Router();
router.use(authenticate, requireEstablishmentOwner, requireAnyServiceDomains('COWORKING'));

async function assertOwnedCoworkingVenue(venueId: string, req: AuthRequest) {
  if (!mongoose.Types.ObjectId.isValid(venueId)) return null;
  const venue = await Venue.findById(venueId).select('_id ownerId type').lean();
  if (!venue || String((venue as any).type) !== 'COWORKING') return null;
  if (req.userRole === 'ADMIN') return venue;
  return String((venue as any).ownerId) === String(req.userId) ? venue : null;
}

router.get('/venues/:venueId/units', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const units = await ReservableUnit.find({ venueId: (venue as any)._id, unitType: { $in: ['coworking_desk', 'coworking_office', 'coworking_meeting_room'] } })
    .sort({ displayOrder: 1 })
    .lean();
  return res.json({ success: true, data: units });
});

router.post('/venues/:venueId/units', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const body = req.body || {};
  if (!body.label || !body.code || !body.unitType) return res.status(400).json({ error: 'label, code, unitType requis.' });
  const row = await ReservableUnit.create({
    venueId: (venue as any)._id,
    unitType: body.unitType,
    label: body.label,
    code: body.code,
    capacityMax: Number(body.capacityMax || 1),
    priceType: body.priceType || 'perSession',
    basePrice: Number(body.basePrice || 0),
    currency: body.currency || 'TND',
    status: body.status || 'active',
    isReservable: body.isReservable !== false,
    attributes: body.attributes || {},
    displayOrder: Number(body.displayOrder || 0),
  });
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_unit_create', unitId: String(row._id), unitType: row.unitType },
  });
  return res.status(201).json({ success: true, data: row });
});

router.patch('/units/:id', async (req: AuthRequest, res) => {
  const row = await ReservableUnit.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Unite introuvable.' });
  const venue = await assertOwnedCoworkingVenue(String((row as any).venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  Object.assign(row, req.body || {});
  await row.save();
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_unit_update', unitId: String(row._id) },
  });
  return res.json({ success: true, data: row });
});

router.delete('/units/:id', async (req: AuthRequest, res) => {
  const row = await ReservableUnit.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Unite introuvable.' });
  const venue = await assertOwnedCoworkingVenue(String((row as any).venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  await row.deleteOne();
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_unit_delete', unitId: String(row._id) },
  });
  return res.json({ success: true });
});

router.get('/venues/:venueId/addons', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const rows = await CoworkingAddon.find({ venueId: (venue as any)._id }).sort({ name: 1 }).lean();
  return res.json({ success: true, data: rows });
});

router.post('/venues/:venueId/addons', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const b = req.body || {};
  if (!b.key || !b.name) return res.status(400).json({ error: 'key et name requis.' });
  const row = await CoworkingAddon.create({
    venueId: (venue as any)._id,
    key: b.key,
    name: b.name,
    unitPrice: Number(b.unitPrice || 0),
    maxQty: b.maxQty ? Number(b.maxQty) : undefined,
    isActive: b.isActive !== false,
  });
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_addon_create', addonId: String(row._id), key: row.key },
  });
  return res.status(201).json({ success: true, data: row });
});

router.patch('/addons/:id', async (req: AuthRequest, res) => {
  const row = await CoworkingAddon.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Addon introuvable.' });
  const venue = await assertOwnedCoworkingVenue(String((row as any).venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  Object.assign(row, req.body || {});
  await row.save();
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_addon_update', addonId: String(row._id) },
  });
  return res.json({ success: true, data: row });
});

router.delete('/addons/:id', async (req: AuthRequest, res) => {
  const row = await CoworkingAddon.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Addon introuvable.' });
  const venue = await assertOwnedCoworkingVenue(String((row as any).venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  await row.deleteOne();
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_addon_delete', addonId: String(row._id) },
  });
  return res.json({ success: true });
});

router.get('/venues/:venueId/policy', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const row = await CoworkingPolicy.findOne({ venueId: (venue as any)._id }).lean();
  return res.json({ success: true, data: row || null });
});

router.patch('/venues/:venueId/policy', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const b = req.body || {};
  const patch = {
    openingHour: Number(b.openingHour ?? 8),
    closingHour: Number(b.closingHour ?? 22),
    halfDayHours: Number(b.halfDayHours ?? 4),
    fullDayHours: Number(b.fullDayHours ?? 8),
    maxBookingHours: Number(b.maxBookingHours ?? 12),
    allowOvertime: !!b.allowOvertime,
    overtimeAfterHours: Number(b.overtimeAfterHours ?? 8),
    overtimeHourlyRate: Number(b.overtimeHourlyRate ?? 0),
  };
  const row = await CoworkingPolicy.findOneAndUpdate(
    { venueId: (venue as any)._id },
    { $set: patch },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_policy_update', allowOvertime: patch.allowOvertime, maxBookingHours: patch.maxBookingHours },
  });
  return res.json({ success: true, data: row });
});

router.get('/venues/:venueId/blocks', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const rows = await CoworkingBlock.find({ venueId: (venue as any)._id })
    .sort({ startsAt: 1 })
    .populate('reservableUnitId', 'label code unitType')
    .lean();
  return res.json({ success: true, data: rows });
});

router.post('/venues/:venueId/blocks', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const b = req.body || {};
  const startsAt = new Date(b.startsAt);
  const endsAt = new Date(b.endsAt);
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime()) || !(endsAt instanceof Date) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    return res.status(400).json({ error: 'Plage horaire invalide.' });
  }
  const scope = b.scope === 'venue' ? 'venue' : 'unit';
  const reservableUnitId = scope === 'unit' ? String(b.reservableUnitId || '') : '';
  if (scope === 'unit') {
    if (!mongoose.Types.ObjectId.isValid(reservableUnitId)) return res.status(400).json({ error: 'Unite requise.' });
    const unit = await ReservableUnit.findOne({ _id: reservableUnitId, venueId: (venue as any)._id }).lean();
    if (!unit) return res.status(404).json({ error: 'Unite introuvable.' });
  }
  const overlap = await CoworkingBlock.findOne({
    venueId: (venue as any)._id,
    isActive: true,
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
    ...(scope === 'venue'
      ? {}
      : {
          $or: [
            { scope: 'venue' },
            { scope: 'unit', reservableUnitId: new mongoose.Types.ObjectId(reservableUnitId) },
          ],
        }),
  }).lean();
  if (overlap) return res.status(409).json({ error: 'Conflit avec un bloc existant.' });
  const row = await CoworkingBlock.create({
    venueId: (venue as any)._id,
    reservableUnitId: scope === 'unit' ? reservableUnitId : undefined,
    scope,
    startsAt,
    endsAt,
    reason: b.reason || 'owner_hold',
    note: b.note || '',
    isActive: b.isActive !== false,
    createdBy: req.userId,
  });
  await logAudit(req as any, {
    action: 'ROOM_BLOCK_CREATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_block_create', blockId: String(row._id), scope, startsAt, endsAt },
  });
  return res.status(201).json({ success: true, data: row });
});

router.patch('/blocks/:id', async (req: AuthRequest, res) => {
  const row = await CoworkingBlock.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Bloc introuvable.' });
  const venue = await assertOwnedCoworkingVenue(String((row as any).venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  Object.assign(row, req.body || {});
  await row.save();
  await logAudit(req as any, {
    action: 'ROOM_BLOCK_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_block_update', blockId: String(row._id) },
  });
  return res.json({ success: true, data: row });
});

router.delete('/blocks/:id', async (req: AuthRequest, res) => {
  const row = await CoworkingBlock.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Bloc introuvable.' });
  const venue = await assertOwnedCoworkingVenue(String((row as any).venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  await row.deleteOne();
  await logAudit(req as any, {
    action: 'ROOM_BLOCK_DELETED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'coworking_block_delete', blockId: String(row._id) },
  });
  return res.json({ success: true });
});

router.get('/reservations', async (req: AuthRequest, res) => {
  const venues = await Venue.find({
    ownerId: req.userRole === 'ADMIN' ? { $exists: true } : req.userId,
    type: 'COWORKING',
  }).select('_id').lean();
  const venueIds = venues.map((v: any) => v._id);
  const rows = await Reservation.find({ venueId: { $in: venueIds }, bookingType: 'COWORKING' })
    .populate('venueId', 'name city')
    .populate('reservableUnitId', 'label unitType capacityMax')
    .sort({ startAt: -1 })
    .lean();
  return res.json({ success: true, data: rows });
});

router.get('/venues/:venueId/kpis', async (req: AuthRequest, res) => {
  const venue = await assertOwnedCoworkingVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Coworking introuvable.' });
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const units = await ReservableUnit.find({
    venueId: (venue as any)._id,
    unitType: { $in: ['coworking_desk', 'coworking_office', 'coworking_meeting_room'] },
    status: { $in: ['active', 'maintenance'] },
  }).select('_id capacityMax status').lean();
  const unitIds = units.map((u: any) => u._id);
  const rows = await Reservation.find({
    venueId: (venue as any)._id,
    bookingType: 'COWORKING',
    startAt: { $gte: from, $lte: to },
    status: { $in: ['confirmed', 'checked_in', 'completed', 'CONFIRMED', 'COMPLETED'] },
  }).select('startAt endAt totalPrice partySize reservableUnitId status').lean();
  const totalReservations = rows.length;
  const revenue = rows.reduce((sum: number, r: any) => sum + Number(r.totalPrice || 0), 0);
  const bookedHours = rows.reduce((sum: number, r: any) => {
    const diff = (new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) / 3_600_000;
    return sum + Math.max(0, diff);
  }, 0);
  const rangeHours = Math.max(1, (to.getTime() - from.getTime()) / 3_600_000);
  const effectiveCapacity = units.reduce((sum: number, u: any) => sum + Math.max(1, Number(u.capacityMax || 1)), 0);
  const utilizationPct = Math.min(100, Math.round((bookedHours / Math.max(1, effectiveCapacity * rangeHours)) * 10000) / 100);
  const activeBlocks = await CoworkingBlock.countDocuments({
    venueId: (venue as any)._id,
    isActive: true,
    endsAt: { $gte: new Date() },
  });
  const upcoming = await Reservation.countDocuments({
    venueId: (venue as any)._id,
    bookingType: 'COWORKING',
    startAt: { $gte: new Date() },
    status: { $in: ['confirmed', 'checked_in', 'CONFIRMED'] },
  });
  return res.json({
    success: true,
    data: {
      totalReservations,
      revenue,
      bookedHours: Math.round(bookedHours * 100) / 100,
      utilizationPct,
      activeBlocks,
      upcoming,
      unitCount: units.length,
      from,
      to,
    },
  });
});

export default router;
