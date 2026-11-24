/**
 * Super-admin console read models — controlled fixtures in an isolated in-memory replica set.
 * Every expected number below is derived by hand from the fixtures (Test 5 of the admin spec):
 * confirmed counts, pending, booking value, previous-period comparison, status breakdown,
 * occupancy (entire vs per-room inventory, blocked nights), top maisons, governorates,
 * demo exclusion, reservation filters + CSV, customers, applications, authorisation.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const JWT_SECRET = 'test-only-secret-0123456789-abcdefghijklmnop-ADMINC';
let replSet: MongoMemoryReplSet;
let app: any;
const M: Record<string, any> = {};
const ids: Record<string, any> = {};
const tokens: Record<string, string> = {};
const sign = (userId: unknown, role: string) => jwt.sign({ userId: String(userId), role }, JWT_SECRET);
const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

let from = '';
let to = '';
const day = (base: string, n: number) => new Date(Date.parse(`${base}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const stay = (d: string) => new Date(`${d}T00:00:00Z`); // stay days are UTC midnights
const noonTunis = (d: string) => new Date(`${d}T11:00:00Z`); // 12:00 Africa/Tunis

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.EMAIL_OUTBOX_AUTOKICK = 'false';
  process.env.MONGODB_URI = replSet.getUri('exploria_admin_console_test');
  await mongoose.connect(process.env.MONGODB_URI);
  for (const k of ['Venue', 'Room', 'User', 'Reservation', 'RoomBlock', 'PartnerApplication']) M[k] = (await import(`../src/models/${k}`))[k];
  app = (await import('../src/app')).default;
  const { todayTunis } = await import('../src/services/adminAnalytics');
  to = todayTunis();
  from = day(to, -9); // 10-day period

  const mk = (fullName: string, email: string, role: string) =>
    M.User.create({ fullName, email, passwordHash: 'x', role, serviceDomains: role === 'ESTABLISHMENT_OWNER' ? ['HOTEL'] : [] });
  const owner = await mk('Hôte Nabeul', 'owner@example.com', 'ESTABLISHMENT_OWNER');
  await mk('Hôte sans maison', 'idle@example.com', 'ESTABLISHMENT_OWNER');
  const admin = await mk('Super Admin', 'root@example.com', 'ADMIN');
  const customer = await mk('Leila Client', 'leila@example.com', 'CUSTOMER');
  Object.assign(ids, { owner: owner._id, admin: admin._id, customer: customer._id });
  tokens.admin = sign(admin._id, 'ADMIN');
  tokens.owner = sign(owner._id, 'ESTABLISHMENT_OWNER');

  const base = { type: 'MAISON_DHOTE', description: 'Maison', address: 'Rue', isPublished: true, approvalStatus: 'approved', ownerId: owner._id, coverImage: '/x.jpg', coordinates: { lat: 36.4, lng: 10.6 } };
  const A = await M.Venue.create({ ...base, name: 'Dar Nabeul', slug: 'dar-nabeul', city: 'Nabeul', governorate: 'Nabeul', rentalMode: 'entire', entirePricePerNight: 200, maxGuests: 4 });
  const B = await M.Venue.create({ ...base, name: 'Dar Tunis', slug: 'dar-tunis', city: 'Tunis', governorate: 'Tunis', rentalMode: 'rooms' });
  const D = await M.Venue.create({ ...base, name: 'Démo', slug: 'demo', city: 'Hammamet', governorate: 'Nabeul', isDemo: true, rentalMode: 'entire', entirePricePerNight: 250, maxGuests: 6 });
  const r1 = await M.Room.create({ venueId: B._id, roomNumber: 1, name: 'Jasmin', roomType: 'double', capacity: 2, pricePerNight: 150 });
  const r2 = await M.Room.create({ venueId: B._id, roomNumber: 2, name: 'Olivier', roomType: 'double', capacity: 2, pricePerNight: 150 });
  Object.assign(ids, { A: A._id, B: B._id, D: D._id, r1: r1._id, r2: r2._id });

  const res = (venueId: unknown, status: string, total: number, created: string, s: string, e: string, extra: Record<string, unknown> = {}) => ({
    userId: customer._id, venueId, bookingType: 'ROOM', status, paymentStatus: 'unpaid', totalPrice: total,
    startAt: stay(s), endAt: stay(e), createdAt: noonTunis(created), updatedAt: noonTunis(created),
    customerFirstName: 'Leila', customerLastName: 'Client', customerEmail: 'leila@example.com', adults: 2, children: 0, isDemo: false,
    confirmationCode: `C-${String(extra.reservationCode)}`, ...extra,
  });
  // Raw inserts so createdAt is exactly controlled.
  await M.Reservation.collection.insertMany([
    res(A._id, 'confirmed', 600, day(from, 1), day(from, 2), day(from, 5), { unitScope: 'entire', reservationCode: 'EX-T-1' }), // 3 unit-nights
    res(A._id, 'pending', 400, day(from, 3), day(to, 20), day(to, 22), { unitScope: 'entire', reservationCode: 'EX-T-2', expiresAt: new Date(Date.now() + 3_600_000) }),
    res(B._id, 'confirmed', 300, day(from, 4), day(from, 1), day(from, 3), { unitScope: 'room', roomIds: [r1._id], reservationCode: 'EX-T-3' }), // 2 unit-nights
    res(B._id, 'cancelled', 200, day(from, 5), day(to, 5), day(to, 7), { unitScope: 'room', roomIds: [r1._id], reservationCode: 'EX-T-4', customerFirstName: '=HYPERLINK("x")' }),
    res(D._id, 'confirmed', 999, day(from, 2), day(from, 3), day(from, 4), { unitScope: 'entire', isDemo: true, reservationCode: 'EX-DEMO-1' }),
    res(A._id, 'confirmed', 500, day(from, -3), day(from, -2), day(from, -1), { unitScope: 'entire', reservationCode: 'EX-T-0' }), // previous period
  ]);
  // Room 2 of Dar Tunis blocked for the whole period: 10 nights removed from inventory.
  await M.RoomBlock.create({ venueId: B._id, roomId: r2._id, scope: 'room', startsAt: stay(from), endsAt: stay(day(to, 1)), reason: 'maintenance', createdBy: admin._id, isActive: true });
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

describe('admin console — analytics', () => {
  it('computes KPIs from controlled fixtures, excluding demo data by default', async () => {
    const r = await request(app).get(`/api/v1/admin-console/analytics?from=${from}&to=${to}`).set(auth('admin'));
    expect(r.status).toBe(200);
    const a = r.body.data;
    expect(a.period).toMatchObject({ from, to, days: 10, group: 'day', timezone: 'Africa/Tunis' });
    expect(a.kpis.confirmedReservations).toEqual({ value: 2, previous: 1, changePct: 100 });
    expect(a.kpis.bookingValue).toMatchObject({ value: 900, previous: 500, changePct: 80, currency: 'TND' });
    expect(a.kpis.pendingReservations).toMatchObject({ value: 1, overdue: 1 }); // expires within the 12 h window
    expect(a.kpis.activeGuesthouses).toEqual({ value: 2, total: 2 });
    expect(a.kpis.activeOwners).toEqual({ value: 1 }); // the owner without a maison is not active
    // Inventory: A = 1 unit × 10 = 10; B = 2 rooms × 10 = 20 − 10 blocked = 10 → 20. Booked 3 + 2 = 5 → 25 %.
    expect(a.kpis.occupancy).toMatchObject({ rate: 25, bookedNights: 5, bookableNights: 20, blockedNights: 10 });
    expect(a.excludedDemoReservations).toBe(1);
  });

  it('builds series, status breakdown, top maisons and governorates that add up to the KPIs', async () => {
    const a = (await request(app).get(`/api/v1/admin-console/analytics?from=${from}&to=${to}`).set(auth('admin'))).body.data;
    expect(a.series).toHaveLength(10);
    expect(a.series.reduce((s: number, x: any) => s + x.confirmed, 0)).toBe(2);
    expect(a.series.reduce((s: number, x: any) => s + x.value, 0)).toBe(900);
    expect(a.series.reduce((s: number, x: any) => s + x.pending, 0)).toBe(1);
    expect(a.series.reduce((s: number, x: any) => s + x.cancelled, 0)).toBe(1);
    const byStatus = Object.fromEntries(a.statusBreakdown.map((s: any) => [s.status, s.count]));
    expect(byStatus).toEqual({ pending: 1, confirmed: 2, cancelled: 1 });
    expect(a.topProperties.map((p: any) => [p.name, p.bookings, p.value])).toEqual([['Dar Nabeul', 1, 600], ['Dar Tunis', 1, 300]]);
    expect(a.topProperties[0].occupancy).toBe(30); // 3 / 10
    expect(a.topProperties[1].occupancy).toBe(20); // 2 / 10 (room 2 blocked)
    const gov = Object.fromEntries(a.governorates.map((g: any) => [g.name, [g.bookings, g.value, g.properties]]));
    expect(gov).toEqual({ Nabeul: [1, 600, 1], Tunis: [1, 300, 1] });
    expect(a.insights).toMatchObject({ averageBookingValue: 450, averageStayNights: 2.5 });
    expect(a.insights.cancellationRate).toBeCloseTo(33.3, 1); // 1 cancelled of 3 decided
  });

  it('includes demo data only on request and never invents a comparison without previous data', async () => {
    const withDemo = (await request(app).get(`/api/v1/admin-console/analytics?from=${from}&to=${to}&demo=1`).set(auth('admin'))).body.data;
    expect(withDemo.kpis.confirmedReservations.value).toBe(3);
    expect(withDemo.kpis.bookingValue.value).toBe(1899);
    const far = (await request(app).get('/api/v1/admin-console/analytics?from=2020-01-01&to=2020-01-31').set(auth('admin'))).body.data;
    expect(far.kpis.confirmedReservations).toEqual({ value: 0, previous: 0, changePct: null });
    expect(far.kpis.bookingValue.changePct).toBeNull();
  });

  it('groups by week / month', async () => {
    const a = (await request(app).get(`/api/v1/admin-console/analytics?from=${from}&to=${to}&group=week`).set(auth('admin'))).body.data;
    expect(a.period.group).toBe('week');
    expect(a.series.length).toBeGreaterThanOrEqual(2);
    expect(a.series.reduce((s: number, x: any) => s + x.value, 0)).toBe(900);
  });
});

describe('admin console — reservations, customers, applications', () => {
  it('filters, paginates and exports reservations (CSV formula injection neutralised)', async () => {
    const all = (await request(app).get('/api/v1/admin-console/reservations?limit=5').set(auth('admin'))).body.data;
    expect(all.total).toBe(5); // demo excluded
    expect(all.rows).toHaveLength(5);
    expect(all.rows[0].owner).toMatchObject({ name: 'Hôte Nabeul' });
    const pending = (await request(app).get('/api/v1/admin-console/reservations?status=pending').set(auth('admin'))).body.data;
    expect(pending.rows.map((r: any) => r.reference)).toEqual(['EX-T-2']);
    const venue = (await request(app).get(`/api/v1/admin-console/reservations?venueId=${ids.B}`).set(auth('admin'))).body.data;
    expect(venue.total).toBe(2);
    const search = (await request(app).get('/api/v1/admin-console/reservations?q=EX-T-3').set(auth('admin'))).body.data;
    expect(search.rows).toHaveLength(1);
    const checkIn = (await request(app).get(`/api/v1/admin-console/reservations?dateField=checkIn&from=${day(from, 1)}&to=${day(from, 2)}`).set(auth('admin'))).body.data;
    expect(checkIn.rows.map((r: any) => r.reference).sort()).toEqual(['EX-T-1', 'EX-T-3']);
    const csv = await request(app).get('/api/v1/admin-console/reservations?format=csv').set(auth('admin'));
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('"Référence"');
    expect(csv.text).toContain(`"'=HYPERLINK(""x"") Client"`);
  });

  it('lists customers with real booking counts and value', async () => {
    const c = (await request(app).get('/api/v1/admin-console/customers').set(auth('admin'))).body.data;
    expect(c.rows).toHaveLength(1);
    // all 6 fixtures belong to the customer; confirmed value = 600 + 300 + 999 (demo) + 500 = 2399
    expect(c.rows[0]).toMatchObject({ fullName: 'Leila Client', bookings: 6, confirmedValue: 2399 });
    const detail = (await request(app).get(`/api/v1/admin-console/customers/${ids.customer}`).set(auth('admin'))).body.data;
    expect(detail.reservations).toHaveLength(6);
  });

  it('approves an application into an invited owner + UNPUBLISHED draft, exactly once', async () => {
    const app1 = await M.PartnerApplication.create({ establishmentName: 'Dar Jasmin', contactName: 'Sami', email: 'sami@example.com', phone: '22123456', city: 'Sousse' });
    const ok = await request(app)
      .post(`/api/v1/admin-console/applications/${app1._id}/approve`)
      .set(auth('admin'))
      .send({ ownerFullName: 'Sami Ben', ownerEmail: 'sami@example.com', venueName: 'Dar Jasmin', governorate: 'Sousse', sendInvite: false });
    expect(ok.status).toBe(201);
    expect(ok.body.data.setupLink).toMatch(/^https?:\/\//);
    const venue = await M.Venue.findById(ok.body.data.venueId).lean();
    expect(venue).toMatchObject({ type: 'MAISON_DHOTE', isPublished: false, approvalStatus: 'draft', bookingEnabled: false });
    expect(String(venue.ownerId)).toBe(ok.body.data.ownerId);
    const again = await request(app).post(`/api/v1/admin-console/applications/${app1._id}/approve`).set(auth('admin')).send({ ownerFullName: 'Sami Ben', ownerEmail: 'sami@example.com', venueName: 'Dar Jasmin' });
    expect(again.status).toBe(409);
    // The draft is not counted as an active maison.
    const a = (await request(app).get(`/api/v1/admin-console/analytics?from=${from}&to=${to}`).set(auth('admin'))).body.data;
    expect(a.kpis.activeGuesthouses.value).toBe(2);

    const app2 = await M.PartnerApplication.create({ establishmentName: 'Hors cible', contactName: 'X', email: 'x@example.com', phone: '22123457', city: 'Tunis' });
    const rej = await request(app).post(`/api/v1/admin-console/applications/${app2._id}/reject`).set(auth('admin')).send({ note: 'Hors périmètre' });
    expect(rej.status).toBe(200);
    expect((await request(app).post(`/api/v1/admin-console/applications/${app2._id}/reject`).set(auth('admin')).send({})).status).toBe(409);
    // An existing non-owner account is never converted.
    const app3 = await M.PartnerApplication.create({ establishmentName: 'Dar Client', contactName: 'Leila', email: 'leila@example.com', phone: '22123458', city: 'Tunis' });
    const conflict = await request(app).post(`/api/v1/admin-console/applications/${app3._id}/approve`).set(auth('admin')).send({ ownerFullName: 'Leila', ownerEmail: 'leila@example.com', venueName: 'Dar Client' });
    expect(conflict.status).toBe(409);
  });

  it('creates a draft maison and refuses to publish it until the essentials are filled', async () => {
    const c = await request(app).post('/api/v1/admin-console/guesthouses').set(auth('admin')).send({ name: 'Dar Essai', city: 'Tozeur', governorate: 'Tozeur', rentalMode: 'entire' });
    expect(c.status).toBe(201);
    const id = c.body.data.id;
    const list = (await request(app).get('/api/v1/admin-console/guesthouses').set(auth('admin'))).body.data;
    const row = list.find((g: any) => g.id === id);
    expect(row).toMatchObject({ publicState: 'draft', tour: 'none' });
    expect(row.missing).toEqual(expect.arrayContaining(['photo de couverture', 'localisation', 'description', 'adresse']));
    const refused = await request(app).patch(`/api/v1/admin-bookings/properties/${id}/settings`).set(auth('admin')).send({ isPublished: true, approvalStatus: 'approved' });
    expect(refused.status).toBe(422);
    expect(refused.body.message ?? refused.body.error).toMatch(/description|adresse|couverture|localisation/);
    const filled = await request(app).patch(`/api/v1/admin-bookings/properties/${id}/settings`).set(auth('admin')).send({
      description: 'Maison traditionnelle au cœur de l’oasis.', address: 'Route de l’oasis', coverImage: 'https://res.cloudinary.com/x/cover.jpg',
      gallery: ['https://res.cloudinary.com/x/1.jpg'], galleryMeta: [{ url: 'https://res.cloudinary.com/x/1.jpg', alt: 'Patio' }],
      coordinates: { lat: 33.92, lng: 8.13 }, isPublished: true, approvalStatus: 'approved',
    });
    expect(filled.status).toBe(200);
    const slugTaken = await request(app).patch(`/api/v1/admin-bookings/properties/${id}/settings`).set(auth('admin')).send({ slug: 'dar-nabeul' });
    expect(slugTaken.status).toBe(409);
    const badUrl = await request(app).patch(`/api/v1/admin-bookings/properties/${id}/settings`).set(auth('admin')).send({ gallery: ['javascript:alert(1)'] });
    expect(badUrl.status).toBe(422);
  });

  it('never deletes a room that still has an upcoming stay', async () => {
    await M.Reservation.collection.insertOne({
      userId: ids.customer, venueId: ids.B, bookingType: 'ROOM', status: 'confirmed', paymentStatus: 'unpaid', totalPrice: 300,
      startAt: stay(day(to, 10)), endAt: stay(day(to, 12)), unitScope: 'room', roomIds: [ids.r2], reservationCode: 'EX-T-9', confirmationCode: 'C-EX-T-9', createdAt: new Date(), updatedAt: new Date(),
    });
    const r = await request(app).delete(`/api/v1/owner/rooms/${ids.r2}`).set(auth('admin'));
    expect(r.status).toBe(409);
    expect(await M.Room.exists({ _id: ids.r2 })).toBeTruthy();
  });

  it('refuses owners and anonymous callers', async () => {
    expect((await request(app).get('/api/v1/admin-console/analytics').set(auth('owner'))).status).toBe(403);
    expect((await request(app).get('/api/v1/admin-console/reservations')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin-console/customers').set(auth('owner'))).status).toBe(403);
  });
});
