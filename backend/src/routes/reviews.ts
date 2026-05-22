import { Router } from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/Review';
import { Reservation } from '../models/Reservation';
import { Venue } from '../models/Venue';
import { authenticate, requireAdmin, requireEstablishmentOwner, AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { logAudit } from '../utils/audit.util';
import { logger } from '../config/logger';

const router = Router();

// GET /api/v1/reviews/venue/:venueId — public approved reviews + aggregate
router.get('/venue/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(venueId)) return sendError(res, { message: 'venueId invalide.', statusCode: 400 });

    const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '10')) || 10));
    const skip = (page - 1) * limit;
    const sortKey = String(req.query.sort ?? 'recent');
    const sort: Record<string, 1 | -1> =
      sortKey === 'helpful' ? { helpfulCount: -1, createdAt: -1 } :
      sortKey === 'rating_desc' ? { rating: -1, createdAt: -1 } :
      sortKey === 'rating_asc' ? { rating: 1, createdAt: -1 } :
      { createdAt: -1 };

    const filter = { venueId, moderationStatus: 'approved' as const };
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'fullName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    // Aggregate breakdown
    const aggregate = await Review.aggregate([
      { $match: { venueId: new mongoose.Types.ObjectId(venueId), moderationStatus: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
    let sumRating = 0;
    aggregate.forEach((r) => {
      breakdown[r._id as number] = r.count;
      sumRating += r._id * r.count;
    });
    const average = total > 0 ? Math.round((sumRating / total) * 10) / 10 : 0;

    return sendSuccess(res, { data: { reviews, total, page, breakdown, average } });
  } catch (err) {
    logger.error('reviews/list failed', err as any);
    return sendError(res, { message: 'Erreur de chargement.', statusCode: 500 });
  }
});

// POST /api/v1/reviews — customer creates review (must have completed reservation)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { venueId, reservationId, rating, ratingCleanliness, ratingService, ratingLocation, ratingValue, title, comment, photos } = req.body ?? {};
    if (!venueId || !rating || !comment) return sendError(res, { message: 'venueId, rating, comment requis.', statusCode: 400 });
    if (!mongoose.Types.ObjectId.isValid(venueId)) return sendError(res, { message: 'venueId invalide.', statusCode: 400 });
    if (rating < 1 || rating > 5) return sendError(res, { message: 'Note hors plage (1-5).', statusCode: 400 });
    if (String(comment).trim().length < 10) return sendError(res, { message: 'Commentaire trop court (≥10 caractères).', statusCode: 400 });

    let isVerified = false;
    let resvObjId: mongoose.Types.ObjectId | undefined;
    if (reservationId && mongoose.Types.ObjectId.isValid(reservationId)) {
      const resv = await Reservation.findOne({
        _id: reservationId,
        userId: req.userId,
        venueId,
        status: { $in: ['completed', 'COMPLETED', 'checked_out', 'CHECKED_OUT'] },
      }).lean();
      if (resv) {
        isVerified = true;
        resvObjId = new mongoose.Types.ObjectId(reservationId);
        const existing = await Review.findOne({ userId: req.userId, reservationId: resvObjId }).lean();
        if (existing) return sendError(res, { message: 'Avis déjà laissé pour cette réservation.', statusCode: 409 });
      }
    }

    const review = await Review.create({
      venueId,
      userId: req.userId,
      reservationId: resvObjId,
      rating,
      ratingCleanliness,
      ratingService,
      ratingLocation,
      ratingValue,
      title,
      comment,
      photos: Array.isArray(photos) ? photos.filter((u) => typeof u === 'string').slice(0, 10) : [],
      isVerified,
      moderationStatus: isVerified ? 'approved' : 'pending', // verified reviews auto-approve
    });

    return sendSuccess(res, { data: review, statusCode: 201 });
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, { message: 'Avis déjà laissé.', statusCode: 409 });
    logger.error('reviews/create failed', err);
    return sendError(res, { message: 'Erreur de création.', statusCode: 500 });
  }
});

