/**
 * Super-admin console for the guesthouse marketplace.
 *
 *   GET   /admin-bookings/kpis                                   platform KPIs + recent activity
 *   GET   /admin-bookings/properties                             every accommodation + booking switches
 *   GET   /admin-bookings/properties/:venueId/settings           full booking settings
 *   PATCH /admin-bookings/properties/:venueId/settings           edit (demo, booking, listing, owner, …)
 *   GET   /admin-bookings/summary                                booking counts / occupancy
 *   GET   /admin-bookings/properties/:venueId/calendar           management calendar
 *   POST  /admin-bookings/reservations/:id/transition            authorised state change
 *   GET   /admin-bookings/reservations/:id                       reservation detail + timeline + e-mails
 *   GET   /admin-bookings/owners                                 owners + their properties
 *   POST  /admin-bookings/owners                                 create / invite an owner (setup link)
 *   PATCH /admin-bookings/users/:id/status                       activate / suspend
 *   POST  /admin-bookings/users/:id/password-link                one-time password setup/reset link
 *   GET   /admin-bookings/email/status                           SMTP status (no secrets)
 *   POST  /admin-bookings/email/test                             real test e-mail through the outbox
 *   GET   /admin-bookings/email/outbox                           delivery history
 *   POST  /admin-bookings/email/outbox/:id/retry                 retry a failed e-mail
 *
 * Block / unblock / accept / reject / manual reservations reuse the owner-hotel endpoints, which accept
 * ADMIN for any property and record who did what.
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth';
import { Venue } from '../models/Venue';
import { Room } from '../models/Room';
import { User } from '../models/User';
import { Reservation } from '../models/Reservation';
import { AuditLog } from '../models/AuditLog';
import { EmailOutbox } from '../models/EmailOutbox';
import { RefreshToken } from '../models/RefreshToken';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { logAudit } from '../utils/audit.util';
import { logger } from '../config/logger';
import {
  DEFAULT_TZ,
  addDays,
  bookingSummary,
  buildManagementCalendar,
  canTransition,
  normalizeStatus,
  parseDay,
  pushStatus,
  todayInZone,
  toDay,
  venueBookability,
  type BookingState,
} from '../services/bookingEngine';
import { adminSettingsSchema, SETTINGS_FIELDS, toUpdate } from '../services/bookingSettings';
import { notifyBookingEvent, queueAccountEmail, renderLayout } from '../services/bookingEmails';
import { enqueueEmail, processOutbox, retryOutboxRow } from '../services/emailOutbox';
import { mailerStatus } from '../services/mailer';
import { issuePasswordLink } from '../services/accountTokens';
import { publishAvailabilityEvent } from '../services/availabilityEvents';

const router = Router();
router.use(authenticate, requireAdmin);

const ACCOMMODATION_TYPES = ['HOTEL', 'MAISON_DHOTE'];
const isId = (v: unknown): v is string => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v) && v.length === 24;

/* ── KPIs ─────────────────────────────────────────────────── */
router.get('/kpis', async (_req: AuthRequest, res) => {
  try {
    const base = { type: 'MAISON_DHOTE', archivedAt: null };
    const [total, published, pendingApproval, listed, owners, activeOwners, summary, recent, failedEmails] = await Promise.all([
      Venue.countDocuments(base),
      Venue.countDocuments({ ...base, isPublished: { $ne: false }, approvalStatus: 'approved' }),
      Venue.countDocuments({ ...base, approvalStatus: 'pending_review' }),
      Venue.countDocuments({ ...base, publicListed: true }),
      User.countDocuments({ role: 'ESTABLISHMENT_OWNER' }),
      User.countDocuments({ role: 'ESTABLISHMENT_OWNER', isActive: { $ne: false } }),
      bookingSummary(),
      AuditLog.find({}).sort({ timestamp: -1 }).limit(15).populate('userId', 'fullName email role').lean(),
      EmailOutbox.countDocuments({ status: 'failed' }),
    ]);
    return sendSuccess(res, {
      data: {
        properties: { total, published, pendingApproval, listed },
        owners: { total: owners, active: activeOwners },
        reservations: summary,
        failedEmails,
        recentActivity: (recent as any[]).map((a) => ({
          id: String(a._id),
          action: a.action,
          at: a.timestamp,
          actor: a.userId ? { name: a.userId.fullName ?? a.userId.email, role: a.userId.role } : null,
          entityType: a.entityType,
          entityId: a.entityId ? String(a.entityId) : null,
          details: a.details ?? null,
        })),
      },
    });
  } catch (err) {
    logger.error('admin-bookings/kpis failed', err);
    return sendError(res, { message: 'Échec du chargement des indicateurs.', statusCode: 500 });
  }
});

