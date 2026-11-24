/**
 * Super-admin console (guesthouse marketplace) — read models for the redesigned admin.
 *
 *   GET   /admin-console/analytics                    KPIs, series, breakdowns, operations (see services/adminAnalytics)
 *   GET   /admin-console/reservations                 filterable, paginated reservation list (+ ?format=csv)
 *   GET   /admin-console/customers                    customers with booking counts / value
 *   GET   /admin-console/customers/:id                customer detail + reservation history
 *   GET   /admin-console/applications                 "Demandes d'adhésion"
 *   PATCH /admin-console/applications/:id             status / internal notes
 *   POST  /admin-console/applications/:id/approve     invite owner + create an UNPUBLISHED draft maison
 *   POST  /admin-console/applications/:id/reject      close with a decision note
 *
 * State changes on reservations stay in /admin-bookings (state machine + audit + e-mails).
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth';
import { Venue } from '../models/Venue';
import { Room } from '../models/Room';
import { Scene } from '../models/Scene';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { PartnerApplication } from '../models/PartnerApplication';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { logAudit } from '../utils/audit.util';
import { slugify } from '../utils/slug';
import { logger } from '../config/logger';
import { adminAnalytics, resolvePeriod, zonedMidnight, LIVE, DRAFT_PLACEHOLDER } from '../services/adminAnalytics';
import { issuePasswordLink } from '../services/accountTokens';
import { requestTtlHours } from '../services/bookingEngine';
import { queueAccountEmail } from '../services/bookingEmails';

const router = Router();
router.use(authenticate, requireAdmin);

const isId = (v: unknown): v is string => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v) && v.length === 24;
const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ci = (list: string[]) => list.flatMap((s) => [s, s.toUpperCase()]);
const addDay = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/* ── analytics ────────────────────────────────────────────── */
router.get('/analytics', async (req: AuthRequest, res) => {
  try {
    const data = await adminAnalytics({ from: req.query.from, to: req.query.to, group: req.query.group, includeDemo: req.query.demo === '1' });
    return sendSuccess(res, { data });
  } catch (err) {
    logger.error('admin-console/analytics failed', err);
    return sendError(res, { message: 'Échec du chargement des statistiques.', statusCode: 500 });
  }
});

/* ── reservations ─────────────────────────────────────────── */
const STATUS_GROUPS: Record<string, string[]> = {
  pending: ['pending'],
  confirmed: ['confirmed', 'checked_in'],
  completed: ['completed'],
  cancelled: ['cancelled'],
  rejected: ['rejected'],
  expired: ['expired'],
  no_show: ['no_show'],
  live: LIVE,
};

async function reservationFilter(q: Record<string, unknown>) {
  const filter: Record<string, unknown> = { bookingType: 'ROOM' };
  const venueFilter: Record<string, unknown> = { type: 'MAISON_DHOTE' };
  if (isId(q.ownerId)) venueFilter.ownerId = new mongoose.Types.ObjectId(q.ownerId);
  if (isId(q.venueId)) venueFilter._id = new mongoose.Types.ObjectId(q.venueId);
  filter.venueId = { $in: await Venue.find(venueFilter).distinct('_id') };
  if (q.demo !== '1') filter.isDemo = { $ne: true };
  const status = str(q.status, 20);
  if (STATUS_GROUPS[status]) filter.status = { $in: ci(STATUS_GROUPS[status]) };
  if (isId(q.customerId)) filter.userId = new mongoose.Types.ObjectId(q.customerId);
  if (q.bookingMode === 'request' || q.bookingMode === 'instant') filter.bookingMode = q.bookingMode;
  const search = str(q.q, 80);
  if (search) {
    const rx = new RegExp(escapeRx(search), 'i');
    filter.$or = [{ reservationCode: rx }, { confirmationCode: rx }, { customerFirstName: rx }, { customerLastName: rx }, { customerEmail: rx }, { customerPhone: rx }];
  }
  if (q.from || q.to) {
    const p = resolvePeriod(q.from, q.to);
    const field = q.dateField === 'checkIn' ? 'startAt' : q.dateField === 'checkOut' ? 'endAt' : 'createdAt';
    // Stay dates are stored as UTC midnights of the local day; createdAt is an instant (Tunis day bounds).
    filter[field] = field === 'createdAt'
      ? { $gte: zonedMidnight(p.from), $lt: zonedMidnight(addDay(p.to, 1)) }
      : { $gte: new Date(`${p.from}T00:00:00Z`), $lt: new Date(`${addDay(p.to, 1)}T00:00:00Z`) };
  }
  return filter;
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  created_desc: { createdAt: -1 },
  created_asc: { createdAt: 1 },
  checkin_asc: { startAt: 1 },
  checkin_desc: { startAt: -1 },
  total_desc: { totalPrice: -1 },
};

