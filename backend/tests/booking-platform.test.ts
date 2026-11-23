/**
 * Marketplace features on top of the booking engine — through the real Express app + in-memory replica set:
 * search & map data, server-side pricing (seasonal/weekend rules + fees), entire-property and multi-room
 * inventory, instant booking, sequential references, demo mode, guest cancellation, transactional e-mail
 * outbox (idempotency, SMTP failure + retry), password setup links, suspension, owner/admin authorisation.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const JWT_SECRET = 'test-only-secret-0123456789-abcdefghijklmnop-QRSTUV';
let replSet: MongoMemoryReplSet;
let app: any;
const M: Record<string, any> = {};
let engine: typeof import('../src/services/bookingEngine');
let mailer: typeof import('../src/services/mailer');
let outbox: typeof import('../src/services/emailOutbox');
const ids: Record<string, any> = {};
const tokens: Record<string, string> = {};
const sign = (userId: unknown, role: string) => jwt.sign({ userId: String(userId), role }, JWT_SECRET);
const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
let today = '';
const d = (n: number) => engine.toDay(engine.addDays(engine.parseDay(today)!, n));
let keyN = 0;
const guest = () => ({ firstName: 'Leila', lastName: `Test${keyN}`, email: `leila${keyN}@example.com`, phone: '+216 98 000 111' });
const book = (venueId: string, checkIn: string, checkOut: string, extra: Record<string, unknown> = {}, key?: string) =>
  request(app)
    .post('/api/v1/bookings/requests')
    .set('Idempotency-Key', key ?? `platform-key-${++keyN}-xyz`)
    .send({ venueId, checkIn, checkOut, adults: 2, children: 0, guest: guest(), ...extra });

/** Fake SMTP transport: records messages, can be told to fail the next N sends. */
const sent: any[] = [];
let failNext = 0;
const fakeTransport: any = {
  sendMail: async (msg: any) => {
    if (failNext > 0) {
      failNext -= 1;
      throw new Error('421 Service not available (simulated)');
    }
    sent.push(msg);
    return { messageId: `<${sent.length}@test>`, accepted: [msg.to], rejected: [] };
  },
  verify: async () => true,
};

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.BOOKING_WRITE_LIMIT = '100000';
  process.env.BOOKING_READ_LIMIT = '100000';
  process.env.EMAIL_OUTBOX_AUTOKICK = 'false'; // the test drives delivery explicitly
  process.env.ADMIN_NOTIFICATION_EMAIL = 'ops@exploria360.test';
  process.env.APP_BASE_URL = 'https://www.exploria360.com';
  process.env.MONGODB_URI = replSet.getUri('exploria_platform_test');
  delete process.env.PUBLIC_VENUE_TYPES;
  process.env.PUBLIC_VENUE_SLUGS = 'demo-house';
  await mongoose.connect(process.env.MONGODB_URI);
  for (const [k, f] of Object.entries({ Venue: 'Venue', Room: 'Room', User: 'User', Reservation: 'Reservation', PricingRule: 'PricingRule', EmailOutbox: 'EmailOutbox', RoomBlock: 'RoomBlock' })) {
    M[k] = (await import(`../src/models/${f}`))[k];
  }
  engine = await import('../src/services/bookingEngine');
  mailer = await import('../src/services/mailer');
  outbox = await import('../src/services/emailOutbox');
  mailer.setTestTransport(fakeTransport);
  app = (await import('../src/app')).default;
  await Promise.all([M.Venue.init(), M.Reservation.init(), M.EmailOutbox.init()]);
  today = engine.todayInZone('Africa/Tunis');

  const mk = (fullName: string, email: string, role: string, extra: Record<string, unknown> = {}) =>
    M.User.create({ fullName, email, passwordHash: 'x', role, serviceDomains: role === 'ESTABLISHMENT_OWNER' ? ['HOTEL'] : [], ...extra });
  const owner = await mk('Hôte Sidi Bou', 'owner@example.com', 'ESTABLISHMENT_OWNER');
  const other = await mk('Autre Hôte', 'other@example.com', 'ESTABLISHMENT_OWNER');
  const admin = await mk('Super Admin', 'root@example.com', 'ADMIN');
  Object.assign(ids, { owner: owner._id, other: other._id, admin: admin._id });
  tokens.owner = sign(owner._id, 'ESTABLISHMENT_OWNER');
  tokens.other = sign(other._id, 'ESTABLISHMENT_OWNER');
  tokens.admin = sign(admin._id, 'ADMIN');

  const base = { type: 'MAISON_DHOTE', description: 'Maison de test', address: 'Rue test', approvalStatus: 'approved', publicListed: true };
  // Rooms mode, Nabeul, with coordinates, pool + wifi, request mode, fees.
  const dar = await M.Venue.create({
    ...base, name: 'Dar Yasmine', slug: 'dar-yasmine', city: 'Hammamet', governorate: 'Nabeul', ownerId: owner._id,
    coordinates: { lat: 36.4, lng: 10.6 }, features: ['pool', 'wifi'], cleaningFee: 30, serviceFee: 10, bedrooms: 2,
  });
  // Entire property, Jendouba, instant booking, no coordinates.
  const ferme = await M.Venue.create({
    ...base, name: 'Ferme Ain Draham', slug: 'ferme-ain-draham', city: 'Ain Draham', governorate: 'Jendouba', ownerId: owner._id,
    rentalMode: 'entire', entirePricePerNight: 400, maxGuests: 8, bedrooms: 4, minimumNights: 2, bookingMode: 'instant', features: ['mountain_view', 'parking'],
  });
  // Unlisted (not public) property of another owner.
  const hidden = await M.Venue.create({ ...base, publicListed: false, name: 'Maison cachée', slug: 'cachee', city: 'Sfax', governorate: 'Sfax', ownerId: other._id });
  // Demo listing (allow-listed by slug), entire mode.
  const demo = await M.Venue.create({ ...base, publicListed: false, name: 'Maison Démo', slug: 'demo-house', city: 'Tunisie', isDemo: true, rentalMode: 'entire', entirePricePerNight: 250, maxGuests: 6 });
  Object.assign(ids, { dar: dar._id, ferme: ferme._id, hidden: hidden._id, demo: demo._id });
  ids.jasmin = (await M.Room.create({ venueId: dar._id, roomNumber: 1, name: 'Jasmin', roomType: 'double', capacity: 2, pricePerNight: 150 }))._id;
  ids.olivier = (await M.Room.create({ venueId: dar._id, roomNumber: 2, name: 'Olivier', roomType: 'suite', capacity: 4, pricePerNight: 260 }))._id;
});