/* ── properties ───────────────────────────────────────────── */
router.get('/properties', async (_req: AuthRequest, res) => {
  try {
    const venues: any[] = await Venue.find({ type: { $in: ACCOMMODATION_TYPES }, archivedAt: null })
      .populate('ownerId', 'fullName email isActive')
      .select('name slug type city governorate isDemo isPublished publicListed approvalStatus bookingEnabled bookingMode rentalMode entirePricePerNight maxGuests ownerId timezone coordinates immersiveUrl hasVirtualTour coverImage')
      .sort({ name: 1 })
      .lean();
    const counts = await Room.aggregate([
      { $match: { venueId: { $in: venues.map((v) => v._id) }, isActive: true, isReservable: true } },
      { $group: { _id: '$venueId', n: { $sum: 1 }, priced: { $sum: { $cond: [{ $gt: ['$pricePerNight', 0] }, 1, 0] } } } },
    ]);
    const roomsBy = new Map<string, any>(counts.map((c: any) => [String(c._id), c]));
    return sendSuccess(res, {
      data: venues.map((v) => {
        const rc = roomsBy.get(String(v._id));
        const configured = v.rentalMode === 'entire' ? v.entirePricePerNight > 0 && v.maxGuests > 0 : (rc?.priced ?? 0) > 0;
        const b = venueBookability(v);
        return {
          id: String(v._id),
          name: v.name,
          slug: v.slug,
          type: v.type,
          city: v.city,
          governorate: v.governorate ?? null,
          coverImage: v.coverImage ?? null,
          isDemo: !!v.isDemo,
          isPublished: v.isPublished !== false,
          publicListed: !!v.publicListed,
          approvalStatus: v.approvalStatus ?? 'approved',
          bookingEnabled: v.bookingEnabled ?? null,
          bookingMode: v.bookingMode ?? 'request',
          rentalMode: v.rentalMode ?? 'rooms',
          hasCoordinates: v.coordinates?.lat != null,
          hasVirtualTour: !!(v.hasVirtualTour || v.immersiveUrl),
          timezone: v.timezone || DEFAULT_TZ,
          owner: v.ownerId ? { id: String(v.ownerId._id), fullName: v.ownerId.fullName, email: v.ownerId.email, isActive: v.ownerId.isActive !== false } : null,
          roomsCount: rc?.n ?? 0,
          inventoryConfigured: configured,
          bookable: b.bookable && configured,
          bookingState: !b.bookable ? b.code : b.demo ? 'DEMO_OPEN' : 'OPEN',
        };
      }),
    });
  } catch (err) {
    logger.error('admin-bookings/properties failed', err);
    return sendError(res, { message: 'Échec du chargement des hébergements.', statusCode: 500 });
  }
});