function reservationRow(r: any) {
  const v = r.venueId && typeof r.venueId === 'object' ? r.venueId : null;
  const owner = v?.ownerId && typeof v.ownerId === 'object' ? v.ownerId : null;
  const guestName = [r.customerFirstName, r.customerLastName].filter(Boolean).join(' ') || r.userId?.fullName || r.guestName || null;
  return {
    id: String(r._id),
    reference: r.reservationCode ?? r.confirmationCode ?? String(r._id).slice(-8).toUpperCase(),
    guest: { name: guestName, email: r.customerEmail ?? r.userId?.email ?? null, phone: r.customerPhone ?? r.guestPhone ?? null, userId: r.userId?._id ? String(r.userId._id) : null },
    property: v ? { id: String(v._id), name: v.name, slug: v.slug ?? null, city: v.city ?? null } : null,
    owner: owner ? { id: String(owner._id), name: owner.fullName, email: owner.email } : null,
    checkIn: r.startAt,
    checkOut: r.endAt,
    nights: r.nights ?? Math.max(0, Math.round((new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) / 86_400_000)),
    adults: r.adults ?? r.partySize ?? null,
    children: r.children ?? 0,
    total: r.totalPrice ?? 0,
    currency: r.priceBreakdown?.currency ?? 'TND',
    status: String(r.status ?? '').toLowerCase(),
    paymentStatus: r.paymentStatus ?? 'unpaid',
    bookingMode: r.bookingMode ?? null,
    unitScope: r.unitScope ?? null,
    isDemo: !!r.isDemo,
    expiresAt: r.expiresAt ?? null,
    createdAt: r.createdAt,
  };
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

router.get('/reservations', async (req: AuthRequest, res) => {
  try {
    const filter = await reservationFilter(req.query as Record<string, unknown>);
    const sort = SORTS[str(req.query.sort, 20)] ?? SORTS.created_desc;
    const csv = req.query.format === 'csv';
    const limit = csv ? 5000 : Math.min(100, Math.max(5, Number(req.query.limit) || 20));
    const page = csv ? 1 : Math.max(1, Number(req.query.page) || 1);
    const query = Reservation.find(filter)
      .populate({ path: 'venueId', select: 'name slug city ownerId', populate: { path: 'ownerId', select: 'fullName email' } })
      .populate('userId', 'fullName email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const [rows, total] = await Promise.all([query, Reservation.countDocuments(filter)]);
    const data = (rows as any[]).map(reservationRow);
    if (csv) {
      const head = ['Référence', 'Client', 'Email', 'Téléphone', 'Maison', 'Propriétaire', 'Arrivée', 'Départ', 'Nuits', 'Adultes', 'Enfants', 'Total TND', 'Statut', 'Paiement', 'Créée le'];
      const lines = data.map((r) => [r.reference, r.guest.name, r.guest.email, r.guest.phone, r.property?.name, r.owner?.name, r.checkIn, r.checkOut, r.nights, r.adults, r.children, r.total, r.status, r.paymentStatus, r.createdAt].map(csvCell).join(','));
      await logAudit(req, { userId: req.userId as any, action: 'ADMIN_SETTING_CHANGED', entityType: 'reservation', details: { export: 'reservations_csv', rows: data.length } });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reservations-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send('﻿' + [head.map(csvCell).join(','), ...lines].join('\r\n'));
    }
    return sendSuccess(res, { data: { rows: data, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit } });
  } catch (err) {
    logger.error('admin-console/reservations failed', err);
    return sendError(res, { message: 'Échec du chargement des réservations.', statusCode: 500 });
  }
});

/* ── customers ────────────────────────────────────────────── */
router.get('/customers', async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const filter: Record<string, unknown> = { role: 'CUSTOMER' };
    const search = str(req.query.q, 80);
    if (search) {
      const rx = new RegExp(escapeRx(search), 'i');
      filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
    }
    if (req.query.status === 'active') filter.isActive = { $ne: false };
    if (req.query.status === 'suspended') filter.isActive = false;
    const [users, total] = await Promise.all([
      User.find(filter).select('fullName email phone isActive emailVerified createdAt lastLoginAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    const ids = (users as any[]).map((u) => u._id);
    const stats: any[] = await Reservation.aggregate([
      { $match: { userId: { $in: ids }, bookingType: 'ROOM' } },
      {
        $group: {
          _id: '$userId',
          bookings: { $sum: 1 },
          value: { $sum: { $cond: [{ $in: [{ $toLower: '$status' }, LIVE] }, { $ifNull: ['$totalPrice', 0] }, 0] } },
          lastBooking: { $max: '$createdAt' },
        },
      },
    ]);
    const by = new Map(stats.map((s) => [String(s._id), s]));
    return sendSuccess(res, {
      data: {
        rows: (users as any[]).map((u) => ({
          id: String(u._id),
          fullName: u.fullName,
          email: u.email,
          phone: u.phone ?? null,
          isActive: u.isActive !== false,
          emailVerified: !!u.emailVerified,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt ?? null,
          bookings: by.get(String(u._id))?.bookings ?? 0,
          confirmedValue: Math.round((by.get(String(u._id))?.value ?? 0) * 100) / 100,
          lastBooking: by.get(String(u._id))?.lastBooking ?? null,
        })),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    logger.error('admin-console/customers failed', err);
    return sendError(res, { message: 'Échec du chargement des clients.', statusCode: 500 });
  }
});

router.get('/customers/:id', async (req: AuthRequest, res) => {
  if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
  const user: any = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' }).select('fullName email phone isActive emailVerified createdAt lastLoginAt').lean();
  if (!user) return sendError(res, { message: 'Client introuvable.', statusCode: 404 });
  const rows: any[] = await Reservation.find({ userId: user._id, bookingType: 'ROOM' })
    .populate({ path: 'venueId', select: 'name slug city ownerId', populate: { path: 'ownerId', select: 'fullName email' } })
    .sort({ startAt: -1 })
    .limit(200)
    .lean();
  return sendSuccess(res, { data: { customer: { id: String(user._id), ...user, _id: undefined }, reservations: rows.map(reservationRow) } });
});

/* ── booking configuration (read-only, server-side) ───────── */
router.get('/config', (_req: AuthRequest, res) => {
  const year = new Date().getUTCFullYear();
  return sendSuccess(res, {
    data: {
      timezone: 'Africa/Tunis',
      requestTtlHours: requestTtlHours(),
      requestTtlSource: process.env.BOOKING_REQUEST_TTL_HOURS ? 'env' : 'default',
      referenceExample: `EX-${year}-000001`,
      demoReferenceExample: `EX-DEMO-${year}-000001`,
      defaultBookingMode: 'request',
      cancellationPolicies: ['flexible', 'moderate', 'strict'],
    },
  });
});

/* ── owners (augmented list) ──────────────────────────────── */
router.get('/owners', async (_req: AuthRequest, res) => {
  const owners: any[] = await User.find({ role: 'ESTABLISHMENT_OWNER' }).select('fullName email phone isActive createdAt lastLoginAt').sort({ createdAt: -1 }).lean();
  const venues: any[] = await Venue.find({ ownerId: { $in: owners.map((o) => o._id) }, type: 'MAISON_DHOTE', archivedAt: null })
    .select('name slug ownerId isPublished approvalStatus isDemo').lean();
  const stats: any[] = await Reservation.aggregate([
    { $match: { venueId: { $in: venues.map((v) => v._id) }, bookingType: 'ROOM' } },
    {
      $group: {
        _id: '$venueId',
        active: { $sum: { $cond: [{ $and: [{ $in: [{ $toLower: '$status' }, ['pending', 'confirmed', 'checked_in']] }, { $gte: ['$endAt', new Date()] }] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: [{ $toLower: '$status' }, 'pending'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);
  const byVenue = new Map(stats.map((s) => [String(s._id), s]));
  return sendSuccess(res, {
    data: owners.map((o) => {
      const mine = venues.filter((v) => String(v.ownerId) === String(o._id));
      const agg = mine.reduce((a, v) => {
        const s = byVenue.get(String(v._id));
        return { active: a.active + (s?.active ?? 0), pending: a.pending + (s?.pending ?? 0), total: a.total + (s?.total ?? 0) };
      }, { active: 0, pending: 0, total: 0 });
      return {
        id: String(o._id), fullName: o.fullName, email: o.email, phone: o.phone ?? null, isActive: o.isActive !== false,
        createdAt: o.createdAt, lastLoginAt: o.lastLoginAt ?? null,
        // Onboarding: invited (never signed in) → no property → property not yet published → active.
        onboarding: !o.lastLoginAt ? 'invited' : !mine.length ? 'no_property' : mine.some((v) => v.isPublished !== false && (v.approvalStatus ?? 'approved') === 'approved') ? 'active' : 'setup',
        properties: mine.map((v) => ({ id: String(v._id), name: v.name, slug: v.slug, isDemo: !!v.isDemo, published: v.isPublished !== false && (v.approvalStatus ?? 'approved') === 'approved' })),
        reservations: agg,
      };
    }),
  });
});

/* ── guesthouses ──────────────────────────────────────────── */
router.get('/guesthouses', async (_req: AuthRequest, res) => {
  try {
    const venues: any[] = await Venue.find({ type: 'MAISON_DHOTE', archivedAt: null })
      .populate('ownerId', 'fullName email isActive')
      .select('name slug city governorate coverImage gallery isDemo isPublished publicListed approvalStatus bookingEnabled bookingMode rentalMode entirePricePerNight maxGuests ownerId coordinates description address immersiveUrl hasVirtualTour updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .lean();
    const ids = venues.map((v) => v._id);
    const [rooms, counts, scenes] = await Promise.all([
      Room.aggregate([
        { $match: { venueId: { $in: ids }, isActive: true, isReservable: true } },
        { $group: { _id: '$venueId', n: { $sum: 1 }, capacity: { $sum: '$capacity' }, minPrice: { $min: { $cond: [{ $gt: ['$pricePerNight', 0] }, '$pricePerNight', null] } } } },
      ]),
      Reservation.aggregate([
        { $match: { venueId: { $in: ids }, bookingType: 'ROOM' } },
        { $group: { _id: '$venueId', total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: [{ $toLower: '$status' }, 'pending'] }, 1, 0] } } } },
      ]),
      Scene.aggregate([{ $match: { venueId: { $in: ids } } }, { $group: { _id: '$venueId', n: { $sum: 1 } } }]),
    ]);
    const R = new Map(rooms.map((r: any) => [String(r._id), r]));
    const C = new Map(counts.map((c: any) => [String(c._id), c]));
    const S = new Map(scenes.map((s: any) => [String(s._id), s.n as number]));
    return sendSuccess(res, {
      data: venues.map((v) => {
        const id = String(v._id);
        const r = R.get(id);
        const entire = v.rentalMode === 'entire';
        const basePrice = entire ? v.entirePricePerNight ?? null : r?.minPrice ?? null;
        const capacity = entire ? v.maxGuests ?? null : r?.capacity ?? null;
        const configured = entire ? (v.entirePricePerNight ?? 0) > 0 && (v.maxGuests ?? 0) > 0 : (r?.minPrice ?? 0) > 0;
        const missing = [
          !configured && 'tarifs / capacité',
          !v.coverImage && 'photo de couverture',
          v.coordinates?.lat == null && 'localisation',
          (!v.description || v.description === DRAFT_PLACEHOLDER) && 'description',
          (!v.address || v.address === DRAFT_PLACEHOLDER) && 'adresse',
          !v.governorate && 'gouvernorat',
        ].filter(Boolean) as string[];
        const publicState = v.approvalStatus === 'suspended' ? 'suspended'
          : v.isPublished === false || (v.approvalStatus && v.approvalStatus !== 'approved') ? (v.approvalStatus === 'pending_review' ? 'pending_review' : 'draft')
          : 'published';
        const sceneCount = S.get(id) ?? 0;
        return {
          id, name: v.name, slug: v.slug, city: v.city, governorate: v.governorate ?? null,
          coverImage: v.coverImage ?? v.gallery?.[0] ?? null, photos: (v.gallery?.length ?? 0) + (v.coverImage ? 1 : 0),
          isDemo: !!v.isDemo, publicState, approvalStatus: v.approvalStatus ?? 'approved', isPublished: v.isPublished !== false,
          bookingEnabled: v.bookingEnabled ?? null, bookingMode: v.bookingMode ?? 'request', rentalMode: v.rentalMode ?? 'rooms',
          rooms: r?.n ?? 0, basePrice, capacity,
          owner: v.ownerId ? { id: String(v.ownerId._id), name: v.ownerId.fullName, email: v.ownerId.email, isActive: v.ownerId.isActive !== false } : null,
          reservations: C.get(id)?.total ?? 0, pendingReservations: C.get(id)?.pending ?? 0,
          tour: v.immersiveUrl ? 'external' : sceneCount > 0 ? 'scenes' : 'none', sceneCount,
          missing, updatedAt: v.updatedAt, createdAt: v.createdAt,
        };
      }),
    });
  } catch (err) {
    logger.error('admin-console/guesthouses failed', err);
    return sendError(res, { message: 'Échec du chargement des maisons.', statusCode: 500 });
  }
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(140),
  city: z.string().trim().min(1).max(80),
  governorate: z.string().trim().max(60).optional(),
  ownerId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  rentalMode: z.enum(['entire', 'rooms']).default('entire'),
});
router.post('/guesthouses', async (req: AuthRequest, res) => {
  try {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return sendError(res, { message: parsed.error.issues[0]?.message ?? 'Données invalides.', statusCode: 422 });
    const d = parsed.data;
    if (d.ownerId) {
      const o: any = await User.findById(d.ownerId).select('role').lean();
      if (!o || o.role !== 'ESTABLISHMENT_OWNER') return sendError(res, { message: "Ce compte n'est pas un propriétaire.", statusCode: 422 });
    }
    let slug = slugify(d.name) || `maison-${crypto.randomBytes(3).toString('hex')}`;
    if (await Venue.exists({ slug })) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    const venue: any = await Venue.create({
      name: d.name, slug, type: 'MAISON_DHOTE', city: d.city, governorate: d.governorate, address: DRAFT_PLACEHOLDER, description: DRAFT_PLACEHOLDER,
      ownerId: d.ownerId, rentalMode: d.rentalMode, isPublished: false, publicListed: false, approvalStatus: 'draft', bookingEnabled: false, bookingMode: 'request',
      createdBy: req.userId,
    });
    await logAudit(req, { userId: req.userId as any, action: 'VENUE_CREATED', entityType: 'venue', entityId: venue._id, details: { name: d.name, draft: true, ownerId: d.ownerId ?? null } });
    return sendSuccess(res, { data: { id: String(venue._id), slug }, statusCode: 201 });
  } catch (err) {
    logger.error('admin-console/guesthouses create failed', err);
    return sendError(res, { message: 'Création impossible.', statusCode: 500 });
  }
});

/* ── applications (Demandes d'adhésion) ───────────────────── */
const appRow = (a: any) => ({
  id: String(a._id),
  establishmentName: a.establishmentName,
  contactName: a.contactName,
  email: a.email,
  phone: a.phone,
  city: a.city,
  message: a.message ?? null,
  status: a.status,
  decision: a.decision ?? null,
  decisionNote: a.decisionNote ?? null,
  decidedAt: a.decidedAt ?? null,
  decidedBy: a.decidedBy && typeof a.decidedBy === 'object' ? { name: a.decidedBy.fullName, email: a.decidedBy.email } : null,
  owner: a.ownerId && typeof a.ownerId === 'object' ? { id: String(a.ownerId._id), name: a.ownerId.fullName, email: a.ownerId.email } : null,
  venue: a.venueId && typeof a.venueId === 'object' ? { id: String(a.venueId._id), name: a.venueId.name, slug: a.venueId.slug, approvalStatus: a.venueId.approvalStatus } : null,
  adminNotes: a.adminNotes ?? null,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

router.get('/applications', async (req: AuthRequest, res) => {
  const filter: Record<string, unknown> = {};
  const s = str(req.query.status, 20);
  if (s === 'open') filter.status = { $in: ['new', 'in_review', 'contacted'] };
  else if (['new', 'in_review', 'contacted', 'closed'].includes(s)) filter.status = s;
  if (req.query.decision === 'approved' || req.query.decision === 'rejected') filter.decision = req.query.decision;
  const rows = await PartnerApplication.find(filter)
    .populate('decidedBy', 'fullName email')
    .populate('ownerId', 'fullName email')
    .populate('venueId', 'name slug approvalStatus')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  const counts: any[] = await PartnerApplication.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  return sendSuccess(res, { data: { rows: (rows as any[]).map(appRow), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) } });
});

const appPatch = z.object({
  status: z.enum(['new', 'in_review', 'contacted']).optional(),
  adminNotes: z.string().trim().max(4000).optional(),
});
router.patch('/applications/:id', async (req: AuthRequest, res) => {
  if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
  const parsed = appPatch.safeParse(req.body ?? {});
  if (!parsed.success) return sendError(res, { message: 'Données invalides.', statusCode: 422 });
  const a: any = await PartnerApplication.findById(req.params.id).lean();
  if (!a) return sendError(res, { message: 'Demande introuvable.', statusCode: 404 });
  if (a.decision && parsed.data.status) return sendError(res, { message: 'Cette demande a déjà été traitée.', statusCode: 409 });
  await PartnerApplication.updateOne({ _id: a._id }, { $set: parsed.data });
  await logAudit(req, { userId: req.userId as any, action: 'APPLICATION_UPDATED', entityType: 'application', entityId: a._id, details: { changes: parsed.data } });
  return sendSuccess(res, { data: { id: String(a._id) } });
});

const approveSchema = z.object({
  ownerFullName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().toLowerCase().email().max(160),
  ownerPhone: z.string().trim().max(30).optional(),
  venueName: z.string().trim().min(2).max(140),
  city: z.string().trim().max(80).optional(),
  governorate: z.string().trim().max(60).optional(),
  sendInvite: z.boolean().default(true),
  note: z.string().trim().max(1000).optional(),
});

router.post('/applications/:id/approve', async (req: AuthRequest, res) => {
  try {
    if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
    const parsed = approveSchema.safeParse(req.body ?? {});
    if (!parsed.success) return sendError(res, { message: parsed.error.issues[0]?.message ?? 'Données invalides.', statusCode: 422 });
    const d = parsed.data;
    const app: any = await PartnerApplication.findById(req.params.id).lean();
    if (!app) return sendError(res, { message: 'Demande introuvable.', statusCode: 404 });
    if (app.decision) return sendError(res, { message: 'Cette demande a déjà été traitée.', statusCode: 409 });

    // Owner: reuse an existing OWNER account with this e-mail, never change another role.
    let owner: any = await User.findOne({ email: d.ownerEmail }).select('role fullName email').lean();
    if (owner && owner.role !== 'ESTABLISHMENT_OWNER') return sendError(res, { message: 'Cet e-mail appartient déjà à un compte non propriétaire.', statusCode: 409 });
    let setupLink: string | null = null;
    if (!owner) {
      owner = await User.create({
        fullName: d.ownerFullName, email: d.ownerEmail, phone: d.ownerPhone, role: 'ESTABLISHMENT_OWNER', serviceDomains: ['HOTEL'], isActive: true,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12), // unusable until the setup link is used
      });
      const link = await issuePasswordLink(owner._id, 72);
      setupLink = link.url;
      if (d.sendInvite) {
        await queueAccountEmail({
          key: `invite:${String(owner._id)}:${link.expiresAt.getTime()}`,
          to: d.ownerEmail,
          subject: 'Votre demande Exploria360 est acceptée',
          heading: 'Bienvenue sur Exploria360',
          intro: `Bonjour ${d.ownerFullName}, votre maison « ${d.venueName} » rejoint Exploria360. Choisissez votre mot de passe pour compléter sa fiche, ses photos et son calendrier.`,
          ctaLabel: 'Créer mon mot de passe',
          ctaUrl: link.url,
          note: 'Ce lien est personnel, valable 72 heures et utilisable une seule fois. La fiche ne sera publiée qu’après validation par notre équipe.',
        });
      }
    }

    // Draft maison: never public until an admin publishes it.
    let slug = slugify(d.venueName) || `maison-${crypto.randomBytes(3).toString('hex')}`;
    if (await Venue.exists({ slug })) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    const venue: any = await Venue.create({
      name: d.venueName, slug, type: 'MAISON_DHOTE', city: d.city || app.city, governorate: d.governorate, address: DRAFT_PLACEHOLDER, description: DRAFT_PLACEHOLDER,
      ownerId: owner._id, isPublished: false, publicListed: false, approvalStatus: 'draft', bookingEnabled: false, bookingMode: 'request',
    });

    await PartnerApplication.updateOne(
      { _id: app._id, decision: { $exists: false } },
      { $set: { decision: 'approved', decisionNote: d.note, decidedAt: new Date(), decidedBy: req.userId, ownerId: owner._id, venueId: venue._id, status: 'closed' } }
    );
    await logAudit(req, { userId: req.userId as any, action: 'APPLICATION_APPROVED', entityType: 'application', entityId: app._id, details: { owner: d.ownerEmail, venue: venue.name, venueId: String(venue._id), invited: !!setupLink && d.sendInvite } });
    // The setup link is returned once so the admin can hand it over if e-mail delivery is not configured. Never logged.
    return sendSuccess(res, { data: { venueId: String(venue._id), ownerId: String(owner._id), setupLink }, statusCode: 201 });
  } catch (err) {
    logger.error('admin-console/applications approve failed', err);
    return sendError(res, { message: 'Validation impossible.', statusCode: 500 });
  }
});

router.post('/applications/:id/reject', async (req: AuthRequest, res) => {
  if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
  const note = str(req.body?.note, 1000);
  const upd = await PartnerApplication.updateOne(
    { _id: req.params.id, decision: { $exists: false } },
    { $set: { decision: 'rejected', decisionNote: note || undefined, decidedAt: new Date(), decidedBy: req.userId, status: 'closed' } }
  );
  if (!upd.matchedCount) return sendError(res, { message: 'Demande introuvable ou déjà traitée.', statusCode: 409 });
  await logAudit(req, { userId: req.userId as any, action: 'APPLICATION_REJECTED', entityType: 'application', entityId: req.params.id, details: { note: note || null } });
  return sendSuccess(res, { data: { id: req.params.id, decision: 'rejected' } });
});

export default router;
