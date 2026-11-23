/**
 * Guesthouse booking system — end to end through the real Express app + in-memory MongoDB replica set.
 * Covers: availability calendar, server-side quote, request creation, double-booking protection,
 * blocks (owner/admin), ownership isolation, status lifecycle + history, expiry, demo mode.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const JWT_SECRET = 'test-only-secret-0123456789-abcdefghijklmnop-QRSTUV';
let replSet: MongoMemoryReplSet;
let app: any;
let M: Record<string, any> = {};
let engine: typeof import('../src/services/bookingEngine');

const ids: Record<string, any> = {};
const tokens: Record<string, string> = {};

const sign = (userId: unknown, role: string) => jwt.sign({ userId: String(userId), role }, JWT_SECRET);
let today = '';
const d = (n: number) => engine.toDay(engine.addDays(engine.parseDay(today)!, n));

const guest = (n = 1) => ({ firstName: 'Sami', lastName: `Client${n}`, email: `sami${n}@example.com`, phone: '+216 20 123 456' });
let keyN = 0;
const book = (venueId: string, checkIn: string, checkOut: string, extra: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/v1/bookings/requests')
    .set('Idempotency-Key', `test-key-${++keyN}-abcdefgh`)
    .send({ venueId, checkIn, checkOut, adults: 2, children: 0, guest: guest(keyN), ...extra });
const calendar = (venueId: string, from: string, to: string) => request(app).get(`/api/v1/bookings/venues/${venueId}/calendar?from=${from}&to=${to}`);
const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.BOOKING_WRITE_LIMIT = '100000'; // the production limiter (12 / 10 min / IP) would throttle the suite
  process.env.MONGODB_URI = replSet.getUri('exploria_booking_test');
  delete process.env.PUBLIC_VENUE_TYPES;
  delete process.env.PUBLIC_VENUE_SLUGS;
  await mongoose.connect(process.env.MONGODB_URI);
  M.Venue = (await import('../src/models/Venue')).Venue;
  M.Room = (await import('../src/models/Room')).Room;
  M.User = (await import('../src/models/User')).User;
  M.Reservation = (await import('../src/models/Reservation')).Reservation;
  M.ReservationHold = (await import('../src/models/ReservationHold')).ReservationHold;
  M.RoomBlock = (await import('../src/models/RoomBlock')).RoomBlock;
  engine = await import('../src/services/bookingEngine');
  app = (await import('../src/app')).default;
  await M.Venue.init();
  await M.Reservation.init();
  today = engine.todayInZone('Africa/Tunis');

  const mkUser = (fullName: string, email: string, role: string, serviceDomains: string[] = []) =>
    M.User.create({ fullName, email, passwordHash: 'x', role, serviceDomains });
  const ownerA = await mkUser('Owner A', 'a@example.com', 'ESTABLISHMENT_OWNER', ['HOTEL']);
  const ownerB = await mkUser('Owner B', 'b@example.com', 'ESTABLISHMENT_OWNER', ['HOTEL']);
  const admin = await mkUser('Admin', 'admin@example.com', 'ADMIN');
  const cust = await mkUser('Customer', 'c@example.com', 'CUSTOMER');
  Object.assign(ids, { ownerA: ownerA._id, ownerB: ownerB._id, admin: admin._id, cust: cust._id });
  tokens.ownerA = sign(ownerA._id, 'ESTABLISHMENT_OWNER');
  tokens.ownerB = sign(ownerB._id, 'ESTABLISHMENT_OWNER');
  tokens.admin = sign(admin._id, 'ADMIN');
  tokens.cust = sign(cust._id, 'CUSTOMER');

  const base = { type: 'MAISON_DHOTE', description: 'x', city: 'Tunis', address: 'x' };
  const single = await M.Venue.create({ ...base, name: 'Maison Unique', slug: 'maison-unique', ownerId: ownerA._id });
  const multi = await M.Venue.create({ ...base, name: 'Maison Multi', slug: 'maison-multi', ownerId: ownerA._id });
  const other = await M.Venue.create({ ...base, name: 'Maison Autre', slug: 'maison-autre', ownerId: ownerB._id });
  const demo = await M.Venue.create({ ...base, name: 'Maison Démo', slug: 'maison-demo', isDemo: true });
  Object.assign(ids, { single: single._id, multi: multi._id, other: other._id, demo: demo._id });
  const mkRoom = (venueId: any, n: number, capacity: number, price: number) =>
    M.Room.create({ venueId, roomNumber: n, name: `Chambre ${n}`, roomType: 'double', capacity, pricePerNight: price });
  ids.singleRoom = (await mkRoom(single._id, 1, 2, 120))._id;
  ids.multiR1 = (await mkRoom(multi._id, 1, 2, 100))._id;
  ids.multiR2 = (await mkRoom(multi._id, 2, 4, 200))._id;
  ids.otherRoom = (await mkRoom(other._id, 1, 2, 90))._id;
  await mkRoom(demo._id, 1, 2, 100); // even with a room, the demo must stay non-bookable
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('availability calendar + quote', () => {
  it('returns per-night statuses, marks past days, and exposes configured rooms', async () => {
    const res = await calendar('maison-unique', d(-2), d(3));
    expect(res.status).toBe(200);
    expect(res.body.bookable).toBe(true);
    expect(res.body.rooms).toHaveLength(1);
    expect(res.body.days[d(-1)].status).toBe('past');
    expect(res.body.days[d(0)].status).toBe('available');
    expect(res.body.days[d(2)].availableRooms).toBe(1);
  });

  it('calculates the price on the server and ignores anything the client claims', async () => {
    const res = await request(app).post('/api/v1/bookings/quote').send({
      venueId: String(ids.single), checkIn: d(10), checkOut: d(13), adults: 2, total: 1, pricePerNight: 1, roomId: String(ids.singleRoom),
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ available: true, nights: 3, pricePerNight: 120, total: 360, currency: 'TND' });
  });

  it('counts nights correctly across month and year boundaries', () => {
    expect(engine.nightsBetween(engine.parseDay('2026-12-30')!, engine.parseDay('2027-01-03')!)).toBe(4);
    expect(engine.nightsBetween(engine.parseDay('2028-02-27')!, engine.parseDay('2028-03-01')!)).toBe(3); // leap year
  });

  it('rejects guests above the room capacity', async () => {
    const res = await request(app).post('/api/v1/bookings/quote').send({ venueId: String(ids.single), checkIn: d(10), checkOut: d(12), adults: 3 });
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe('CAPACITY');
  });

  it('uses the property time zone for "today"', () => {
    // 23:30 UTC on the 14th is already the 15th in Tunis (UTC+1)
    expect(engine.todayInZone('Africa/Tunis', new Date('2026-06-14T23:30:00Z'))).toBe('2026-06-15');
    expect(engine.todayInZone('UTC', new Date('2026-06-14T23:30:00Z'))).toBe('2026-06-14');
  });
});

describe('booking requests', () => {
  it('creates a pending request with a reference, a secret link and a response deadline', async () => {
    const res = await book(String(ids.single), d(20), d(22));
    expect(res.status).toBe(201);
    expect(res.body.reference).toMatch(/^EX-\d{4}-[A-Z0-9]{6}$/);
    expect(res.body.status).toBe('pending');
    expect(res.body.accessToken).toHaveLength(48);
    expect(res.body.summary).toMatchObject({ nights: 2, total: 240, roomName: 'Chambre 1' });
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const stored = await M.Reservation.findOne({ reservationCode: res.body.reference }).select('+accessTokenHash').lean();
    expect(stored.accessTokenHash).toBeTruthy();
    expect(stored.accessTokenHash).not.toContain(res.body.accessToken); // only a hash is stored
    expect(stored.statusHistory[0]).toMatchObject({ to: 'pending', byRole: 'CUSTOMER' });

    const look = await request(app).get(`/api/v1/bookings/requests/${res.body.reference}?token=${res.body.accessToken}`);
    expect(look.status).toBe(200);
    expect(look.body.summary.venueName).toBe('Maison Unique');
    expect((await request(app).get(`/api/v1/bookings/requests/${res.body.reference}?token=wrong`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/bookings/requests/${res.body.reference}`)).status).toBe(404);
  });

  it('refuses past dates, inverted ranges and bad input even when called directly', async () => {
    expect((await book(String(ids.single), d(-3), d(-1))).status).toBe(400);
    expect((await book(String(ids.single), d(30), d(28))).status).toBe(400);
    expect((await book(String(ids.single), d(30), d(80))).status).toBe(400); // > 30 nights
    expect((await book(String(ids.single), '2026-02-31', '2026-03-02')).status).toBe(400);
    const bad = await book(String(ids.single), d(30), d(31), { guest: { firstName: '', lastName: 'x', email: 'nope', phone: 'abc' } });
    expect(bad.status).toBe(422);
    expect((await book(String(ids.single), d(30), d(31), { website: 'http://spam' })).status).toBe(400); // honeypot
  });

  it('prevents overlapping reservations but allows arriving on the check-out day', async () => {
    expect((await book(String(ids.single), d(40), d(43))).status).toBe(201);
    expect((await book(String(ids.single), d(41), d(44))).status).toBe(409); // overlaps
    expect((await book(String(ids.single), d(39), d(41))).status).toBe(409); // overlaps first night
    expect((await book(String(ids.single), d(43), d(45))).status).toBe(201); // starts on previous check-out day
    expect((await book(String(ids.single), d(38), d(40))).status).toBe(201); // ends on next check-in day
  });

  it('lets only ONE of 8 simultaneous submissions take the same dates', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => book(String(ids.single), d(60), d(63))));
    const codes = results.map((r) => r.status).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(7);
    expect(await M.Reservation.countDocuments({ roomId: ids.singleRoom, startAt: engine.parseDay(d(60)) })).toBe(1);
  });

  it('is idempotent: re-sending the same key returns the same reservation', async () => {
    const key = 'idem-fixed-key-123456';
    const send = () =>
      request(app).post('/api/v1/bookings/requests').set('Idempotency-Key', key)
        .send({ venueId: String(ids.single), checkIn: d(70), checkOut: d(72), adults: 2, guest: guest(99) });
    const first = await send();
    const again = await send();
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body.reference).toBe(first.body.reference);
    expect(again.body.replay).toBe(true);
    expect(again.body.accessToken).toBeUndefined(); // the secret is never re-issued
    expect(await M.Reservation.countDocuments({ idempotencyKey: { $regex: 'idem-fixed' } })).toBe(1);
  });

  it('does not block the whole guesthouse when only one room is booked', async () => {
    const first = await book(String(ids.multi), d(80), d(82));
    expect(first.status).toBe(201);
    const cal = await calendar('maison-multi', d(80), d(81));
    expect(cal.body.days[d(80)].status).toBe('available');
    expect(cal.body.days[d(80)].availableRooms).toBe(1);
    const second = await book(String(ids.multi), d(80), d(82));
    expect(second.status).toBe(201);
    expect(second.body.summary.roomName).not.toBe(first.body.summary.roomName); // the other room
    expect((await book(String(ids.multi), d(80), d(82))).status).toBe(409); // now full
    const full = await calendar('maison-multi', d(80), d(81));
    expect(full.body.days[d(80)].status).toBe('pending');
  });

  it('the legacy hold flow honours pending requests (single source of truth)', async () => {
    const res = await request(app).post('/api/v1/hotel-checkout/hold').set(auth('cust'))
      .send({ venueId: String(ids.single), roomId: String(ids.singleRoom), checkIn: d(40), checkOut: d(42), adults: 2 });
    expect(res.status).toBe(409);
  });
});

describe('demo property', () => {
  it('shows its calendar but is never bookable, even if it has a room', async () => {
    const cal = await calendar('maison-demo', d(0), d(5));
    expect(cal.status).toBe(200);
    expect(cal.body.bookable).toBe(false);
    expect(cal.body.reason).toBe('DEMO');
    const res = await book(String(ids.demo), d(10), d(12));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('DEMO_VENUE_NOT_BOOKABLE');
    const q = await request(app).post('/api/v1/bookings/quote').send({ venueId: String(ids.demo), checkIn: d(10), checkOut: d(12), adults: 2 });
    expect(q.body.available).toBe(false);
    expect(await M.Reservation.countDocuments({ venueId: ids.demo })).toBe(0);
  });
});

describe('owner: blocks, ownership and lifecycle', () => {
  let blockId = '';

  it('owner blocks a range → public calendar shows it and booking is refused; unblock reopens it', async () => {
    const block = await request(app).post(`/api/v1/owner-hotel/venues/${ids.other}/blocks`).set(auth('ownerB'))
      .send({ scope: 'venue', startsAt: d(100), endsAt: d(105), reason: 'maintenance', note: 'Travaux' });
    expect(block.status).toBe(201);
    blockId = block.body.data._id;

    const cal = await calendar('maison-autre', d(99), d(105));
    expect(cal.body.days[d(100)].status).toBe('blocked');
    expect(cal.body.days[d(104)].status).toBe('blocked');
    expect(cal.body.days[d(105)].status).toBe('available'); // end of the block is exclusive
    expect(cal.body.days[d(99)].status).toBe('available');
    expect((await book(String(ids.other), d(101), d(103))).status).toBe(409);
    expect((await book(String(ids.other), d(98), d(101))).status).toBe(409);

    expect((await request(app).delete(`/api/v1/owner-hotel/blocks/${blockId}`).set(auth('ownerB'))).status).toBe(200);
    expect((await calendar('maison-autre', d(100), d(101))).body.days[d(100)].status).toBe('available');
    expect((await book(String(ids.other), d(101), d(103))).status).toBe(201);
  });

  it('refuses a block over an existing booking (no silent override) and over pending requests', async () => {
    const r = await book(String(ids.other), d(120), d(123));
    expect(r.status).toBe(201);
    const block = await request(app).post(`/api/v1/owner-hotel/venues/${ids.other}/blocks`).set(auth('ownerB'))
      .send({ scope: 'room', roomId: String(ids.otherRoom), startsAt: d(121), endsAt: d(124), reason: 'owner_hold' });
    expect(block.status).toBe(409);
  });

  it("an owner cannot see or touch another owner's property", async () => {
    const list = await request(app).get('/api/v1/owner-hotel/reservations').set(auth('ownerA'));
    expect(list.status).toBe(200);
    const venueIds = JSON.stringify(list.body);
    expect(venueIds).not.toContain(String(ids.other));

    expect((await request(app).get(`/api/v1/owner-hotel/venues/${ids.other}/calendar`).set(auth('ownerA'))).status).toBe(404);
    expect((await request(app).get(`/api/v1/owner-hotel/venues/${ids.other}/summary`).set(auth('ownerA'))).status).toBe(404);
    expect((await request(app).post(`/api/v1/owner-hotel/venues/${ids.other}/blocks`).set(auth('ownerA'))
      .send({ scope: 'venue', startsAt: d(200), endsAt: d(201) })).status).toBe(404);

    const foreign = await M.Reservation.findOne({ venueId: ids.other });
    expect((await request(app).post(`/api/v1/owner-hotel/reservations/${foreign._id}/accept`).set(auth('ownerA'))).status).toBe(404);
    expect((await request(app).get(`/api/v1/owner-hotel/venues/${ids.single}/calendar`).set(auth('cust'))).status).toBe(403);
  });

  it('confirm → history recorded and the request no longer expires; reject needs a reason and frees the dates', async () => {
    const a = await book(String(ids.single), d(140), d(142));
    const rec = await M.Reservation.findOne({ reservationCode: a.body.reference });
    const ok = await request(app).post(`/api/v1/owner-hotel/reservations/${rec._id}/accept`).set(auth('ownerA'));
    expect(ok.status).toBe(200);
    const confirmed = await M.Reservation.findById(rec._id).lean();
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.expiresAt).toBeUndefined();
    expect(confirmed.statusHistory.map((h: any) => h.to)).toEqual(['pending', 'confirmed']);
    expect(confirmed.statusHistory[1]).toMatchObject({ from: 'pending', byRole: 'ESTABLISHMENT_OWNER' });
    expect((await calendar('maison-unique', d(140), d(141))).body.days[d(140)].status).toBe('reserved');
    expect((await request(app).post(`/api/v1/owner-hotel/reservations/${rec._id}/accept`).set(auth('ownerA'))).status).toBe(409); // not pending anymore

    const b = await book(String(ids.single), d(150), d(152));
    const rec2 = await M.Reservation.findOne({ reservationCode: b.body.reference });
    const rej = await request(app).post(`/api/v1/owner-hotel/reservations/${rec2._id}/reject`).set(auth('ownerA')).send({ reason: 'Dates indisponibles' });
    expect(rej.status).toBe(200);
    const rejected = await M.Reservation.findById(rec2._id).lean();
    expect(rejected.status).toBe('rejected');
    expect(rejected.statusHistory.at(-1)).toMatchObject({ to: 'rejected', reason: 'Dates indisponibles' });
    expect((await calendar('maison-unique', d(150), d(151))).body.days[d(150)].status).toBe('available');
    expect((await book(String(ids.single), d(150), d(152))).status).toBe(201); // inventory released
  });

  it('cancelling a confirmed reservation releases the nights', async () => {
    const rec = await M.Reservation.findOne({ venueId: ids.single, status: 'confirmed' });
    const res = await request(app).post(`/api/v1/owner-hotel/reservations/${rec._id}/cancel`).set(auth('ownerA')).send({ reason: 'Annulation client' });
    expect(res.status).toBe(200);
    const after = await M.Reservation.findById(rec._id).lean();
    expect(after.status).toBe('cancelled');
    expect(after.statusHistory.at(-1).to).toBe('cancelled');
    const day = engine.toDay(rec.startAt);
    expect((await calendar('maison-unique', day, day)).body.days[day].status).toBe('available');
  });

  it('pending requests expire after their window and stop blocking inventory', async () => {
    const r = await book(String(ids.single), d(170), d(172));
    expect(r.status).toBe(201);
    expect((await book(String(ids.single), d(170), d(172))).status).toBe(409);
    await M.Reservation.updateOne({ reservationCode: r.body.reference }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await engine.expirePendingRequests()).length).toBeGreaterThanOrEqual(1);
    const stored = await M.Reservation.findOne({ reservationCode: r.body.reference }).lean();
    expect(stored.status).toBe('expired');
    expect(stored.statusHistory.at(-1)).toMatchObject({ to: 'expired', byRole: 'SYSTEM' });
    expect((await book(String(ids.single), d(170), d(172))).status).toBe(201);
  });
});

describe('super admin', () => {
  it('manages any property: calendar, blocks, and sees owner changes immediately', async () => {
    const props = await request(app).get('/api/v1/admin-bookings/properties').set(auth('admin'));
    expect(props.status).toBe(200);
    const names = props.body.data.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Maison Unique', 'Maison Multi', 'Maison Autre', 'Maison Démo']));
    expect(props.body.data.find((p: any) => p.name === 'Maison Démo').bookable).toBe(false);
    expect(props.body.data.find((p: any) => p.name === 'Maison Unique').owner.fullName).toBe('Owner A');

    // owner blocks → admin sees it
    await request(app).post(`/api/v1/owner-hotel/venues/${ids.multi}/blocks`).set(auth('ownerA'))
      .send({ scope: 'room', roomId: String(ids.multiR1), startsAt: d(210), endsAt: d(212), reason: 'owner_hold' });
    const adminCal = await request(app).get(`/api/v1/admin-bookings/properties/${ids.multi}/calendar?from=${d(205)}&to=${d(215)}`).set(auth('admin'));
    expect(adminCal.status).toBe(200);
    expect(adminCal.body.data.blocks.some((b: any) => b.from === d(210) && b.createdByRole === 'OWNER')).toBe(true);

    // admin blocks on ANY property → owner calendar + public calendar reflect it, creator identified
    const blk = await request(app).post(`/api/v1/owner-hotel/venues/${ids.single}/blocks`).set(auth('admin'))
      .send({ scope: 'venue', startsAt: d(230), endsAt: d(233), reason: 'maintenance' });
    expect(blk.status).toBe(201);
    const ownerCal = await request(app).get(`/api/v1/owner-hotel/venues/${ids.single}/calendar?from=${d(228)}&to=${d(235)}`).set(auth('ownerA'));
    expect(ownerCal.body.data.blocks.find((b: any) => b.from === d(230))).toMatchObject({ createdByRole: 'ADMIN', createdByName: 'Admin' });
    expect((await calendar('maison-unique', d(230), d(230))).body.days[d(230)].status).toBe('blocked');

    // admin unblocks → everything reopens
    expect((await request(app).delete(`/api/v1/owner-hotel/blocks/${blk.body.data._id}`).set(auth('admin'))).status).toBe(200);
    expect((await calendar('maison-unique', d(230), d(230))).body.days[d(230)].status).toBe('available');
  });

  it('summarises bookings across properties and for one owner; non-admins are refused', async () => {
    const all = await request(app).get('/api/v1/admin-bookings/summary').set(auth('admin'));
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBeGreaterThan(5);
    expect(all.body.data.pending).toBeGreaterThan(0);
    expect(all.body.data.confirmed + all.body.data.cancelled + all.body.data.rejected + all.body.data.expired).toBeGreaterThan(0);
    const mine = await request(app).get(`/api/v1/owner-hotel/venues/${ids.single}/summary`).set(auth('ownerA'));
    expect(mine.status).toBe(200);
    expect(mine.body.data.occupancyRate).not.toBeUndefined();
    expect((await request(app).get('/api/v1/admin-bookings/summary').set(auth('ownerA'))).status).toBe(403);
    expect((await request(app).get('/api/v1/admin-bookings/properties')).status).toBe(401);
  });

  it('admin can list reservations with owner filter and guest bookings (no account) do not break it', async () => {
    const list = await request(app).get(`/api/v1/admin/reservations?ownerId=${ids.ownerB}`).set(auth('admin'));
    expect(list.status).toBe(200);
    expect(list.body.reservations.length).toBeGreaterThan(0);
    expect(list.body.reservations.every((r: any) => String(r.venueId._id) === String(ids.other))).toBe(true);
    const guestRes = list.body.reservations.find((r: any) => r.source === 'web-request');
    expect(guestRes.userId == null).toBe(true);
    const search = await request(app).get('/api/v1/admin/reservations?q=sami').set(auth('admin'));
    expect(search.body.reservations.length).toBeGreaterThan(0);
  });
});
