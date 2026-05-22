import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAnyServiceDomains, requireEstablishmentOwner, type AuthRequest } from '../middleware/auth';
import { Venue } from '../models/Venue';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { ReservationHold } from '../models/ReservationHold';
import { TableBlock } from '../models/TableBlock';
import { VenueTablePolicy } from '../models/VenueTablePolicy';
import { MenuItem } from '../models/MenuItem';
import { logAudit } from '../utils/audit.util';

const router = Router();
router.use(authenticate, requireEstablishmentOwner, requireAnyServiceDomains('RESTAURANT', 'CAFE_LOUNGE'));

async function assertOwnedVenue(venueId: string, req: AuthRequest) {
  if (!mongoose.Types.ObjectId.isValid(venueId)) return null;
  const venue = await Venue.findById(venueId).select('_id ownerId type').lean();
  if (!venue) return null;
  if (!['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'].includes(String((venue as any).type || ''))) return null;
  if (req.userRole === 'ADMIN') return venue;
  if (String((venue as any).ownerId) !== String(req.userId)) return null;
  return venue;
}

router.get('/venues/:venueId/policy', async (req: AuthRequest, res) => {
  const venue = await assertOwnedVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Lieu introuvable ou non autorise.' });
  const policy = await VenueTablePolicy.findOne({ venueId: (venue as any)._id }).lean();
  return res.json({ success: true, data: policy || null });
});

router.put('/venues/:venueId/policy', async (req: AuthRequest, res) => {
  const venue = await assertOwnedVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Lieu introuvable ou non autorise.' });

  const payload = req.body || {};
  const shifts = Array.isArray(payload.shifts) ? payload.shifts : [];
  for (const s of shifts) {
    if (typeof s?.name !== 'string' || s.startHour == null || s.endHour == null) {
      return res.status(400).json({ error: 'Shift invalide.' });
    }
    if (Number(s.startHour) >= Number(s.endHour)) return res.status(400).json({ error: 'Shift startHour doit etre < endHour.' });
  }

  const next = await VenueTablePolicy.findOneAndUpdate(
    { venueId: (venue as any)._id },
    {
      $set: {
        slotMinutes: payload.slotMinutes,
        reservationDurationMinutes: payload.reservationDurationMinutes,
        openingHour: payload.openingHour,
        closingHour: payload.closingHour,
        shifts,
        depositRequired: !!payload.depositRequired,
        depositType: payload.depositType || (payload.depositRequired ? 'fixed' : 'none'),
        depositValue: Number(payload.depositValue || 0),
        cancellationCutoffMinutes: Number(payload.cancellationCutoffMinutes || 120),
        noShowGraceMinutes: Number(payload.noShowGraceMinutes || 15),
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'table_policy_update', slotMinutes: next?.slotMinutes, reservationDurationMinutes: next?.reservationDurationMinutes },
  });

  return res.json({ success: true, data: next });
});

router.get('/venues/:venueId/eligible-tables', async (req: AuthRequest, res) => {
  const venue = await assertOwnedVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Lieu introuvable ou non autorise.' });
  const { partySize, startAt, endAt } = req.query as Record<string, string>;
  const party = Math.max(1, Number(partySize) || 1);

  const tableFilter: Record<string, unknown> = {
    venueId: (venue as any)._id,
    isActive: true,
    isReservable: true,
    capacity: { $gte: party },
    defaultStatus: { $ne: 'blocked' },
  };

  const tables = await Table.find(tableFilter).sort({ capacity: 1, tableNumber: 1 }).lean();
  if (!startAt || !endAt) return res.json({ success: true, data: tables });

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!(start < end)) return res.status(400).json({ error: 'startAt/endAt invalides.' });

  const tableIds = tables.map((t: any) => t._id);
  const [reserved, holds, blocks] = await Promise.all([
    Reservation.find({
      venueId: (venue as any)._id,
      tableId: { $in: tableIds },
      status: { $in: ['PENDING', 'CONFIRMED', 'checked_in', 'confirmed'] },
      startAt: { $lt: end },
      endAt: { $gt: start },
    }).select('tableId').lean(),
    ReservationHold.find({
      venueId: (venue as any)._id,
      reservableUnitId: { $in: tableIds },
      status: 'active',
      expiresAt: { $gt: new Date() },
      startsAt: { $lt: end },
      endsAt: { $gt: start },
    }).select('reservableUnitId').lean(),
    TableBlock.find({
      venueId: (venue as any)._id,
      isActive: true,
      startsAt: { $lt: end },
      endsAt: { $gt: start },
    }).select('tableId zone startsAt endsAt').lean(),
  ]);

  const blockedTableIds = new Set<string>();
  for (const b of blocks as any[]) {
    if (b.tableId) blockedTableIds.add(String(b.tableId));
  }

  const reservedTableIds = new Set<string>([
    ...reserved.map((r: any) => String(r.tableId)).filter(Boolean),
    ...holds.map((h: any) => String(h.reservableUnitId)).filter(Boolean),
  ]);

  const eligible = tables.filter((t: any) => !reservedTableIds.has(String(t._id)) && !blockedTableIds.has(String(t._id)));
  return res.json({ success: true, data: eligible });
});

