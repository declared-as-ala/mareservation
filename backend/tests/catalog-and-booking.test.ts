/**
 * Integration tests (real Express app + in-memory MongoDB replica set):
 *  - category visibility (maisons d'hôtes only) across public endpoints
 *  - booking safety: no double holds, no double confirmation from one hold
 * No production database is ever touched.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const JWT_SECRET = 'test-only-secret-0123456789-abcdefghijklmnop-QRSTUV';

let replSet: MongoMemoryReplSet;
let app: any;
let Venue: any, Room: any, User: any, Reservation: any, ReservationHold: any;

let maison: any;
let maisonUnpublished: any;
let cafe: any;
let hotel: any;
let room: any;
const users: { id: string; token: string }[] = [];

const day = 24 * 60 * 60 * 1000;
function dateISO(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * day);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

const venueBase = { description: 'Test', city: 'Tunis', address: 'Test address' };

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.MONGODB_URI = replSet.getUri('exploria_test');
  delete process.env.PUBLIC_VENUE_TYPES;
  delete process.env.PUBLIC_VENUE_SLUGS;

  await mongoose.connect(process.env.MONGODB_URI);
  ({ Venue } = await import('../src/models/Venue'));
  ({ Room } = await import('../src/models/Room'));
  ({ User } = await import('../src/models/User'));
  ({ Reservation } = await import('../src/models/Reservation'));
  ({ ReservationHold } = await import('../src/models/ReservationHold'));
  app = (await import('../src/app')).default;

  maison = await Venue.create({ ...venueBase, name: 'Maison Test', slug: 'maison-test', type: 'MAISON_DHOTE' });
  maisonUnpublished = await Venue.create({
    ...venueBase, name: 'Maison Brouillon', slug: 'maison-brouillon', type: 'MAISON_DHOTE', isPublished: false,
  });
  cafe = await Venue.create({ ...venueBase, name: 'Café Test', slug: 'cafe-test', type: 'CAFE' });
  hotel = await Venue.create({ ...venueBase, name: 'Hôtel Test', slug: 'hotel-test', type: 'HOTEL' });
  room = await Room.create({
    venueId: maison._id, roomNumber: 1, roomType: 'double', capacity: 2, pricePerNight: 100,
  });

  for (let i = 0; i < 8; i++) {
    const u = await User.create({ fullName: `Guest ${i}`, email: `guest${i}@example.com`, passwordHash: 'x', role: 'CUSTOMER' });
    users.push({ id: String(u._id), token: jwt.sign({ userId: String(u._id), role: 'CUSTOMER' }, JWT_SECRET) });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('category visibility (maisons d\'hôtes only)', () => {
  it('lists only published maisons d\'hôtes', async () => {
    const res = await request(app).get('/api/v1/venues');
    expect(res.status).toBe(200);
    const slugs = (res.body as any[]).map((v) => v.slug);
    expect(slugs).toContain('maison-test');
    expect(slugs).not.toContain('cafe-test');
    expect(slugs).not.toContain('hotel-test');
    expect(slugs).not.toContain('maison-brouillon'); // unpublished stays private
  });

  it('returns nothing when a hidden type is requested explicitly', async () => {
    const res = await request(app).get('/api/v1/venues?type=CAFE');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('404s hidden-type venues by id and by slug, including sub-resources', async () => {
    for (const ref of [String(cafe._id), 'cafe-test', String(hotel._id), 'hotel-test']) {
      expect((await request(app).get(`/api/v1/venues/${ref}`)).status).toBe(404);
      expect((await request(app).get(`/api/v1/venues/${ref}/rooms`)).status).toBe(404);
      expect((await request(app).get(`/api/v1/venues/${ref}/table-placements`)).status).toBe(404);
    }
    expect((await request(app).get(`/api/v1/tables/venue/${cafe._id}`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/reviews/venue/${cafe._id}`)).status).toBe(404);
  });

  it('serves a maison d\'hôtes with its rooms', async () => {
    const res = await request(app).get('/api/v1/venues/maison-test');
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain('"roomNumber":1');
  });

  it('keeps hidden venues out of search results', async () => {
    const res = await request(app).get('/api/v1/search?q=Test');
    expect(res.status).toBe(200);
    const slugs = (res.body.venues as any[]).map((v) => v.slug);
    expect(slugs).toContain('maison-test');
    expect(slugs).not.toContain('cafe-test');
    expect(slugs).not.toContain('hotel-test');
  });

  it('refuses NEW holds/reservations for hidden types (403) but not for maisons', async () => {
    const body = (venueId: any) => ({ venueId: String(venueId), roomId: String(room._id), checkIn: dateISO(200), checkOut: dateISO(202) });
    const blocked = await request(app).post('/api/v1/hotel-checkout/hold').set('Authorization', `Bearer ${users[0].token}`).send(body(hotel._id));
    expect(blocked.status).toBe(403);
    const blockedRes = await request(app).post('/api/v1/reservations').set('Authorization', `Bearer ${users[0].token}`).send({ venueId: String(cafe._id), startAt: dateISO(200), endAt: dateISO(201) });
    expect(blockedRes.status).toBe(403);
    const ok = await request(app).post('/api/v1/hotel-checkout/hold').set('Authorization', `Bearer ${users[0].token}`).send(body(maison._id));
    expect(ok.status).toBe(201);
  });

  it('PUBLIC_VENUE_SLUGS allowlist hides everything else, even enabled types', async () => {
    process.env.PUBLIC_VENUE_SLUGS = 'some-other-slug';
    try {
      const list = await request(app).get('/api/v1/venues');
      expect(list.body).toEqual([]);
      expect((await request(app).get('/api/v1/venues/maison-test')).status).toBe(404);
    } finally {
      delete process.env.PUBLIC_VENUE_SLUGS;
    }
  });

  it('exposes the enabled types to the frontend', async () => {
    const res = await request(app).get('/api/v1/meta/homepage-config');
    expect(res.status).toBe(200);
    expect(res.body.data.publicVenueTypes).toEqual(['MAISON_DHOTE']);
  });
});

describe('booking safety', () => {
  const holdBody = (inDays: number, outDays: number) => ({
    venueId: String(maison._id), roomId: String(room._id), checkIn: dateISO(inDays), checkOut: dateISO(outDays), adults: 2,
  });
  const hold = (u: { token: string }, body: object) =>
    request(app).post('/api/v1/hotel-checkout/hold').set('Authorization', `Bearer ${u.token}`).send(body);

  it('lets exactly ONE of 8 simultaneous guests hold the same room and dates', async () => {
    const results = await Promise.all(users.map((u) => hold(u, holdBody(30, 33))));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    const activeHolds = await ReservationHold.countDocuments({
      reservableUnitId: room._id, status: 'active', startsAt: new Date(dateISO(30)),
    });
    expect(activeHolds).toBe(1);
  });

  it('rejects overlapping stays but accepts adjacent ones (check-out day is free)', async () => {
    expect((await hold(users[1], holdBody(31, 34))).status).toBe(409); // overlaps 30–33
    expect((await hold(users[2], holdBody(32, 35))).status).toBe(409);
    expect((await hold(users[3], holdBody(33, 35))).status).toBe(201); // starts on check-out day
    expect((await hold(users[4], holdBody(27, 30))).status).toBe(201); // ends on check-in day
  });

  it('refuses past dates and inverted ranges', async () => {
    expect((await hold(users[5], holdBody(-3, -1))).status).toBe(400);
    expect((await hold(users[5], holdBody(60, 58))).status).toBe(400);
  });

  it('turns one hold into exactly ONE reservation even with 5 simultaneous confirmations', async () => {
    const h = await hold(users[6], holdBody(90, 92));
    expect(h.status).toBe(201);
    const holdId = h.body.data._id;
    const confirm = () =>
      request(app)
        .post('/api/v1/hotel-checkout/confirm')
        .set('Authorization', `Bearer ${users[6].token}`)
        .send({
          holdId,
          paymentOption: 'pay_at_hotel',
          acceptedHotelPolicy: true,
          acceptedPlatformTerms: true,
          guest: { firstName: 'Test', lastName: 'Guest', email: 'guest6@example.com', phone: '+21600000000' },
        });
    const results = await Promise.all([confirm(), confirm(), confirm(), confirm(), confirm()]);
    const ok = results.filter((r) => r.status >= 200 && r.status < 300);
    expect(ok).toHaveLength(1);
    expect(await Reservation.countDocuments({ holdId })).toBe(1);
    const stored = await ReservationHold.findById(holdId).lean();
    expect((stored as any).status).toBe('converted');
  });

  it('does not let a confirmed stay be held again', async () => {
    const again = await hold(users[7], holdBody(90, 92));
    expect(again.status).toBe(409);
  });
});

describe('availability search (real data, validated server-side)', () => {
  const search = (qs: string) => request(app).get(`/api/v1/venues?${qs}`);
  const slugs = (res: any) => (res.body as any[]).map((v) => v.slug);

  it('excludes a maison whose only room is held/reserved for the dates', async () => {
    // days 30–33 are held by an earlier test
    const res = await search(`checkIn=${dateISO(31).slice(0, 10)}&checkOut=${dateISO(32).slice(0, 10)}&guests=2`);
    expect(res.status).toBe(200);
    expect(slugs(res)).not.toContain('maison-test');
  });

  it('includes it, with a room count, when the dates are genuinely free', async () => {
    const res = await search(`checkIn=${dateISO(60).slice(0, 10)}&checkOut=${dateISO(62).slice(0, 10)}&guests=2`);
    expect(res.status).toBe(200);
    const found = (res.body as any[]).find((v) => v.slug === 'maison-test');
    expect(found).toBeTruthy();
    expect(found.availableRooms).toBe(1);
  });

  it('treats the check-out day as free (stay starting on another stay\'s check-out)', async () => {
    // the 90–92 stay is confirmed; 92–94 must still be searchable
    const res = await search(`checkIn=${dateISO(92).slice(0, 10)}&checkOut=${dateISO(94).slice(0, 10)}&guests=2`);
    expect(slugs(res)).toContain('maison-test');
  });

  it('excludes rooms too small for the party', async () => {
    const res = await search(`checkIn=${dateISO(60).slice(0, 10)}&checkOut=${dateISO(62).slice(0, 10)}&guests=5`);
    expect(slugs(res)).not.toContain('maison-test');
  });

  it('answers 400 with a clear message on invalid input', async () => {
    for (const qs of [
      'checkIn=2020-01-01&checkOut=2020-01-03',
      `checkIn=${dateISO(60).slice(0, 10)}&checkOut=${dateISO(58).slice(0, 10)}`,
      `checkIn=${dateISO(60).slice(0, 10)}`,
      'checkIn=garbage&checkOut=garbage',
    ]) {
      const res = await search(qs);
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    }
  });

  it('without dates it still lists published maisons', async () => {
    expect(slugs(await search('guests=2'))).toContain('maison-test');
  });
});

describe('hold input validation', () => {
  const post = (body: object) =>
    request(app).post('/api/v1/hotel-checkout/hold').set('Authorization', `Bearer ${users[0].token}`)
      .send({ venueId: String(maison._id), roomId: String(room._id), ...body });

  it('rejects non-numeric, zero, fractional and excessive guest counts', async () => {
    for (const adults of ['abc', 0, -1, 2.5, 99]) {
      const res = await post({ checkIn: dateISO(120), checkOut: dateISO(122), adults });
      expect(res.status, `adults=${adults}`).toBe(400);
    }
    expect((await post({ checkIn: dateISO(120), checkOut: dateISO(122), adults: 2, children: -3 })).status).toBe(400);
  });

  it('rejects stays longer than 30 nights', async () => {
    expect((await post({ checkIn: dateISO(120), checkOut: dateISO(155), adults: 2 })).status).toBe(400);
  });
});