router.get('/properties/:venueId/settings', async (req: AuthRequest, res) => {
  if (!isId(req.params.venueId)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
  const venue = await Venue.findById(req.params.venueId).select(SETTINGS_FIELDS).populate('ownerId', 'fullName email').lean();
  if (!venue) return sendError(res, { message: 'Hébergement introuvable.', statusCode: 404 });
  const rooms = await Room.find({ venueId: venue._id }).select('name roomNumber roomType capacity pricePerNight isActive isReservable minimumNights').sort({ roomNumber: 1 }).lean();
  return sendSuccess(res, { data: { ...venue, rooms } });
});

router.patch('/properties/:venueId/settings', async (req: AuthRequest, res) => {
  try {
    if (!isId(req.params.venueId)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
    const parsed = adminSettingsSchema.safeParse(req.body ?? {});
    if (!parsed.success) return sendError(res, { message: `${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}`, statusCode: 422 });
    const before: any = await Venue.findById(req.params.venueId).select(SETTINGS_FIELDS).lean();
    if (!before) return sendError(res, { message: 'Hébergement introuvable.', statusCode: 404 });
    if (parsed.data.ownerId) {
      const owner = await User.findById(parsed.data.ownerId).select('role').lean();
      if (!owner || (owner as any).role !== 'ESTABLISHMENT_OWNER') return sendError(res, { message: "Ce compte n'est pas un propriétaire.", statusCode: 422 });
    }
    if (parsed.data.slug && parsed.data.slug !== before.slug && (await Venue.exists({ slug: parsed.data.slug, _id: { $ne: before._id } }))) {
      return sendError(res, { message: 'Cette adresse (slug) est déjà utilisée par une autre fiche.', statusCode: 409 });
    }
    // Publishing requires the essentials: never make an incomplete listing public by accident.
    const willPublish = (parsed.data.isPublished ?? before.isPublished) !== false && (parsed.data.approvalStatus ?? before.approvalStatus ?? 'approved') === 'approved';
    const wasPublic = before.isPublished !== false && (before.approvalStatus ?? 'approved') === 'approved';
    if (willPublish && !wasPublic && !before.isDemo) {
      const desc = parsed.data.description ?? before.description;
      const addr = parsed.data.address ?? before.address;
      const missing = [
        (!desc || desc === 'À compléter') && 'description',
        (!addr || addr === 'À compléter') && 'adresse',
        !(parsed.data.coverImage ?? before.coverImage) && 'photo de couverture',
        !(parsed.data.coordinates ?? before.coordinates?.lat != null) && 'localisation',
      ].filter(Boolean);
      if (missing.length) return sendError(res, { message: `Publication impossible — à compléter : ${missing.join(', ')}.`, statusCode: 422 });
    }
    const update = toUpdate(parsed.data);
    const updated = await Venue.findByIdAndUpdate(req.params.venueId, update, { new: true, runValidators: true }).select(SETTINGS_FIELDS).lean();
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of Object.keys(parsed.data)) changes[k] = { from: before[k] ?? null, to: (parsed.data as any)[k] };
    await logAudit(req, {
      userId: req.userId as any,
      action: 'ownerId' in parsed.data ? 'OWNER_ASSIGNED'
        : 'approvalStatus' in parsed.data || 'isPublished' in parsed.data
          ? (parsed.data.approvalStatus === 'suspended' ? 'VENUE_SUSPENDED' : parsed.data.isPublished === false ? 'VENUE_UPDATED' : 'VENUE_APPROVED')
          : 'BOOKING_SETTINGS_CHANGED',
      entityType: 'venue',
      entityId: req.params.venueId,
      details: { venue: before.name, changes },
    });
    publishAvailabilityEvent({ venueId: req.params.venueId, type: 'settings_changed', at: new Date().toISOString() });
    return sendSuccess(res, { data: updated });
  } catch (err) {
    logger.error('admin-bookings/settings failed', err);
    return sendError(res, { message: 'Échec de l’enregistrement.', statusCode: 500 });
  }
});

/* ── summary / calendar ───────────────────────────────────── */
router.get('/summary', async (req: AuthRequest, res) => {
  try {
    let venueIds: unknown[] | undefined;
    const venueId = typeof req.query.venueId === 'string' ? req.query.venueId : '';
    const ownerId = typeof req.query.ownerId === 'string' ? req.query.ownerId : '';
    if (isId(venueId)) venueIds = [new mongoose.Types.ObjectId(venueId)];
    else if (isId(ownerId)) venueIds = await Venue.find({ ownerId, type: { $in: ACCOMMODATION_TYPES } }).distinct('_id');
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

router.get('/properties/:venueId/calendar', async (req: AuthRequest, res) => {
  try {
    if (!isId(req.params.venueId)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
    const venue: any = await Venue.findById(req.params.venueId).lean();
    if (!venue) return sendError(res, { message: 'Hébergement introuvable.', statusCode: 404 });
    const tz = venue.timezone || DEFAULT_TZ;
    const today = todayInZone(tz);
    const from = typeof req.query.from === 'string' ? req.query.from : today.slice(0, 8) + '01';
    const start = parseDay(from);
    const to = typeof req.query.to === 'string' ? req.query.to : start ? toDay(addDays(start, 41)) : today;
    try {
      const data = await buildManagementCalendar(venue, from, to, tz);
      return sendSuccess(res, { data: { venue: { id: String(venue._id), name: venue.name, isDemo: !!venue.isDemo, rentalMode: venue.rentalMode ?? 'rooms' }, ...data } });
    } catch {
      return sendError(res, { message: 'Plage de dates invalide (190 jours maximum).', statusCode: 400 });
    }
  } catch (err) {
    logger.error('admin-bookings/calendar failed', err);
    return sendError(res, { message: 'Échec du chargement du calendrier.', statusCode: 500 });
  }
});

/* ── reservations ─────────────────────────────────────────── */
router.get('/reservations/:id', async (req: AuthRequest, res) => {
  if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
  const r: any = await Reservation.findById(req.params.id)
    .populate('venueId', 'name slug ownerId')
    .populate('statusHistory.byUserId', 'fullName email')
    .lean();
  if (!r) return sendError(res, { message: 'Réservation introuvable.', statusCode: 404 });
  const emails = await EmailOutbox.find({ reservationId: r._id }).select('event recipientRole status attempts lastError sentAt createdAt').sort({ createdAt: 1 }).lean();
  return sendSuccess(res, { data: { ...r, emails } });
});

const transitionSchema = z.object({
  to: z.enum(['confirmed', 'rejected', 'cancelled', 'completed', 'no_show']),
  reason: z.string().trim().max(500).optional(),
});

router.post('/reservations/:id/transition', async (req: AuthRequest, res) => {
  try {
    if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
    const parsed = transitionSchema.safeParse(req.body ?? {});
    if (!parsed.success) return sendError(res, { message: 'Transition invalide.', statusCode: 422 });
    const r: any = await Reservation.findById(req.params.id);
    if (!r) return sendError(res, { message: 'Réservation introuvable.', statusCode: 404 });
    const to = parsed.data.to as BookingState;
    if (!canTransition(r.status, to)) return sendError(res, { message: `Transition ${normalizeStatus(r.status)} → ${to} non autorisée.`, statusCode: 409 });
    const from = r.status;
    pushStatus(r, to, { userId: req.userId, role: 'ADMIN' }, parsed.data.reason || `Action administrateur (${to})`);
    const upd = await Reservation.updateOne(
      { _id: r._id, status: from },
      { $set: { status: to, statusHistory: r.statusHistory }, $unset: { expiresAt: 1 } }
    );
    if (!upd.modifiedCount) return sendError(res, { message: 'La réservation a changé entre-temps.', statusCode: 409 });
    publishAvailabilityEvent({ venueId: String(r.venueId), type: to === 'confirmed' ? 'reservation_created' : 'reservation_cancelled', at: new Date().toISOString(), reservationId: String(r._id) });
    const auditAction = { confirmed: 'RESERVATION_ACCEPTED', rejected: 'RESERVATION_REJECTED', cancelled: 'RESERVATION_CANCELLED', completed: 'RESERVATION_COMPLETED', no_show: 'RESERVATION_NO_SHOW' }[to as string] as any;
    await logAudit(req, { userId: req.userId as any, action: auditAction, entityType: 'reservation', entityId: r._id, details: { reference: r.reservationCode, from, to, reason: parsed.data.reason ?? null, by: 'ADMIN' } });
    const event = { confirmed: 'confirmed', rejected: 'rejected', cancelled: 'cancelled_by_host' }[to as string] as any;
    if (event) void notifyBookingEvent(r._id, event);
    return sendSuccess(res, { data: { id: String(r._id), status: to } });
  } catch (err) {
    logger.error('admin-bookings/transition failed', err);
    return sendError(res, { message: 'Échec de la transition.', statusCode: 500 });
  }
});

/* ── owners & accounts ────────────────────────────────────── */
router.get('/owners', async (_req: AuthRequest, res) => {
  const owners: any[] = await User.find({ role: 'ESTABLISHMENT_OWNER' }).select('fullName email phone isActive serviceDomains createdAt lastLoginAt').sort({ createdAt: -1 }).lean();
  const venues: any[] = await Venue.find({ ownerId: { $in: owners.map((o) => o._id) }, archivedAt: null }).select('name slug type ownerId').lean();
  return sendSuccess(res, {
    data: owners.map((o) => ({
      id: String(o._id),
      fullName: o.fullName,
      email: o.email,
      phone: o.phone ?? null,
      isActive: o.isActive !== false,
      serviceDomains: o.serviceDomains ?? [],
      createdAt: o.createdAt,
      lastLoginAt: o.lastLoginAt ?? null,
      properties: venues.filter((v) => String(v.ownerId) === String(o._id)).map((v) => ({ id: String(v._id), name: v.name, slug: v.slug, type: v.type })),
    })),
  });
});

const ownerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().max(30).optional(),
  venueIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(20).optional(),
  sendInvite: z.boolean().default(true),
});

router.post('/owners', async (req: AuthRequest, res) => {
  try {
    const parsed = ownerSchema.safeParse(req.body ?? {});
    if (!parsed.success) return sendError(res, { message: parsed.error.issues[0]?.message ?? 'Données invalides.', statusCode: 422 });
    const d = parsed.data;
    if (await User.exists({ email: d.email })) return sendError(res, { message: 'Un compte existe déjà avec cet e-mail.', statusCode: 409 });
    // Unusable random password: the owner chooses theirs through the one-time setup link.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const user = await User.create({ fullName: d.fullName, email: d.email, phone: d.phone, passwordHash, role: 'ESTABLISHMENT_OWNER', serviceDomains: ['HOTEL'], isActive: true });
    if (d.venueIds?.length) await Venue.updateMany({ _id: { $in: d.venueIds }, type: { $in: ACCOMMODATION_TYPES } }, { $set: { ownerId: user._id } });
    const link = await issuePasswordLink(user._id, 72);
    if (d.sendInvite) {
      await queueAccountEmail({
        key: `invite:${String(user._id)}:${link.expiresAt.getTime()}`,
        to: d.email,
        subject: 'Votre espace propriétaire Exploria360',
        heading: 'Bienvenue sur Exploria360',
        intro: `Bonjour ${d.fullName}, un espace propriétaire a été créé pour vous. Choisissez votre mot de passe pour gérer votre calendrier, vos réservations et votre fiche.`,
        ctaLabel: 'Créer mon mot de passe',
        ctaUrl: link.url,
        note: 'Ce lien est personnel, valable 72 heures et utilisable une seule fois.',
      });
    }
    await logAudit(req, { userId: req.userId as any, action: 'USER_CREATED', entityType: 'user', entityId: user._id, details: { role: 'ESTABLISHMENT_OWNER', email: d.email, venues: d.venueIds ?? [], invited: d.sendInvite } });
    // The link is returned to the admin once (to hand over securely if e-mail is not configured). It is never logged.
    return sendSuccess(res, { data: { id: String(user._id), email: user.email, setupLink: link.url, setupLinkExpiresAt: link.expiresAt }, statusCode: 201 });
  } catch (err) {
    logger.error('admin-bookings/owners create failed', err);
    return sendError(res, { message: 'Création impossible.', statusCode: 500 });
  }
});

router.patch('/users/:id/status', async (req: AuthRequest, res) => {
  if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
  if (String(req.params.id) === String(req.userId)) return sendError(res, { message: 'Vous ne pouvez pas suspendre votre propre compte.', statusCode: 409 });
  const isActive = req.body?.isActive === true;
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isActive } }, { new: true }).select('email role isActive').lean();
  if (!user) return sendError(res, { message: 'Compte introuvable.', statusCode: 404 });
  if (!isActive) await RefreshToken.deleteMany({ userId: req.params.id });
  await logAudit(req, { userId: req.userId as any, action: isActive ? 'USER_REACTIVATED' : 'USER_SUSPENDED', entityType: 'user', entityId: req.params.id, details: { email: (user as any).email } });
  return sendSuccess(res, { data: user });
});