router.get('/venues/:venueId/blocks', async (req: AuthRequest, res) => {
  const venue = await assertOwnedVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Lieu introuvable ou non autorise.' });
  const { from, to, tableId } = req.query as Record<string, string>;
  const q: Record<string, unknown> = { venueId: (venue as any)._id, isActive: true };
  if (tableId && mongoose.Types.ObjectId.isValid(tableId)) q.tableId = tableId;
  if (from && to) q.$or = [{ startsAt: { $lt: new Date(to) }, endsAt: { $gt: new Date(from) } }];
  const blocks = await TableBlock.find(q).sort({ startsAt: 1 }).lean();
  return res.json({ success: true, data: blocks });
});

router.post('/venues/:venueId/blocks', async (req: AuthRequest, res) => {
  const venue = await assertOwnedVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Lieu introuvable ou non autorise.' });
  const { tableId, zone, startsAt, endsAt, reason = 'other', note } = req.body as Record<string, string>;
  if (!startsAt || !endsAt) return res.status(400).json({ error: 'startsAt/endsAt requis.' });
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (!(start < end)) return res.status(400).json({ error: 'Plage invalide.' });

  let targetTableId: mongoose.Types.ObjectId | null = null;
  if (tableId) {
    if (!mongoose.Types.ObjectId.isValid(tableId)) return res.status(400).json({ error: 'tableId invalide.' });
    const table = await Table.findOne({ _id: tableId, venueId: (venue as any)._id }).select('_id').lean();
    if (!table) return res.status(404).json({ error: 'Table introuvable.' });
    targetTableId = (table as any)._id;
  }

  const existing = await TableBlock.findOne({
    venueId: (venue as any)._id,
    tableId: targetTableId,
    isActive: true,
    startsAt: { $lt: end },
    endsAt: { $gt: start },
  }).lean();
  if (existing) return res.status(409).json({ error: 'Un bloc existe deja sur cette plage.' });

  const block = await TableBlock.create({
    venueId: (venue as any)._id,
    tableId: targetTableId,
    zone: zone || null,
    startsAt: start,
    endsAt: end,
    reason,
    note,
    isActive: true,
    createdBy: req.userId || undefined,
  });
  await logAudit(req as any, {
    action: 'ROOM_BLOCK_CREATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'table_block_create', blockId: String(block._id), startsAt: start, endsAt: end, tableId: targetTableId ? String(targetTableId) : null },
  });
  return res.status(201).json({ success: true, data: block });
});

router.patch('/blocks/:id', async (req: AuthRequest, res) => {
  const block = await TableBlock.findById(req.params.id);
  if (!block) return res.status(404).json({ error: 'Bloc introuvable.' });
  const venue = await assertOwnedVenue(String(block.venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });

  const updates = req.body || {};
  if (updates.startsAt || updates.endsAt) {
    const start = new Date(updates.startsAt ?? block.startsAt);
    const end = new Date(updates.endsAt ?? block.endsAt);
    if (!(start < end)) return res.status(400).json({ error: 'Plage invalide.' });
    block.startsAt = start;
    block.endsAt = end;
  }
  if (updates.reason) (block as any).reason = updates.reason;
  if (updates.note !== undefined) block.note = updates.note;
  if (updates.isActive !== undefined) block.isActive = !!updates.isActive;
  if (updates.zone !== undefined) (block as any).zone = updates.zone || null;
  await block.save();
  await logAudit(req as any, {
    action: 'ROOM_BLOCK_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'table_block_update', blockId: String(block._id) },
  });
  return res.json({ success: true, data: block });
});

