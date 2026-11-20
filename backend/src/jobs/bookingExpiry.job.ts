import { expirePendingRequests } from '../services/bookingEngine';
import { logger } from '../config/logger';

let started = false;

/** Every minute: expire pending booking requests whose response window has passed. */
export function startBookingExpiryLoop(intervalMs = 60_000) {
  if (started) return;
  started = true;
  const tick = async () => {
    try {
      const n = await expirePendingRequests();
      if (n > 0) logger.info(`bookingExpiry: expired ${n} pending request(s)`);
    } catch (err) {
      logger.error('bookingExpiry tick failed', { error: String(err) });
    }
  };
  void tick();
  setInterval(() => void tick(), intervalMs).unref();
}