afterAll(async () => {
  mailer?.setTestTransport(null);
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('discovery search', () => {
  it('returns only public guesthouses, filters by governorate, features, guests and map bounds', async () => {
    const all = await request(app).get('/api/v1/bookings/search');
    expect(all.status).toBe(200);
    const slugs = all.body.results.map((r: any) => r.slug).sort();
    expect(slugs).toEqual(['dar-yasmine', 'demo-house', 'ferme-ain-draham']);
    expect(all.body.governorates).toHaveLength(24);

    const nabeul = await request(app).get('/api/v1/bookings/search?governorate=Nabeul');
    expect(nabeul.body.results.map((r: any) => r.slug)).toEqual(['dar-yasmine']);
    const pool = await request(app).get('/api/v1/bookings/search?features=pool,wifi');
    expect(pool.body.results.map((r: any) => r.slug)).toEqual(['dar-yasmine']);
    const big = await request(app).get('/api/v1/bookings/search?guests=7');
    expect(big.body.results.map((r: any) => r.slug)).toEqual(['ferme-ain-draham']);
    const instant = await request(app).get('/api/v1/bookings/search?instant=1');
    expect(instant.body.results.map((r: any) => r.slug)).toEqual(['ferme-ain-draham']);

    // Map: only real coordinates, never invented; bbox filters on them.
    const dar = all.body.results.find((r: any) => r.slug === 'dar-yasmine');
    expect(dar.coordinates).toEqual({ lat: 36.4, lng: 10.6 });
    expect(dar.fromPrice).toBe(150);
    expect(all.body.results.find((r: any) => r.slug === 'ferme-ain-draham').coordinates).toBeNull();
    const box = await request(app).get('/api/v1/bookings/search?bbox=10,36,11,37');
    expect(box.body.results.map((r: any) => r.slug)).toEqual(['dar-yasmine']);
    // No fake ratings.
    expect(dar.rating).toBeNull();
  });

  it('date search excludes listings that cannot take the stay (closed demo, blocked dates)', async () => {
    const r = await request(app).get(`/api/v1/bookings/search?checkIn=${d(40)}&checkOut=${d(43)}&adults=2`);
    const slugs = r.body.results.map((x: any) => x.slug).sort();
    expect(slugs).toEqual(['dar-yasmine', 'ferme-ain-draham']); // demo is closed → excluded
    expect(r.body.results.find((x: any) => x.slug === 'ferme-ain-draham').availability.total).toBe(1200);

    await M.RoomBlock.create({ venueId: ids.ferme, scope: 'venue', startsAt: engine.parseDay(d(41)), endsAt: engine.parseDay(d(42)), reason: 'maintenance', createdBy: ids.owner, isActive: true });
    const r2 = await request(app).get(`/api/v1/bookings/search?checkIn=${d(40)}&checkOut=${d(43)}&adults=2`);
    expect(r2.body.results.map((x: any) => x.slug)).toEqual(['dar-yasmine']);
    const bad = await request(app).get(`/api/v1/bookings/search?checkIn=${d(5)}&checkOut=${d(3)}`);
    expect(bad.status).toBe(400);
  });
});

describe('server-side pricing', () => {
  it('applies seasonal and weekend rules per night, then cleaning + service fees', async () => {
    // +50% for nights d(60)..d(61) on Olivier only; weekend rule -> +20 TND on every night of the week (all days) for the venue.
    await M.PricingRule.create({ venueId: ids.dar, roomId: ids.olivier, kind: 'seasonal', label: 'Été', startsAt: engine.parseDay(d(60)), endsAt: engine.parseDay(d(61)), multiplier: 1.5, isActive: true, priority: 1 });
    await M.PricingRule.create({ venueId: ids.dar, kind: 'weekend', label: 'Tous les jours', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], amount: 20, isActive: true, priority: 2 });
    const q = await request(app).post('/api/v1/bookings/quote').send({ venueId: String(ids.dar), roomIds: [String(ids.olivier)], checkIn: d(60), checkOut: d(63), adults: 3 });
    expect(q.status).toBe(200);
    // nights: 260*1.5+20=410, 410, 260+20=280 → 1100 ; + 30 cleaning + 10 service
    expect(q.body.nightly.map((n: any) => n.price)).toEqual([410, 410, 280]);
    expect(q.body.subtotal).toBe(1100);
    expect(q.body.total).toBe(1140);

    // A client-sent price is ignored: the stored total is the server's.
    const r = await book(String(ids.dar), d(60), d(63), { roomIds: [String(ids.olivier)], adults: 3, total: 1, totalPrice: 1 });
    expect(r.status).toBe(201);
    expect(r.body.summary.total).toBe(1140);
    await M.PricingRule.deleteMany({});
  });

  it('books several rooms in one reservation and rejects capacity overflows', async () => {
    const tooMany = await request(app).post('/api/v1/bookings/quote').send({ venueId: String(ids.dar), roomIds: [String(ids.jasmin)], checkIn: d(80), checkOut: d(82), adults: 3 });
    expect(tooMany.body).toMatchObject({ available: false, reason: 'CAPACITY' });
    const r = await book(String(ids.dar), d(80), d(82), { roomIds: [String(ids.jasmin), String(ids.olivier)], adults: 5 });
    expect(r.status).toBe(201);
    expect(r.body.summary.roomName).toBe('Jasmin + Olivier');
    expect(r.body.summary.total).toBe((150 + 260) * 2 + 30 + 10);
    // Each room is now taken for those nights.
    expect((await book(String(ids.dar), d(81), d(83), { roomIds: [String(ids.jasmin)] })).status).toBe(409);
    expect((await book(String(ids.dar), d(81), d(83), { roomIds: [String(ids.olivier)] })).status).toBe(409);
  });
});

describe('entire property + instant booking + references', () => {
  it('instant booking is confirmed immediately, enforces minimum stay, and blocks the whole house', async () => {
    const short = await book(String(ids.ferme), d(90), d(91));
    expect(short.status).toBe(422);
    expect(short.body.code).toBe('MIN_NIGHTS');

    const r = await book(String(ids.ferme), d(90), d(93), { adults: 6 });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('confirmed');
    expect(r.body.bookingMode).toBe('instant');
    expect(r.body.paymentStatus).toBe('unpaid'); // never "paid" without a verified payment
    expect(r.body.reference).toMatch(/^EX-\d{4}-\d{6}$/);
    expect(r.body.summary.roomName).toBe('Maison entière');
    const stored = await M.Reservation.findOne({ reservationCode: r.body.reference }).lean();
    expect(stored.unitScope).toBe('entire');
    expect(stored.expiresAt).toBeUndefined();

    expect((await book(String(ids.ferme), d(92), d(95))).status).toBe(409); // overlap
    expect((await book(String(ids.ferme), d(93), d(95))).status).toBe(201); // arrive on check-out day

    const cal = await request(app).get(`/api/v1/bookings/venues/${ids.ferme}/calendar?from=${d(90)}&to=${d(93)}`);
    expect(cal.body.rentalMode).toBe('entire');
    expect(cal.body.bookingMode).toBe('instant');
    expect(cal.body.days[d(90)].status).toBe('reserved');
  });

  it('references are sequential and unique', async () => {
    const a = await book(String(ids.ferme), d(100), d(102));
    const b = await book(String(ids.ferme), d(102), d(104));
    const n = (ref: string) => Number(ref.slice(-6));
    expect(n(b.body.reference)).toBe(n(a.body.reference) + 1);
  });

  it('two simultaneous bookings of the same house: exactly one wins', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => book(String(ids.ferme), d(110), d(113))));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
  });
});