router.delete('/blocks/:id', async (req: AuthRequest, res) => {
  const block = await TableBlock.findById(req.params.id);
  if (!block) return res.status(404).json({ error: 'Bloc introuvable.' });
  const venue = await assertOwnedVenue(String(block.venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  block.isActive = false;
  await block.save();
  await logAudit(req as any, {
    action: 'ROOM_BLOCK_DELETED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'table_block_deactivate', blockId: String(block._id) },
  });
  return res.json({ success: true });
});

router.get('/reservations', async (req: AuthRequest, res) => {
  const owned = await Venue.find({
    ownerId: req.userRole === 'ADMIN' ? { $exists: true } : req.userId,
    type: { $in: ['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'] },
  }).select('_id').lean();
  const venueIds = owned.map((v: any) => v._id);
  if (!venueIds.length) return res.json({ success: true, data: [] });
  const { status, venueId, from, to, q } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { venueId: { $in: venueIds }, bookingType: 'TABLE' };
  if (status) filter.status = status;
  if (venueId && mongoose.Types.ObjectId.isValid(venueId)) filter.venueId = new mongoose.Types.ObjectId(venueId);
  if (from || to) {
    filter.startAt = {};
    if (from) (filter.startAt as Record<string, unknown>).$gte = new Date(from);
    if (to) (filter.startAt as Record<string, unknown>).$lte = new Date(to);
  }
  if (q) {
    filter.$or = [
      { reservationCode: { $regex: q, $options: 'i' } },
      { guestFirstName: { $regex: q, $options: 'i' } },
      { guestLastName: { $regex: q, $options: 'i' } },
      { guestPhone: { $regex: q, $options: 'i' } },
    ];
  }
  const rows = await Reservation.find(filter)
    .populate('venueId', 'name city')
    .populate('tableId', 'tableNumber name capacity locationLabel')
    .sort({ startAt: -1 })
    .limit(300)
    .lean();
  return res.json({ success: true, data: rows });
});

router.post('/reservations/:id/check-in', async (req: AuthRequest, res) => {
  const row = await Reservation.findById(req.params.id).populate('venueId', 'ownerId type');
  if (!row) return res.status(404).json({ error: 'Reservation introuvable.' });
  const venue = row.venueId as any;
  if (!venue || !['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'].includes(String(venue.type || ''))) return res.status(400).json({ error: 'Non supporte.' });
  if (req.userRole !== 'ADMIN' && String(venue.ownerId) !== String(req.userId)) return res.status(403).json({ error: 'Acces refuse.' });
  row.checkInStatus = 'checked_in';
  row.checkedInAt = new Date();
  row.status = 'checked_in';
  await row.save();
  await logAudit(req as any, {
    action: 'RESERVATION_CHECKED_IN',
    userId: req.userId as any,
    entityType: 'reservation',
    entityId: row._id as any,
    details: { flow: 'owner_table' },
  });
  return res.json({ success: true, data: row });
});

router.post('/reservations/:id/check-out', async (req: AuthRequest, res) => {
  const row = await Reservation.findById(req.params.id).populate('venueId', 'ownerId type');
  if (!row) return res.status(404).json({ error: 'Reservation introuvable.' });
  const venue = row.venueId as any;
  if (!venue || !['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'].includes(String(venue.type || ''))) return res.status(400).json({ error: 'Non supporte.' });
  if (req.userRole !== 'ADMIN' && String(venue.ownerId) !== String(req.userId)) return res.status(403).json({ error: 'Acces refuse.' });
  row.status = 'completed';
  if (row.paymentStatus !== 'paid') row.paymentStatus = 'paid';
  row.amountPaid = row.totalPrice;
  row.remainingAmount = 0;
  await row.save();
  await logAudit(req as any, {
    action: 'RESERVATION_CHECKED_OUT',
    userId: req.userId as any,
    entityType: 'reservation',
    entityId: row._id as any,
    details: { flow: 'owner_table' },
  });
  return res.json({ success: true, data: row });
});

router.post('/reservations/:id/no-show', async (req: AuthRequest, res) => {
  const row = await Reservation.findById(req.params.id).populate('venueId', 'ownerId type _id');
  if (!row) return res.status(404).json({ error: 'Reservation introuvable.' });
  const venue = row.venueId as any;
  if (!venue || !['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'].includes(String(venue.type || ''))) return res.status(400).json({ error: 'Non supporte.' });
  if (req.userRole !== 'ADMIN' && String(venue.ownerId) !== String(req.userId)) return res.status(403).json({ error: 'Acces refuse.' });
  const policy = await VenueTablePolicy.findOne({ venueId: venue._id }).lean();
  const grace = Number(policy?.noShowGraceMinutes || 15);
  const noShowAt = new Date(new Date(row.startAt).getTime() + grace * 60 * 1000);
  if (Date.now() < noShowAt.getTime()) {
    return res.status(400).json({ error: `No-show possible apres ${grace} min du debut.` });
  }
  row.status = 'no_show';
  await row.save();
  await logAudit(req as any, {
    action: 'RESERVATION_NO_SHOW',
    userId: req.userId as any,
    entityType: 'reservation',
    entityId: row._id as any,
    details: { flow: 'owner_table', graceMinutes: grace },
  });
  return res.json({ success: true, data: row });
});

router.get('/preorders', async (req: AuthRequest, res) => {
  const owned = await Venue.find({
    ownerId: req.userRole === 'ADMIN' ? { $exists: true } : req.userId,
    type: { $in: ['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'] },
  }).select('_id').lean();
  const venueIds = owned.map((v: any) => v._id);
  if (!venueIds.length) return res.json({ success: true, data: [] });

  const { venueId, prepStatus } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {
    venueId: { $in: venueIds },
    bookingType: 'TABLE',
    orderType: 'with_menu',
  };
  if (venueId && mongoose.Types.ObjectId.isValid(venueId)) filter.venueId = new mongoose.Types.ObjectId(venueId);
  if (prepStatus) filter.menuPrepStatus = prepStatus;

  const rows = await Reservation.find(filter)
    .populate('venueId', 'name')
    .populate('tableId', 'tableNumber name')
    .sort({ startAt: 1 })
    .limit(300)
    .lean();
  return res.json({ success: true, data: rows });
});

router.patch('/preorders/:id/prep-status', async (req: AuthRequest, res) => {
  const allowed = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
  const nextStatus = String(req.body?.status || '').trim();
  if (!allowed.includes(nextStatus)) return res.status(400).json({ error: 'Statut invalide.' });

  const row = await Reservation.findById(req.params.id).populate('venueId', 'ownerId type');
  if (!row) return res.status(404).json({ error: 'Reservation introuvable.' });
  const venue = row.venueId as any;
  if (!venue || !['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'].includes(String(venue.type || ''))) return res.status(400).json({ error: 'Non supporte.' });
  if (req.userRole !== 'ADMIN' && String(venue.ownerId) !== String(req.userId)) return res.status(403).json({ error: 'Acces refuse.' });
  if (row.orderType !== 'with_menu') return res.status(400).json({ error: 'Aucune precommande liee.' });

  (row as any).menuPrepStatus = nextStatus;
  (row as any).menuPrepUpdatedAt = new Date();
  await row.save();
  await logAudit(req as any, {
    action: 'RESERVATION_NOTE_ADDED',
    userId: req.userId as any,
    entityType: 'reservation',
    entityId: row._id as any,
    details: { flow: 'owner_table_prep_status', status: nextStatus },
  });
  return res.json({ success: true, data: row });
});

router.get('/venues/:venueId/menu-items', async (req: AuthRequest, res) => {
  const venue = await assertOwnedVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Lieu introuvable ou non autorise.' });
  const rows = await MenuItem.find({ venueId: (venue as any)._id }).sort({ category: 1, name: 1 }).lean();
  return res.json({ success: true, data: rows });
});

router.post('/venues/:venueId/menu-items', async (req: AuthRequest, res) => {
  const venue = await assertOwnedVenue(req.params.venueId, req);
  if (!venue) return res.status(404).json({ error: 'Lieu introuvable ou non autorise.' });
  const b = req.body || {};
  if (!b.name || b.price == null) return res.status(400).json({ error: 'name et price requis.' });
  const row = await MenuItem.create({
    venueId: (venue as any)._id,
    name: String(b.name).trim(),
    description: b.description ? String(b.description).trim() : undefined,
    price: Number(b.price),
    category: b.category || 'plat',
    isAvailable: b.isAvailable !== false,
    isPopular: !!b.isPopular,
    image: b.image || '',
  });
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'menu_item_create', menuItemId: String(row._id) },
  });
  return res.status(201).json({ success: true, data: row });
});

router.patch('/menu-items/:id', async (req: AuthRequest, res) => {
  const row = await MenuItem.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Article introuvable.' });
  const venue = await assertOwnedVenue(String((row as any).venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  const allowed = ['name', 'description', 'price', 'category', 'isAvailable', 'isPopular', 'trackStock', 'stockQty', 'availableFrom', 'availableTo', 'image', 'allergens'];
  for (const key of allowed) {
    if ((req.body as any)[key] !== undefined) (row as any)[key] = (req.body as any)[key];
  }
  await row.save();
  return res.json({ success: true, data: row });
});

router.delete('/menu-items/:id', async (req: AuthRequest, res) => {
  const row = await MenuItem.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Article introuvable.' });
  const venue = await assertOwnedVenue(String((row as any).venueId), req);
  if (!venue) return res.status(403).json({ error: 'Acces refuse.' });
  await row.deleteOne();
  await logAudit(req as any, {
    action: 'VENUE_UPDATED',
    userId: req.userId as any,
    entityType: 'venue',
    entityId: (venue as any)._id as any,
    details: { feature: 'menu_item_delete', menuItemId: req.params.id },
  });
  return res.json({ success: true });
});

export default router;