router.post('/users/:id/password-link', async (req: AuthRequest, res) => {
  if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
  const user: any = await User.findById(req.params.id).select('email fullName isActive').lean();
  if (!user) return sendError(res, { message: 'Compte introuvable.', statusCode: 404 });
  const link = await issuePasswordLink(user._id, 24);
  if (req.body?.sendEmail !== false) {
    await queueAccountEmail({
      key: `adminreset:${String(user._id)}:${link.expiresAt.getTime()}`,
      to: user.email,
      subject: 'Définissez votre mot de passe Exploria360',
      heading: 'Définir votre mot de passe',
      intro: `Bonjour ${user.fullName ?? ''}, un administrateur Exploria360 vous a envoyé un lien pour (re)définir votre mot de passe.`,
      ctaLabel: 'Choisir mon mot de passe',
      ctaUrl: link.url,
      note: 'Lien valable 24 heures, utilisable une seule fois. Votre mot de passe actuel reste valide tant que ce lien n’est pas utilisé.',
    });
  }
  await logAudit(req, { userId: req.userId as any, action: 'PASSWORD_RESET_LINK_ISSUED', entityType: 'user', entityId: user._id, details: { email: user.email, emailed: req.body?.sendEmail !== false } });
  return sendSuccess(res, { data: { setupLink: link.url, expiresAt: link.expiresAt } });
});

