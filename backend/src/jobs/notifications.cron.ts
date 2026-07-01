import cron from 'node-cron';
import { Reservation } from '../models/Reservation.js';
import { Venue } from '../models/Venue.js';
import {
  sendEmail,
  createCheckinReminderTemplate,
  createReviewRequestTemplate,
  createDepositReminderTemplate,
} from '../services/email.service.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';
import { logger } from '../config/logger.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/* ── helpers ──────────────────────────────────────────────────────────── */

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Check-in reminder — daily at 10:00 ──────────────────────────────── */

async function runCheckinReminders(): Promise<void> {
  logger.info('[cron] runCheckinReminders — start');
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    const reservations = await Reservation.find({
      startAt: { $gte: tomorrowStart, $lte: tomorrowEnd },
      status: { $in: ['confirmed', 'CONFIRMED'] },
      reminderEmailSentAt: null,
    }).lean();

    if (!reservations.length) {
      logger.info('[cron] runCheckinReminders — no reservations to remind');
      return;
    }

    let sent = 0;
    for (const r of reservations) {
      try {
        const guestName = [r.guestFirstName ?? r.customerFirstName, r.guestLastName ?? r.customerLastName]
          .filter(Boolean)
          .join(' ') || 'Cher client';
        const checkIn = fmtDate(new Date(r.startAt));
        const checkOut = fmtDate(new Date(r.endAt));
        const checkInShort = fmtShort(new Date(r.startAt));
        const checkOutShort = fmtShort(new Date(r.endAt));
        const reservationCode = r.reservationCode ?? r.confirmationCode ?? String(r._id);
        const ticketUrl = `${FRONTEND_URL}/reservation/${r._id}/confirmation`;

        // Email
        const email = r.customerEmail;
        if (email) {
          const tpl = createCheckinReminderTemplate({
            guestName,
            hotelName: String(r.venueId ?? 'Hôtel'),
            checkIn,
            checkOut,
            reservationCode,
            ticketUrl,
          });
          await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        }

        // WhatsApp
        const phone = r.customerPhone ?? r.guestPhone;
        if (phone) {
          await sendWhatsApp({
            to: phone,
            body: `🏨 Exploria360 — Rappel : votre arrivée à l'hôtel est demain !\n📅 ${checkInShort} → ${checkOutShort}\n🔑 Réf : *${reservationCode}*\nTicket : ${ticketUrl}`,
          });
        }

        // Mark as sent
        await Reservation.updateOne({ _id: r._id }, { $set: { reminderEmailSentAt: new Date() } });
        sent++;
      } catch (err) {
        logger.error('[cron] runCheckinReminders — failed for reservation', err, { reservationId: String(r._id) });
      }
    }
    logger.info(`[cron] runCheckinReminders — sent ${sent}/${reservations.length}`);
  } catch (err) {
    logger.error('[cron] runCheckinReminders — fatal error', err);
  }
}

/* ── Review request — daily at 11:00 ─────────────────────────────────── */

async function runReviewRequests(): Promise<void> {
  logger.info('[cron] runReviewRequests — start');
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const reservations = await Reservation.find({
      endAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
      status: { $in: ['completed', 'COMPLETED'] },
      reviewRequestSentAt: null,
    }).lean();

    if (!reservations.length) {
      logger.info('[cron] runReviewRequests — no reservations to review');
      return;
    }

    let sent = 0;
    for (const r of reservations) {
      try {
        const guestName = [r.guestFirstName ?? r.customerFirstName, r.guestLastName ?? r.customerLastName]
          .filter(Boolean)
          .join(' ') || 'Cher client';
        const reservationCode = r.reservationCode ?? r.confirmationCode ?? String(r._id);
        const reviewUrl = `${FRONTEND_URL}/reservation/${r._id}/review`;

        // Email
        const email = r.customerEmail;
        if (email) {
          const tpl = createReviewRequestTemplate({
            guestName,
            hotelName: String(r.venueId ?? 'Hôtel'),
            reservationCode,
            reviewUrl,
          });
          await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        }

        // WhatsApp
        const phone = r.customerPhone ?? r.guestPhone;
        if (phone) {
          await sendWhatsApp({
            to: phone,
            body: `⭐ Exploria360 — Comment s'est passé votre séjour ?\nVotre avis sur *${reservationCode}* aide d'autres voyageurs.\nLaissez-le ici : ${reviewUrl}`,
          });
        }

        // Mark as sent
        await Reservation.updateOne({ _id: r._id }, { $set: { reviewRequestSentAt: new Date() } });
        sent++;
      } catch (err) {
        logger.error('[cron] runReviewRequests — failed for reservation', err, { reservationId: String(r._id) });
      }
    }
    logger.info(`[cron] runReviewRequests — sent ${sent}/${reservations.length}`);
  } catch (err) {
    logger.error('[cron] runReviewRequests — fatal error', err);
  }
}

/* ── Deposit / payment reminder — daily at 09:00 ─────────────────────── */

async function runDepositReminders(): Promise<void> {
  logger.info('[cron] runDepositReminders — start');
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const reservations = await Reservation.find({
      startAt: { $gte: startOfDay(tomorrow), $lte: endOfDay(tomorrow) },
      paymentStatus: { $in: ['unpaid', 'pending'] },
      status: { $nin: ['CANCELLED', 'cancelled'] },
    })
      .populate('venueId', 'name')
      .lean();

    if (!reservations.length) {
      logger.info('[cron] runDepositReminders — nothing to remind');
      return;
    }

    let sent = 0;
    for (const r of reservations) {
      try {
        const email = r.customerEmail;
        if (!email) continue;
        const tpl = createDepositReminderTemplate({
          guestName: [r.guestFirstName, r.guestLastName].filter(Boolean).join(' ') || 'Cher client',
          venueName: String((r.venueId as any)?.name ?? 'Votre lieu'),
          reservationCode: r.reservationCode ?? r.confirmationCode ?? String(r._id),
          deadline: fmtDate(new Date(r.startAt)),
          amount: `${Number(r.totalPrice ?? 0).toLocaleString('fr-TN')} TND`,
        });
        await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        sent++;
      } catch (err) {
        logger.error('[cron] runDepositReminders — failed for reservation', err, { reservationId: String(r._id) });
      }
    }
    logger.info(`[cron] runDepositReminders — sent ${sent}/${reservations.length}`);
  } catch (err) {
    logger.error('[cron] runDepositReminders — fatal error', err);
  }
}

/* ── Public API ───────────────────────────────────────────────────────── */

export function startNotificationCrons(): void {
  // Deposit / payment reminder: daily at 09:00
  cron.schedule('0 9 * * *', () => {
    void runDepositReminders();
  });

  // Check-in reminder: daily at 10:00
  cron.schedule('0 10 * * *', () => {
    void runCheckinReminders();
  });

  // Review request: daily at 11:00
  cron.schedule('0 11 * * *', () => {
    void runReviewRequests();
  });

  logger.info('[cron] Notification crons scheduled (deposit reminder 09:00, check-in reminder 10:00, review request 11:00)');
}
