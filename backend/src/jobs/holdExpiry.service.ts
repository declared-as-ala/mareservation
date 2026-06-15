import { ReservationHold } from '../models/ReservationHold';
import { Reservation } from '../models/Reservation';
import { publishAvailabilityEvent } from '../services/availabilityEvents';

let started = false;

export function startHoldExpiryLoop() {
  if (started) return;
  started = true;

  const tick = async () => {
    // 1) Expire stale holds.
    const expired = await ReservationHold.find({
      status: 'active',
      expiresAt: { $lt: new Date() },
    }).select('_id venueId');

    if (expired.length) {
      await ReservationHold.updateMany(
        { _id: { $in: expired.map((hold) => hold._id) } },
        { $set: { status: 'expired' } }
      );

      expired.forEach((hold) => {
        publishAvailabilityEvent({
          venueId: hold.venueId.toString(),
          type: 'hold_expired',
          at: new Date().toISOString(),
          holdId: hold._id.toString(),
        });
      });
    }

    // 2) Auto-free finished table reservations: a table booking whose window
    //    has ended is no longer occupying the table — mark it COMPLETED so it
    //    drops out of "active" lists and frees the slot.
    await Reservation.updateMany(
      {
        bookingType: 'TABLE',
        status: { $in: ['PENDING', 'CONFIRMED'] },
        endAt: { $lt: new Date() },
      },
      { $set: { status: 'COMPLETED' } }
    );
  };

  void tick();
  setInterval(() => {
    void tick();
  }, 30000);
}
