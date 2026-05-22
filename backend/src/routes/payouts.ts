import { Router } from 'express';
import mongoose from 'mongoose';
import { Payout } from '../models/Payout';
import { Venue } from '../models/Venue';
import { Reservation } from '../models/Reservation';
import { authenticate, requireAdmin, requireEstablishmentOwner, AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { logger } from '../config/logger';
import { logAudit } from '../utils/audit.util';
import { User } from '../models/User';
import { sendEmail } from '../services/email.service';

const router = Router();

async function notifyOwnerPayout(ownerId: string, subject: string, message: string) {
  try {
    const owner = await User.findById(ownerId).select('email fullName').lean();
    if (!owner?.email) return;
    const ownerName = owner.fullName || 'Partenaire';
    const html = `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0a0a0a;padding:20px;">
      <div style="max-width:600px;margin:auto;background:#171717;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;">
        <h2 style="color:#fbbf24;margin:0 0 12px 0;">Ma Reservation</h2>
        <p style="color:#fff;margin:0 0 10px 0;">Bonjour ${ownerName},</p>
        <p style="color:#a3a3a3;margin:0;line-height:1.6;">${message}</p>
      </div></body></html>`;
    await sendEmail({ to: owner.email, subject, html, text: `${ownerName}, ${message}` });
  } catch (err) {
    logger.warn('notifyOwnerPayout failed', err as any);
  }
}

/* ─── Owner routes ─────────────────────────────────────────────────── */

// GET /payouts/owner/balance — unpaid earnings summary for the authenticated owner
router.get('/owner/balance', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const ownedVenueIds = await Venue.find({ ownerId: req.userId, archivedAt: null }).distinct('_id');
    if (!ownedVenueIds.length) return sendSuccess(res, { data: { venues: [], totalUnpaid: 0, currency: 'TND' } });

    // Aggregate completed, unpaid reservations not yet included in a payout
    const existingPayoutReservationIds = await Payout.distinct('items.reservationId', {
      venueId: { $in: ownedVenueIds },
    });

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          venueId: { $in: ownedVenueIds },
          status: { $in: ['completed', 'COMPLETED'] },
          paymentStatus: 'paid',
          _id: { $nin: existingPayoutReservationIds },
        },
      },
      {
        $lookup: {
          from: 'venues',
          localField: 'venueId',
          foreignField: '_id',
          as: 'venue',
          pipeline: [{ $project: { name: 1, commissionRate: 1 } }],
        },
      },
      { $unwind: '$venue' },
      {
        $group: {
          _id: '$venueId',
          venueName: { $first: '$venue.name' },
          commissionRate: { $first: '$venue.commissionRate' },
          gross: { $sum: '$totalPrice' },
          reservationCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          commission: { $multiply: ['$gross', '$commissionRate'] },
          net: { $multiply: ['$gross', { $subtract: [1, '$commissionRate'] }] },
        },
      },
    ];

    const venues = await Reservation.aggregate(pipeline);
    const totalUnpaid = venues.reduce((s: number, v: any) => s + (v.net ?? 0), 0);

    return sendSuccess(res, { data: { venues, totalUnpaid: Math.round(totalUnpaid), currency: 'TND' } });
  } catch (err) {
    logger.error('payouts/owner/balance', err as any);
    return sendError(res, { message: 'Erreur calcul solde.', statusCode: 500 });
  }
});

// GET /payouts/owner — list payouts for authenticated owner
router.get('/owner', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? 1)));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? 20))));
    const statusFilter = req.query.status ? String(req.query.status) : null;

    const filter: Record<string, unknown> = { ownerId: req.userId };
    if (statusFilter) filter.status = statusFilter;

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('venueId', 'name type')
        .lean(),
      Payout.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      data: payouts,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('payouts/owner list', err as any);
    return sendError(res, { message: 'Erreur liste virements.', statusCode: 500 });
  }
});

