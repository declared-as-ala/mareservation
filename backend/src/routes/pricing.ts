import { Router } from 'express';
import mongoose from 'mongoose';
import { PricingRule } from '../models/PricingRule';
import { PromoCode } from '../models/PromoCode';
import { Room } from '../models/Room';
import { Venue } from '../models/Venue';
import { authenticate, requireAdmin, requireAnyServiceDomains, requireEstablishmentOwner, AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { quoteRoomPrice } from '../utils/pricing.util';
import { logger } from '../config/logger';

const router = Router();

async function assertVenueOwnedBy(venueId: string, req: AuthRequest) {
  if (!mongoose.Types.ObjectId.isValid(venueId)) return null;
  const venue = await Venue.findById(venueId).select('_id ownerId').lean();
  if (!venue) return null;
  if (req.userRole === 'ADMIN') return venue;
  if (String((venue as any).ownerId) !== String(req.userId)) return null;
  return venue;
}

/* ─── Public quote (used by checkout) ──────────────────────────────── */

// POST /api/v1/pricing/quote — body { venueId, roomId, startAt, endAt, promoCode? }
router.post('/quote', async (req, res) => {
  try {
    const { venueId, roomId, startAt, endAt, promoCode } = req.body ?? {};
    if (!venueId || !roomId || !startAt || !endAt) {
      return sendError(res, { message: 'venueId, roomId, startAt, endAt requis.', statusCode: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(venueId) || !mongoose.Types.ObjectId.isValid(roomId)) {
      return sendError(res, { message: 'ID invalide.', statusCode: 400 });
    }
    const room = await Room.findOne({ _id: roomId, venueId }).select('pricePerNight').lean();
    if (!room) return sendError(res, { message: 'Chambre introuvable.', statusCode: 404 });
    const quote = await quoteRoomPrice({
      venueId,
      roomId,
      basePricePerNight: (room as any).pricePerNight,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      promoCode,
    });
    return sendSuccess(res, { data: quote });
  } catch (err) {
    logger.error('pricing/quote failed', err as any);
    return sendError(res, { message: 'Erreur de calcul.', statusCode: 500 });
  }
});

/* ─── Owner rules CRUD ──────────────────────────────────────────────── */

router.get('/owner/venues/:venueId/rules', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  const venue = await assertVenueOwnedBy(req.params.venueId, req);
  if (!venue) return sendError(res, { message: 'Hôtel introuvable.', statusCode: 404 });
  const rules = await PricingRule.find({ venueId: venue._id }).sort({ priority: 1, createdAt: -1 }).lean();
  return sendSuccess(res, { data: rules });
});

router.post('/owner/venues/:venueId/rules', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  const venue = await assertVenueOwnedBy(req.params.venueId, req);
  if (!venue) return sendError(res, { message: 'Hôtel introuvable.', statusCode: 404 });
  try {
    const rule = await PricingRule.create({ ...req.body, venueId: venue._id, createdBy: req.userId });
    return sendSuccess(res, { data: rule, statusCode: 201 });
  } catch (err) {
    return sendError(res, { message: 'Erreur de création.', statusCode: 500 });
  }
});

router.patch('/owner/rules/:id', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  const rule = await PricingRule.findById(req.params.id);
  if (!rule) return sendError(res, { message: 'Règle introuvable.', statusCode: 404 });
  const venue = await assertVenueOwnedBy(String(rule.venueId), req);
  if (!venue) return sendError(res, { message: 'Accès refusé.', statusCode: 403 });
  Object.assign(rule, req.body);
  await rule.save();
  return sendSuccess(res, { data: rule });
});

router.delete('/owner/rules/:id', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  const rule = await PricingRule.findById(req.params.id);
  if (!rule) return sendError(res, { message: 'Règle introuvable.', statusCode: 404 });
  const venue = await assertVenueOwnedBy(String(rule.venueId), req);
  if (!venue) return sendError(res, { message: 'Accès refusé.', statusCode: 403 });
  await rule.deleteOne();
  return sendSuccess(res, { data: { deleted: true } });
});

/* ─── Promo codes (admin manages global, owners manage venue-scoped) ─ */

router.get('/promo-codes', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  const filter: Record<string, unknown> = {};
  if (req.userRole === 'ADMIN') {
    if (req.query.venueId) filter.venueId = req.query.venueId;
  } else {
    // Owner sees only their venue codes
    const ownedVenueIds = await Venue.find({ ownerId: req.userId }).distinct('_id');
    filter.$or = [{ scope: 'global' }, { venueId: { $in: ownedVenueIds } }];
  }
  const codes = await PromoCode.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return sendSuccess(res, { data: codes });
});

router.post('/promo-codes', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    if (body.scope === 'venue') {
      if (!body.venueId) return sendError(res, { message: 'venueId requis pour un code par-hôtel.', statusCode: 400 });
      const venue = await assertVenueOwnedBy(String(body.venueId), req);
      if (!venue) return sendError(res, { message: 'Accès refusé.', statusCode: 403 });
    } else if (req.userRole !== 'ADMIN') {
      return sendError(res, { message: 'Seul un admin peut créer un code global.', statusCode: 403 });
    }
    const code = await PromoCode.create({ ...body, createdBy: req.userId });
    return sendSuccess(res, { data: code, statusCode: 201 });
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, { message: 'Code déjà utilisé.', statusCode: 409 });
    return sendError(res, { message: 'Erreur de création.', statusCode: 500 });
  }
});

router.patch('/promo-codes/:id', authenticate, requireEstablishmentOwner, requireAnyServiceDomains('HOTEL'), async (req: AuthRequest, res) => {
  const pc = await PromoCode.findById(req.params.id);
  if (!pc) return sendError(res, { message: 'Code introuvable.', statusCode: 404 });
  if (pc.scope === 'venue' && pc.venueId) {
    const venue = await assertVenueOwnedBy(String(pc.venueId), req);
    if (!venue) return sendError(res, { message: 'Accès refusé.', statusCode: 403 });
  } else if (req.userRole !== 'ADMIN') {
    return sendError(res, { message: 'Réservé admin.', statusCode: 403 });
  }
  Object.assign(pc, req.body);
  await pc.save();
  return sendSuccess(res, { data: pc });
});

router.delete('/promo-codes/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  await PromoCode.findByIdAndDelete(req.params.id);
  return sendSuccess(res, { data: { deleted: true } });
});

export default router;