describe('demo mode', () => {
  it('is closed by default, and when the admin opens it, bookings are flagged DEMO and never commercial', async () => {
    const closed = await book(String(ids.demo), d(30), d(32));
    expect(closed.status).toBe(403);
    expect(closed.body.code).toBe('DEMO_VENUE_NOT_BOOKABLE');

    const forbidden = await request(app).patch(`/api/v1/admin-bookings/properties/${ids.demo}/settings`).set(auth('owner')).send({ bookingEnabled: true });
    expect(forbidden.status).toBe(403);
    const open = await request(app).patch(`/api/v1/admin-bookings/properties/${ids.demo}/settings`).set(auth('admin')).send({ bookingEnabled: true });
    expect(open.status).toBe(200);

    const cal = await request(app).get(`/api/v1/bookings/venues/${ids.demo}/calendar?from=${d(30)}&to=${d(31)}`);
    expect(cal.body).toMatchObject({ bookable: true, demo: true });
    const r = await book(String(ids.demo), d(30), d(32));
    expect(r.status).toBe(201);
    expect(r.body.isDemo).toBe(true);
    expect(r.body.reference).toMatch(/^EX-DEMO-\d{4}-\d{6}$/);
    const s = await request(app).get('/api/v1/admin-bookings/summary').set(auth('admin'));
    expect(s.body.data.bookingValue).not.toBeGreaterThan(1e9); // sanity
    const demoValue = await M.Reservation.aggregate([{ $match: { isDemo: true } }, { $group: { _id: null, t: { $sum: '$totalPrice' } } }]);
    expect(demoValue[0].t).toBeGreaterThan(0);
    // demo money is excluded from booking value
    const real = await M.Reservation.aggregate([{ $match: { isDemo: { $ne: true }, status: { $in: ['confirmed', 'checked_in', 'completed'] } } }, { $group: { _id: null, t: { $sum: '$totalPrice' } } }]);
    expect(s.body.data.bookingValue).toBe(real[0]?.t ?? 0);
  });
});

