/**
 * Real availability search for stays (maisons d'hôtes / hotels).
 *
 * A venue is available for [checkIn, checkOut) when it has at least one active,
 * reservable room that fits the party AND has no overlapping reservation,
 * active (non-expired) hold, or block. Nothing here is estimated or faked.
 * Check-out day is free (half-open interval), matching hotel-checkout.
 */
import mongoose from 'mongoose';
import { Room } from '../models/Room';
import { Reservation } from '../models/Reservation';
import { ReservationHold } from '../models/ReservationHold';
import { RoomBlock } from '../models/RoomBlock';

export interface StayQuery {
  checkIn: Date;
  checkOut: Date;
  guests: number;
}

export type StayParseResult = { ok: true; value: StayQuery | null } | { ok: false; error: string };

export const MAX_STAY_NIGHTS = 30;
export const MAX_GUESTS = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Reject overflow such as 2026-02-31 (JS would roll it into March).
  return d.toISOString().slice(0, 10) === value ? d : null;
}

/** Validates ?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=N. No dates → no stay filter. */
export function parseStayQuery(
  q: { checkIn?: unknown; checkOut?: unknown; guests?: unknown },
  now: Date = new Date()
): StayParseResult {
  const hasIn = q.checkIn != null && q.checkIn !== '';
  const hasOut = q.checkOut != null && q.checkOut !== '';
  if (!hasIn && !hasOut) {
    if (q.guests != null && q.guests !== '') return { ok: true, value: null };
    return { ok: true, value: null };
  }
  if (!hasIn || !hasOut) return { ok: false, error: "Renseignez la date d'arrivée et la date de départ." };

  const checkIn = parseDay(q.checkIn);
  const checkOut = parseDay(q.checkOut);
  if (!checkIn || !checkOut) return { ok: false, error: 'Dates invalides (format attendu : AAAA-MM-JJ).' };

  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (checkIn < todayUTC) return { ok: false, error: "La date d'arrivée est dans le passé." };
  if (checkOut <= checkIn) return { ok: false, error: "La date de départ doit être après la date d'arrivée." };
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
  if (nights > MAX_STAY_NIGHTS) return { ok: false, error: `Séjour limité à ${MAX_STAY_NIGHTS} nuits.` };

  let guests = 1;
  if (q.guests != null && q.guests !== '') {
    const n = Number(q.guests);
    if (!Number.isInteger(n) || n < 1 || n > MAX_GUESTS) {
      return { ok: false, error: `Nombre de voyageurs invalide (1 à ${MAX_GUESTS}).` };
    }
    guests = n;
  }
  return { ok: true, value: { checkIn, checkOut, guests } };
}

const BLOCKING_RESERVATION_STATUSES = ['pending', 'confirmed', 'checked_in', 'PENDING', 'CONFIRMED'];

/**
 * Map venueId -> number of rooms still bookable for the stay. Venues with no
 * bookable room are absent from the map.
 */
export async function getAvailableRoomCounts(
  venueIds: mongoose.Types.ObjectId[],
  stay: StayQuery
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!venueIds.length) return result;

  const rooms = await Room.find({ venueId: { $in: venueIds }, isActive: true, isReservable: true })
    .select('venueId capacity capacityAdults')
    .lean();
  const fitting = rooms.filter((r) => (r.capacityAdults ?? r.capacity ?? 2) >= stay.guests);
  if (!fitting.length) return result;

  const roomIds = fitting.map((r) => r._id);
  const fittingVenueIds = Array.from(new Set(fitting.map((r) => r.venueId)));
  const now = new Date();

  const [reservations, holds, blocks] = await Promise.all([
    Reservation.find({
      roomId: { $in: roomIds },
      status: { $in: BLOCKING_RESERVATION_STATUSES },
      startAt: { $lt: stay.checkOut },
      endAt: { $gt: stay.checkIn },
    })
      .select('roomId')
      .lean(),
    ReservationHold.find({
      reservableUnitId: { $in: roomIds },
      status: 'active',
      expiresAt: { $gt: now },
      startsAt: { $lt: stay.checkOut },
      endsAt: { $gt: stay.checkIn },
    })
      .select('reservableUnitId')
      .lean(),
    RoomBlock.find({
      isActive: true,
      startsAt: { $lt: stay.checkOut },
      endsAt: { $gt: stay.checkIn },
      $or: [
        { scope: 'room', roomId: { $in: roomIds } },
        { scope: 'venue', venueId: { $in: fittingVenueIds } },
      ],
    })
      .select('scope roomId venueId')
      .lean(),
  ]);

  const takenRooms = new Set<string>();
  reservations.forEach((r: any) => r.roomId && takenRooms.add(String(r.roomId)));
  holds.forEach((h: any) => h.reservableUnitId && takenRooms.add(String(h.reservableUnitId)));
  const blockedVenues = new Set<string>();
  blocks.forEach((b: any) => {
    if (b.scope === 'venue' && b.venueId) blockedVenues.add(String(b.venueId));
    else if (b.roomId) takenRooms.add(String(b.roomId));
  });

  for (const room of fitting) {
    const vid = String(room.venueId);
    if (blockedVenues.has(vid) || takenRooms.has(String(room._id))) continue;
    result.set(vid, (result.get(vid) ?? 0) + 1);
  }
  return result;
}