// GET /payouts/owner/:id — single payout detail
router.get('/owner/:id', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return sendError(res, { message: 'ID invalide.', statusCode: 400 });

    const payout = await Payout.findOne({ _id: req.params.id, ownerId: req.userId })
      .populate('venueId', 'name type coverImage')
      .lean();

    if (!payout) return sendError(res, { message: 'Virement introuvable.', statusCode: 404 });
    return sendSuccess(res, { data: payout });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

/* ─── Admin routes ──────────────────────────────────────────────────── */

// GET /payouts/admin — list all payouts with filters
router.get('/admin', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 30))));
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.venueId && mongoose.Types.ObjectId.isValid(String(req.query.venueId)))
      filter.venueId = req.query.venueId;
    if (req.query.ownerId && mongoose.Types.ObjectId.isValid(String(req.query.ownerId)))
      filter.ownerId = req.query.ownerId;

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('venueId', 'name type')
        .populate('ownerId', 'name email')
        .lean(),
      Payout.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      data: payouts,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('payouts/admin list', err as any);
    return sendError(res, { message: 'Erreur liste.', statusCode: 500 });
  }
});

// POST /payouts/admin/generate — generate a payout for a venue/period
router.post('/admin/generate', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { venueId, periodStart, periodEnd } = req.body ?? {};
    if (!venueId || !periodStart || !periodEnd)
      return sendError(res, { message: 'venueId, periodStart, periodEnd requis.', statusCode: 400 });
    if (!mongoose.Types.ObjectId.isValid(venueId))
      return sendError(res, { message: 'venueId invalide.', statusCode: 400 });

    const venue = await Venue.findById(venueId).select('ownerId commissionRate name').lean();
    if (!venue) return sendError(res, { message: 'Établissement introuvable.', statusCode: 404 });
    if (!(venue as any).ownerId) return sendError(res, { message: 'Établissement sans propriétaire.', statusCode: 422 });

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end)
      return sendError(res, { message: 'Période invalide.', statusCode: 400 });

    // Check duplicate
    const existing = await Payout.findOne({ venueId, periodStart: start, periodEnd: end });
    if (existing) return sendError(res, { message: 'Virement déjà généré pour cette période.', statusCode: 409 });

    // Collect paid+completed reservations in window not yet in a payout
    const alreadyInPayout = await Payout.distinct('items.reservationId', { venueId });
    const reservations = await Reservation.find({
      venueId,
      status: { $in: ['completed', 'COMPLETED'] },
      paymentStatus: 'paid',
      startAt: { $gte: start },
      endAt: { $lte: end },
      _id: { $nin: alreadyInPayout },
    })
      .select('_id reservationCode totalPrice startAt endAt')
      .lean();

    if (!reservations.length)
      return sendError(res, { message: 'Aucune réservation éligible pour cette période.', statusCode: 422 });

    const commissionRate: number = (venue as any).commissionRate ?? 0.1;
    let gross = 0;
    const items = reservations.map((r: any) => {
      const g = r.totalPrice ?? 0;
      const c = Math.round(g * commissionRate);
      gross += g;
      return {
        reservationId: r._id,
        reservationCode: r.reservationCode,
        gross: g,
        commission: c,
        net: g - c,
        startAt: r.startAt,
        endAt: r.endAt,
      };
    });
    const commission = Math.round(gross * commissionRate);
    const net = gross - commission;

    const payout = await Payout.create({
      venueId,
      ownerId: (venue as any).ownerId,
      periodStart: start,
      periodEnd: end,
      items,
      gross,
      commission,
      commissionRate,
      net,
      currency: 'TND',
      status: 'pending',
    });
    await logAudit(req as any, {
      action: 'PAYOUT_GENERATED',
      userId: req.userId as any,
      entityType: 'payout',
      entityId: payout._id as any,
      details: { venueId, periodStart: start, periodEnd: end, gross, net, commission, commissionRate },
    });
    void notifyOwnerPayout(
      String((venue as any).ownerId),
      `Nouveau virement généré — ${(venue as any).name}`,
      `Un nouveau virement a été généré pour la période ${start.toLocaleDateString('fr-FR')} → ${end.toLocaleDateString('fr-FR')}. Montant net: ${Math.round(net)} TND.`
    );

    return sendSuccess(res, { data: payout, statusCode: 201 });
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, { message: 'Virement déjà généré pour cette période.', statusCode: 409 });
    logger.error('payouts/admin/generate', err);
    return sendError(res, { message: 'Erreur génération.', statusCode: 500 });
  }
});