/* ── e-mail ───────────────────────────────────────────────── */
router.get('/email/status', async (req: AuthRequest, res) => {
  const status = await mailerStatus(req.query.verify === '1');
  const [queued, failed, sent24h] = await Promise.all([
    EmailOutbox.countDocuments({ status: { $in: ['queued', 'sending'] } }),
    EmailOutbox.countDocuments({ status: 'failed' }),
    EmailOutbox.countDocuments({ status: 'sent', sentAt: { $gt: new Date(Date.now() - 86_400_000) } }),
  ]);
  return sendSuccess(res, { data: { ...status, outbox: { queued, failed, sent24h } } });
});

const testSchema = z.object({ to: z.string().trim().toLowerCase().email().max(160) });
router.post('/email/test', async (req: AuthRequest, res) => {
  const parsed = testSchema.safeParse(req.body ?? {});
  if (!parsed.success) return sendError(res, { message: 'Adresse e-mail invalide.', statusCode: 422 });
  const stamp = new Date();
  const { html, text } = renderLayout({
    heading: 'Test de livraison SMTP',
    intro: 'Cet e-mail confirme que la messagerie transactionnelle Exploria360 fonctionne de bout en bout.',
    rows: [
      ['Envoyé le', stamp.toISOString()],
      ['Destinataire', parsed.data.to],
    ],
  });
  const key = `test:${stamp.getTime()}:${crypto.randomBytes(4).toString('hex')}`;
  await enqueueEmail({ key, event: 'smtp_test', to: parsed.data.to, recipientRole: 'test', subject: `Exploria360 — test SMTP ${stamp.toISOString().slice(0, 16)}`, html, text });
  await processOutbox(5);
  const row: any = await EmailOutbox.findOne({ key }).select('status lastError messageId attempts sentAt').lean();
  await logAudit(req, { userId: req.userId as any, action: 'EMAIL_TEST_SENT', entityType: 'setting', details: { to: parsed.data.to, status: row?.status, error: row?.lastError ?? null } });
  return sendSuccess(res, { data: { status: row?.status, messageId: row?.messageId ?? null, error: row?.lastError ?? null, sentAt: row?.sentAt ?? null } });
});

router.get('/email/outbox', async (req: AuthRequest, res) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.status === 'string' && ['queued', 'sending', 'sent', 'failed'].includes(req.query.status)) filter.status = req.query.status;
  const rows = await EmailOutbox.find(filter)
    .select('event to recipientRole subject status attempts maxAttempts lastError sentAt createdAt nextAttemptAt isDemo reservationId')
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Number(req.query.limit) || 100))
    .lean();
  return sendSuccess(res, { data: rows });
});

router.post('/email/outbox/:id/retry', async (req: AuthRequest, res) => {
  if (!isId(req.params.id)) return sendError(res, { message: 'Identifiant invalide.', statusCode: 400 });
  const ok = await retryOutboxRow(req.params.id);
  if (!ok) return sendError(res, { message: 'E-mail introuvable ou déjà envoyé.', statusCode: 409 });
  await logAudit(req, { userId: req.userId as any, action: 'EMAIL_RETRY', entityType: 'setting', details: { outboxId: req.params.id } });
  return sendSuccess(res, { data: { requeued: true } });
});

export default router;