// POST /api/v1/reviews/:id/helpful — mark helpful (idempotent — naive)
router.post('/:id/helpful', authenticate, async (req: AuthRequest, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { $inc: { helpfulCount: 1 } }, { new: true });
    if (!review) return sendError(res, { message: 'Avis introuvable.', statusCode: 404 });
    return sendSuccess(res, { data: { helpfulCount: review.helpfulCount } });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// POST /api/v1/reviews/:id/flag — anyone can flag (auth required)
router.post('/:id/flag', authenticate, async (req: AuthRequest, res) => {
  try {
    const reason = String(req.body?.reason ?? '').trim().slice(0, 200);
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { flagCount: 1 },
        $push: { flagReasons: reason },
        $set: { moderationStatus: 'flagged' },
      },
      { new: true },
    );
    if (!review) return sendError(res, { message: 'Avis introuvable.', statusCode: 404 });
    return sendSuccess(res, { data: { flagged: true } });
  } catch (err) {
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// POST /api/v1/reviews/:id/reply — owner replies (only owner of the venue)
router.post('/:id/reply', authenticate, requireEstablishmentOwner, async (req: AuthRequest, res) => {
  try {
    const text = String(req.body?.text ?? '').trim();
    if (text.length < 3) return sendError(res, { message: 'Réponse trop courte.', statusCode: 400 });
    if (text.length > 2000) return sendError(res, { message: 'Réponse trop longue (max 2000).', statusCode: 400 });

    const review = await Review.findById(req.params.id);
    if (!review) return sendError(res, { message: 'Avis introuvable.', statusCode: 404 });
    const venue = await Venue.findById(review.venueId).select('ownerId').lean();
    if (!venue) return sendError(res, { message: 'Hôtel introuvable.', statusCode: 404 });
    if (req.userRole !== 'ADMIN' && String((venue as any).ownerId) !== String(req.userId)) {
      return sendError(res, { message: 'Accès refusé.', statusCode: 403 });
    }
    review.ownerReply = { text, repliedAt: new Date(), repliedBy: req.userId as any };
    await review.save();
    return sendSuccess(res, { data: review });
  } catch (err) {
    logger.error('reviews/reply failed', err as any);
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

/* ─── ADMIN MODERATION ─────────────────────────────────────────────── */

// GET /api/v1/reviews/admin/queue?status=pending|flagged|rejected|approved&venueId=
router.get('/admin/queue', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const filter: Record<string, unknown> = {};
    const status = String(req.query.status ?? '');
    if (status && ['pending', 'flagged', 'rejected', 'approved'].includes(status)) filter.moderationStatus = status;
    if (req.query.venueId && mongoose.Types.ObjectId.isValid(String(req.query.venueId))) filter.venueId = req.query.venueId;
    const reviews = await Review.find(filter)
      .populate('userId', 'fullName email')
      .populate('venueId', 'name slug city')
      .sort({ flagCount: -1, createdAt: -1 })
      .limit(200)
      .lean();
    const counts = await Review.aggregate([
      { $group: { _id: '$moderationStatus', count: { $sum: 1 } } },
    ]);
    const countsMap = counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {} as Record<string, number>);
    return sendSuccess(res, { data: { reviews, counts: countsMap } });
  } catch (err) {
    logger.error('reviews/admin/queue failed', err as any);
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

// POST /api/v1/reviews/admin/:id/moderate  body: { action: 'approve'|'reject'|'reset', reason? }
router.post('/admin/:id/moderate', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const action = String(req.body?.action ?? '');
    if (!['approve', 'reject', 'reset'].includes(action)) return sendError(res, { message: 'Action invalide.', statusCode: 400 });
    const review = await Review.findById(req.params.id);
    if (!review) return sendError(res, { message: 'Avis introuvable.', statusCode: 404 });
    review.moderationStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending';
    review.moderatedAt = new Date();
    review.moderatedBy = req.userId as any;
    review.moderationReason = req.body?.reason ?? null;
    if (action === 'reset') review.flagCount = 0;
    await review.save();
    await logAudit(req, {
      userId: req.userId as any,
      action: action === 'approve' ? 'VENUE_FEATURED' : action === 'reject' ? 'VENUE_UNFEATURED' : 'ADMIN_SETTING_CHANGED',
      entityType: 'venue',
      entityId: review.venueId as any,
      details: { reviewId: String(review._id), action, reason: req.body?.reason ?? null },
    });
    return sendSuccess(res, { data: review });
  } catch (err) {
    logger.error('reviews/admin/moderate failed', err as any);
    return sendError(res, { message: 'Erreur.', statusCode: 500 });
  }
});

export default router;
