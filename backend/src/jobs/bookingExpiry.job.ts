import { expirePendingRequests } from '../services/bookingEngine';
import { notifyBookingEvent } from '../services/bookingEmails';
import { startEmailOutboxLoop } from '../services/emailOutbox';
import { logger } from '../config/logger';

let started = false;

/** Every minute: expire pending booking requests whose response window has passed (and notify). Also runs the e-mail outbox. */
export function startBookingExpiryLoop(intervalMs = 60_000) {
  if (started) return;
  started = true;
  const tick = async () => {
    try {
      const expired = await expirePendingRequests();
      if (expired.length > 0) logger.info(`bookingExpiry: expired ${expired.length} pending request(s)`);
      for (const r of expired) await notifyBookingEvent(r._id, 'expired');
    } catch (err) {
      logger.error('bookingExpiry tick failed', { error: String(err) });
    }
  };
  void tick();
  setInterval(() => void tick(), intervalMs).unref();
  startEmailOutboxLoop();
}
