import cron from 'node-cron';
import { Venue } from '../models/Venue.js';
import { Reservation } from '../models/Reservation.js';
import { Payout } from '../models/Payout.js';
import { logger } from '../config/logger.js';

/* ── Auto-payout logic ────────────────────────────────────────────────── */

async function runAutoPayouts(): Promise<void> {
  logger.info('[cron] runAutoPayouts — start');
  try {
    const now = new Date();

    // Previous calendar month
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // start of current month = end of prev
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0); // start of previous month

    // All active venues with an owner
    const venues = await Venue.find({
      archivedAt: null,
      ownerId: { $exists: true, $ne: null },
    })
      .select('_id ownerId commissionRate name')
      .lean();

    if (!venues.length) {
      logger.info('[cron] runAutoPayouts — no eligible venues');
      return;
    }

    let generated = 0;
    let skipped = 0;

    for (const venue of venues) {
      try {
        const venueId = venue._id;

        // Skip if payout already exists for this venue+period
        const existing = await Payout.findOne({ venueId, periodStart, periodEnd }).lean();
        if (existing) {
          skipped++;
          continue;
        }

        // Collect paid+completed reservations in previous month not yet in a payout
        const alreadyInPayout = await Payout.distinct('items.reservationId', { venueId });
        const reservations = await Reservation.find({
          venueId,
          status: { $in: ['completed', 'COMPLETED'] },
          paymentStatus: 'paid',
          startAt: { $gte: periodStart },
          endAt: { $lte: periodEnd },
          _id: { $nin: alreadyInPayout },
        })
          .select('_id reservationCode totalPrice startAt endAt')
          .lean();

        if (!reservations.length) {
          skipped++;
          continue;
        }

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

        await Payout.create({
          venueId,
          ownerId: (venue as any).ownerId,
          periodStart,
          periodEnd,
          items,
          gross,
          commission,
          commissionRate,
          net,
          currency: 'TND',
          status: 'pending',
        });

        generated++;
        logger.info('[cron] runAutoPayouts — generated payout', {
          venueId: String(venueId),
          venueName: (venue as any).name,
          reservations: reservations.length,
          gross,
          net,
        });
      } catch (err: any) {
        // Duplicate key = already generated concurrently, ignore
        if (err?.code === 11000) {
          skipped++;
          continue;
        }
        logger.error('[cron] runAutoPayouts — failed for venue', err, { venueId: String(venue._id) });
      }
    }

    logger.info(`[cron] runAutoPayouts — done. generated=${generated} skipped=${skipped}`);
  } catch (err) {
    logger.error('[cron] runAutoPayouts — fatal error', err);
  }
}

/* ── Public API ───────────────────────────────────────────────────────── */

export function startPayoutCron(): void {
  // Monthly on the 1st at 02:00
  cron.schedule('0 2 1 * *', () => {
    void runAutoPayouts();
  });

  logger.info('[cron] Payout cron scheduled (monthly 1st at 02:00)');
}