describe('guest cancellation (secure link)', () => {
  it('cancels with the token only, frees the dates, and refuses a second cancellation', async () => {
    const r = await book(String(ids.dar), d(120), d(122), { roomIds: [String(ids.jasmin)] });
    expect(r.status).toBe(201);
    const ref = r.body.reference;
    expect((await request(app).post(`/api/v1/bookings/requests/${ref}/cancel`).send({ token: 'x'.repeat(48) })).status).toBe(404);
    const ok = await request(app).post(`/api/v1/bookings/requests/${ref}/cancel`).send({ token: r.body.accessToken, reason: 'Changement de programme' });
    expect(ok.status).toBe(200);
    const again = await request(app).post(`/api/v1/bookings/requests/${ref}/cancel`).send({ token: r.body.accessToken });
    expect(again.status).toBe(409);
    expect((await book(String(ids.dar), d(120), d(122), { roomIds: [String(ids.jasmin)] })).status).toBe(201);
  });
});

describe('transactional e-mails (outbox)', () => {
  it('queues customer + owner + admin e-mails once, with no duplicate on a retried request', async () => {
    const key = 'idem-email-test-0001';
    const first = await book(String(ids.dar), d(130), d(132), { roomIds: [String(ids.olivier)] }, key);
    expect(first.status).toBe(201);
    await new Promise((r) => setTimeout(r, 150)); // notifications are queued asynchronously
    const replay = await book(String(ids.dar), d(130), d(132), { roomIds: [String(ids.olivier)] }, key);
    expect(replay.status).toBe(200);
    expect(replay.body.reference).toBe(first.body.reference);
    await new Promise((r) => setTimeout(r, 150));
    const res = await M.Reservation.findOne({ reservationCode: first.body.reference }).lean();
    const rows = await M.EmailOutbox.find({ reservationId: res._id }).lean();
    expect(rows.map((r: any) => r.recipientRole).sort()).toEqual(['admin', 'customer', 'owner']);
    const customer = rows.find((r: any) => r.recipientRole === 'customer');
    expect(customer.to).toBe(res.customerEmail);
    expect(customer.subject).toContain(first.body.reference);
    expect(customer.html).toContain('Dar Yasmine');
    expect(customer.html).toContain('Non payé'); // honest payment wording
    expect(customer.html).toContain('/reservation-demande/');
    const owner = rows.find((r: any) => r.recipientRole === 'owner');
    expect(owner.to).toBe('owner@example.com');

    sent.length = 0;
    await outbox.processOutbox(50);
    expect(sent.some((m) => m.to === res.customerEmail)).toBe(true);
    expect(sent.some((m) => m.to === 'owner@example.com')).toBe(true);
    const after = await M.EmailOutbox.find({ reservationId: res._id }).lean();
    expect(after.every((r: any) => r.status === 'sent')).toBe(true);
  });

  it('owner confirmation e-mails the customer; SMTP failure is retried without touching the booking', async () => {
    const r = await book(String(ids.dar), d(140), d(142), { roomIds: [String(ids.jasmin)] });
    await new Promise((x) => setTimeout(x, 150));
    await outbox.processOutbox(50);
    const res = await M.Reservation.findOne({ reservationCode: r.body.reference }).lean();
    const accepted = await request(app).post(`/api/v1/owner-hotel/reservations/${res._id}/accept`).set(auth('owner'));
    expect(accepted.status).toBe(200);
    await new Promise((x) => setTimeout(x, 150));

    failNext = 1;
    sent.length = 0;
    const s1 = await outbox.processOutbox(10);
    expect(s1.retry).toBe(1);
    const row = await M.EmailOutbox.findOne({ reservationId: res._id, event: 'confirmed' }).lean();
    expect(row).toMatchObject({ status: 'queued', attempts: 1 });
    expect(row.lastError).toContain('421');
    expect((await M.Reservation.findById(res._id).lean()).status).toBe('confirmed'); // booking untouched

    // Not due yet (back-off) → nothing sent; due → delivered.
    expect((await outbox.processOutbox(10)).sent).toBe(0);
    const later = new Date(Date.now() + 2 * 60_000);
    expect((await outbox.processOutbox(10, later)).sent).toBe(1);
    expect(sent[0].subject).toContain('confirmée');
    expect((await M.EmailOutbox.findById(row._id).lean()).status).toBe('sent');
  });

  it('marks an e-mail failed after max attempts; the admin can retry it', async () => {
    const r = await book(String(ids.dar), d(150), d(151), { roomIds: [String(ids.jasmin)] });
    await new Promise((x) => setTimeout(x, 150));
    const res = await M.Reservation.findOne({ reservationCode: r.body.reference }).lean();
    const row = await M.EmailOutbox.findOne({ reservationId: res._id, recipientRole: 'customer' });
    row.maxAttempts = 1;
    await row.save();
    failNext = 100;
    await outbox.processOutbox(50);
    failNext = 0;
    expect((await M.EmailOutbox.findById(row._id).lean()).status).toBe('failed');
    expect((await request(app).post(`/api/v1/admin-bookings/email/outbox/${row._id}/retry`).set(auth('owner'))).status).toBe(403);
    expect((await request(app).post(`/api/v1/admin-bookings/email/outbox/${row._id}/retry`).set(auth('admin'))).status).toBe(200);
    await outbox.processOutbox(50);
    expect((await M.EmailOutbox.findById(row._id).lean()).status).toBe('sent');
  });

  it('admin SMTP test sends a real message through the transport and reports the result', async () => {
    sent.length = 0;
    const r = await request(app).post('/api/v1/admin-bookings/email/test').set(auth('admin')).send({ to: 'check@example.com' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('sent');
    expect(sent[0].to).toBe('check@example.com');
    const status = await request(app).get('/api/v1/admin-bookings/email/status').set(auth('admin'));
    expect(JSON.stringify(status.body)).not.toMatch(/password/i);
  });
});

describe('owner & admin authorisation', () => {
  it('owners edit only their own booking settings; validation rejects coordinates outside Tunisia', async () => {
    expect((await request(app).patch(`/api/v1/owner-hotel/venues/${ids.dar}/booking-settings`).set(auth('other')).send({ cleaningFee: 0 })).status).toBe(404);
    expect((await request(app).patch(`/api/v1/owner-hotel/venues/${ids.dar}/booking-settings`).set(auth('owner')).send({ coordinates: { lat: 48.8, lng: 2.3 } })).status).toBe(422);
    // Owners cannot flip admin-only switches.
    expect((await request(app).patch(`/api/v1/owner-hotel/venues/${ids.dar}/booking-settings`).set(auth('owner')).send({ isDemo: true })).status).toBe(422);
    const ok = await request(app).patch(`/api/v1/owner-hotel/venues/${ids.dar}/booking-settings`).set(auth('owner')).send({ bookingMode: 'instant', cleaningFee: 25 });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ bookingMode: 'instant', cleaningFee: 25 });
    const r = await book(String(ids.dar), d(160), d(161), { roomIds: [String(ids.jasmin)] });
    expect(r.body.status).toBe('confirmed');
  });

  it('owner manual reservation goes through the same engine (conflicts refused)', async () => {
    const ok = await request(app).post(`/api/v1/owner-hotel/venues/${ids.dar}/reservations/manual`).set(auth('owner'))
      .send({ roomIds: [String(ids.olivier)], checkIn: d(170), checkOut: d(172), adults: 2, firstName: 'Tel', lastName: 'Client', phone: '+216 1', source: 'phone' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.reservationCode).toMatch(/^EX-\d{4}-\d{6}$/);
    const clash = await request(app).post(`/api/v1/owner-hotel/venues/${ids.dar}/reservations/manual`).set(auth('owner'))
      .send({ roomIds: [String(ids.olivier)], checkIn: d(171), checkOut: d(173), adults: 2, firstName: 'X', lastName: 'Y', phone: '+216 2', source: 'phone' });
    expect(clash.status).toBe(409);
    expect((await request(app).post(`/api/v1/owner-hotel/venues/${ids.dar}/reservations/manual`).set(auth('other'))
      .send({ checkIn: d(175), checkOut: d(176), firstName: 'X', lastName: 'Y', phone: '1' })).status).toBe(404);
  });

  it('admin-only endpoints refuse owners; admin KPIs, owner list, transitions work', async () => {
    for (const path of ['/kpis', '/properties', '/owners', '/email/status', '/email/outbox']) {
      expect((await request(app).get(`/api/v1/admin-bookings${path}`).set(auth('owner'))).status).toBe(403);
      expect((await request(app).get(`/api/v1/admin-bookings${path}`).set(auth('admin'))).status).toBe(200);
    }
    const kpis = await request(app).get('/api/v1/admin-bookings/kpis').set(auth('admin'));
    expect(kpis.body.data.properties.total).toBe(4);
    const r = await book(String(ids.ferme), d(180), d(182));
    const res = await M.Reservation.findOne({ reservationCode: r.body.reference }).lean();
    expect((await request(app).post(`/api/v1/admin-bookings/reservations/${res._id}/transition`).set(auth('admin')).send({ to: 'rejected' })).status).toBe(409); // confirmed → rejected not allowed
    expect((await request(app).post(`/api/v1/admin-bookings/reservations/${res._id}/transition`).set(auth('admin')).send({ to: 'cancelled', reason: 'Test' })).status).toBe(200);
    expect((await M.Reservation.findById(res._id).lean()).status).toBe('cancelled');
  });
});

describe('accounts: setup links, reset, suspension', () => {
  it('admin creates an owner with a one-time setup link; the owner sets a password and signs in', async () => {
    const c = await request(app).post('/api/v1/admin-bookings/owners').set(auth('admin')).send({ fullName: 'Nouvel Hôte', email: 'new.host@example.com', venueIds: [String(ids.hidden)] });
    expect(c.status).toBe(201);
    const token = new URL(c.body.data.setupLink).searchParams.get('token');
    expect((await M.Venue.findById(ids.hidden).lean()).ownerId.toString()).toBe(c.body.data.id);
    // The random initial password is unusable.
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'new.host@example.com', password: 'anything' })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'weak' })).status).toBe(400);
    expect((await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'Solide#2026x' })).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'Solide#2026y' })).status).toBe(400); // single use
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'new.host@example.com', password: 'Solide#2026x' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('ESTABLISHMENT_OWNER');
  });

  it('forgot-password never reveals whether an account exists, and queues a reset e-mail when it does', async () => {
    const a = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.com' });
    const b = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'owner@example.com' });
    expect(a.status).toBe(200);
    expect(b.body).toEqual(a.body);
    expect(await M.EmailOutbox.countDocuments({ to: 'owner@example.com', event: 'account' })).toBe(1);
  });

  it('a suspended account cannot sign in', async () => {
    await M.User.create({ fullName: 'Suspendu', email: 'sus@example.com', passwordHash: await bcrypt.hash('Solide#2026x', 4), role: 'ESTABLISHMENT_OWNER', serviceDomains: ['HOTEL'] });
    const u = await M.User.findOne({ email: 'sus@example.com' });
    expect((await request(app).patch(`/api/v1/admin-bookings/users/${u._id}/status`).set(auth('admin')).send({ isActive: false })).status).toBe(200);
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'sus@example.com', password: 'Solide#2026x' });
    expect(login.status).toBe(403);
  });
});
