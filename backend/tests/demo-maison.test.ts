/**
 * The demonstration maison d'hôtes: idempotent seed, public allowlist, and
 * server-side refusal of every booking path (in-memory MongoDB only).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const JWT_SECRET = 'test-only-secret-0123456789-abcdefghijklmnop-QRSTUV';
const DEMO_MESSAGE =
  "Cette maison d'hôtes est présentée à titre de démonstration. Les réservations ne sont pas encore ouvertes.";
const day = 24 * 60 * 60 * 1000;
const dateISO = (n: number) => {
  const d = new Date(Date.now() + n * day);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
};

let replSet: MongoMemoryReplSet;
let app: any;
let Venue: any, Room: any, User: any, Reservation: any, ReservationHold: any;
let demoMod: typeof import('../src/utils/demoMaison');
let token: string;
let realMaison: any;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.MONGODB_URI = replSet.getUri('exploria_demo_test');
  delete process.env.PUBLIC_VENUE_TYPES;
  delete process.env.PUBLIC_VENUE_SLUGS;
  await mongoose.connect(process.env.MONGODB_URI);
  ({ Venue } = await import('../src/models/Venue'));
  ({ Room } = await import('../src/models/Room'));
  ({ User } = await import('../src/models/User'));
  ({ Reservation } = await import('../src/models/Reservation'));
  ({ ReservationHold } = await import('../src/models/ReservationHold'));
  demoMod = await import('../src/utils/demoMaison');
  app = (await import('../src/app')).default;
  await Venue.init();

  realMaison = await Venue.create({
    name: 'Autre maison', slug: 'autre-maison', type: 'MAISON_DHOTE', description: 'x', city: 'Tunis', address: 'x',
  });
  const user = await User.create({ fullName: 'Guest', email: 'guest@example.com', passwordHash: 'x', role: 'CUSTOMER' });
  token = jwt.sign({ userId: String(user._id), role: 'CUSTOMER' }, JWT_SECRET);
});

afterAll(async () => {
  delete process.env.PUBLIC_VENUE_SLUGS;
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('demo seed', () => {
  it('is idempotent: running it 3 times leaves exactly one demo venue and touches nothing else', async () => {
    const before = await Venue.countDocuments();
    const first = await demoMod.upsertDemoMaison(Venue);
    const second = await demoMod.upsertDemoMaison(Venue);
    const third = await demoMod.upsertDemoMaison(Venue);
    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(third.inserted).toBe(false);
    expect(await Venue.countDocuments({ slug: demoMod.DEMO_SLUG })).toBe(1);
    expect(await Venue.countDocuments()).toBe(before + 1);
    const other = await Venue.findOne({ slug: 'autre-maison' }).lean();
    expect((other as any).name).toBe('Autre maison'); // unrelated venue untouched
  });

  it('contains no invented real-world facts', async () => {
    const demo: any = await Venue.findOne({ slug: demoMod.DEMO_SLUG }).lean();
    expect(demo.type).toBe('MAISON_DHOTE');
    expect(demo.isDemo).toBe(true);
    expect(demo.name).toContain('Démo');
    expect(demo.rating).toBe(0);
    expect(demo.ratingCount).toBe(0);
    expect(demo.startingPrice).toBe(0);
    expect(demo.amenities).toEqual([]);
    expect(demo.address).toMatch(/démonstration/i); // indicative demo position, labelled as such
    expect(demo.coordinates).toMatchObject({ lat: 36.4033, lng: 10.6012 });
    expect(demo.immersiveUrl).toBe('https://spinview360.com/villaaa/');
    expect(await Room.countDocuments({ venueId: demo._id })).toBe(0); // no invented inventory
  });
});

describe('public allowlist exposes only the demo', () => {
  it('lists only the demo and serves its details', async () => {
    process.env.PUBLIC_VENUE_SLUGS = demoMod.DEMO_SLUG;
    const list = await request(app).get('/api/v1/venues');
    expect((list.body as any[]).map((v) => v.slug)).toEqual([demoMod.DEMO_SLUG]);
    expect(list.body[0].isDemo).toBe(true);
    expect((await request(app).get(`/api/v1/venues/${demoMod.DEMO_SLUG}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/venues/autre-maison')).status).toBe(404);
  });

  it('never returns the demo from an availability search', async () => {
    const res = await request(app).get(
      `/api/v1/venues?checkIn=${dateISO(40).slice(0, 10)}&checkOut=${dateISO(42).slice(0, 10)}&guests=2`
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('demo is not bookable (server-side)', () => {
  let demoId: string;
  let roomId: string;
  beforeAll(async () => {
    const demo: any = await Venue.findOne({ slug: demoMod.DEMO_SLUG }).lean();
    demoId = String(demo._id);
    // even if someone later adds a bookable room to the demo, the API must still refuse
    const room = await Room.create({ venueId: demo._id, roomNumber: 1, roomType: 'double', capacity: 2, pricePerNight: 100 });
    roomId = String(room._id);
  });
  afterAll(async () => {
    await Room.deleteMany({ _id: roomId }); // test DB only
  });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  it('rejects hotel holds', async () => {
    const res = await auth(request(app).post('/api/v1/hotel-checkout/hold')).send({
      venueId: demoId, roomId, checkIn: dateISO(50), checkOut: dateISO(52),
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe(DEMO_MESSAGE);
    expect(res.body.code).toBe('DEMO_VENUE_NOT_BOOKABLE');
  });

  it('rejects generic holds and reservations', async () => {
    const hold = await auth(request(app).post('/api/v1/reservations/holds')).send({
      venueId: demoId, roomId, startsAt: dateISO(50), endsAt: dateISO(52),
    });
    expect(hold.status).toBe(403);
    const reservation = await auth(request(app).post('/api/v1/reservations')).send({
      venueId: demoId, roomId, bookingType: 'ROOM', startAt: dateISO(50), endAt: dateISO(52),
    });
    expect(reservation.status).toBe(403);
    expect(reservation.body.error).toBe(DEMO_MESSAGE);
  });

  it('rejects confirming a hold that points at the demo (defence in depth)', async () => {
    const hold = await ReservationHold.create({
      venueId: demoId, reservableUnitId: roomId, userId: new mongoose.Types.ObjectId(),
      dateKey: dateISO(50).slice(0, 10), startsAt: new Date(dateISO(50)), endsAt: new Date(dateISO(52)),
      peopleCount: 2, status: 'active', expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const res = await auth(request(app).post('/api/v1/hotel-checkout/confirm')).send({
      holdId: String(hold._id), paymentOption: 'pay_at_hotel', acceptedHotelPolicy: true, acceptedPlatformTerms: true,
      guest: { firstName: 'A', lastName: 'B', email: 'a@b.co', phone: '+21600000000' },
    });
    expect(res.status).toBe(403);
    expect(await Reservation.countDocuments({ venueId: demoId })).toBe(0);
  });

  it('still allows a normal (non-demo) maison to be held', async () => {
    process.env.PUBLIC_VENUE_SLUGS = `${demoMod.DEMO_SLUG},autre-maison`;
    const room = await Room.create({ venueId: realMaison._id, roomNumber: 1, roomType: 'double', capacity: 2, pricePerNight: 100 });
    const res = await auth(request(app).post('/api/v1/hotel-checkout/hold')).send({
      venueId: String(realMaison._id), roomId: String(room._id), checkIn: dateISO(60), checkOut: dateISO(62),
    });
    expect(res.status).toBe(201);
  });
});