// PATCH /payouts/admin/:id/approve
router.patch('/admin/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) return sendError(res, { message: 'Virement introuvable.', statusCode: 404 });
    if (payout.status !== 'pending')
      return sendError(res, { message: `Statut actuel: ${payout.status}. Seuls les virements "pending" peuvent être approuvés.`, statusCode: 422 });
    payout.status = 'approved';
    if (req.body?.notes) payout.notes = req.body.notes;
    await payout.save();
    await logAudit(req as any, {
      action: 'PAYOUT_APPROVED',
      userId: req.userId as any,
      entityType: 'payout',
      entityId: payout._id as any,
      details: { notes: req.body?.notes || '' },
    });
    void notifyOwnerPayout(
      String(payout.ownerId),
      'Virement approuvé',
      `Votre virement de ${Math.round(payout.net)} ${payout.currency} a été approuvé et sera traité prochainement.`
    );
    return sendSuccess(res, { data: payout });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// PATCH /payouts/admin/:id/mark-paid
router.patch('/admin/:id/mark-paid', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) return sendError(res, { message: 'Virement introuvable.', statusCode: 404 });
    if (!['approved', 'pending'].includes(payout.status))
      return sendError(res, { message: 'Statut incompatible pour marquer comme payé.', statusCode: 422 });
    payout.status = 'paid';
    payout.paidAt = new Date();
    payout.paidBy = new mongoose.Types.ObjectId(req.userId);
    if (req.body?.paymentReference) payout.paymentReference = req.body.paymentReference;
    if (req.body?.notes) payout.notes = req.body.notes;
    await payout.save();
    await logAudit(req as any, {
      action: 'PAYOUT_MARKED_PAID',
      userId: req.userId as any,
      entityType: 'payout',
      entityId: payout._id as any,
      details: { paymentReference: req.body?.paymentReference || '', notes: req.body?.notes || '' },
    });
    void notifyOwnerPayout(
      String(payout.ownerId),
      'Virement payé',
      `Votre virement de ${Math.round(payout.net)} ${payout.currency} a été marqué comme payé.`
    );
    return sendSuccess(res, { data: payout });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// PATCH /payouts/admin/:id/hold
router.patch('/admin/:id/hold', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) return sendError(res, { message: 'Virement introuvable.', statusCode: 404 });
    payout.status = 'on_hold';
    payout.statusReason = req.body?.reason ?? '';
    await payout.save();
    await logAudit(req as any, {
      action: 'PAYOUT_HELD',
      userId: req.userId as any,
      entityType: 'payout',
      entityId: payout._id as any,
      details: { reason: payout.statusReason || '' },
    });
    void notifyOwnerPayout(
      String(payout.ownerId),
      'Virement en attente',
      `Votre virement est temporairement en attente. Raison: ${payout.statusReason || 'vérification interne'}.`
    );
    return sendSuccess(res, { data: payout });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// PATCH /payouts/admin/:id/reject
router.patch('/admin/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) return sendError(res, { message: 'Virement introuvable.', statusCode: 404 });
    payout.status = 'rejected';
    payout.statusReason = req.body?.reason ?? '';
    await payout.save();
    await logAudit(req as any, {
      action: 'PAYOUT_REJECTED',
      userId: req.userId as any,
      entityType: 'payout',
      entityId: payout._id as any,
      details: { reason: payout.statusReason || '' },
    });
    void notifyOwnerPayout(
      String(payout.ownerId),
      'Virement rejeté',
      `Votre virement a été rejeté. Raison: ${payout.statusReason || 'non précisée'}.`
    );
    return sendSuccess(res, { data: payout });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// GET /payouts/admin/:id — single payout detail for admin
router.get('/admin/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return sendError(res, { message: 'ID invalide.', statusCode: 400 });
    const payout = await Payout.findById(req.params.id)
      .populate('venueId', 'name type coverImage')
      .populate('ownerId', 'name email phone')
      .lean();
    if (!payout) return sendError(res, { message: 'Virement introuvable.', statusCode: 404 });
    return sendSuccess(res, { data: payout });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

export default router;
