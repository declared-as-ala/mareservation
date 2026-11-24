/**
 * Safe local development API: an in-memory MongoDB (replica set, so transactions work)
 * seeded with the demo maison d'hôtes. Nothing is persisted and no remote database is
 * ever contacted.
 *
 *   npm run dev:memory
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-memory-stack-secret-0123456789-ABCDEFGHIJKLMNOP';
process.env.MONGODB_URI = replSet.getUri('exploria_dev');
process.env.MONGO_URI = process.env.MONGODB_URI;
process.env.PUBLIC_VENUE_SLUGS = process.env.PUBLIC_VENUE_SLUGS || 'maison-hotes-demo-exploria360';
// Local testing logs in repeatedly; production keeps the default of 5 attempts / 15 min.
process.env.LOGIN_RATE_LIMIT = process.env.LOGIN_RATE_LIMIT || '100';
const port = Number(process.env.PORT || 3001);

await mongoose.connect(process.env.MONGODB_URI);
const { Venue } = await import('../src/models/Venue');
const { upsertDemoMaison } = await import('../src/utils/demoMaison');
await Venue.init();
await upsertDemoMaison(Venue);
// Dev: open DEMO bookings on the demo maison (as the provisioning script does in production).
await Venue.updateOne({ slug: 'maison-hotes-demo-exploria360' }, { $set: { rentalMode: 'entire', entirePricePerNight: 250, maxGuests: 6, bookingEnabled: true, bookingMode: 'request' } });

// Dev-only: `--accounts` creates a local admin and the demo maison's owner with fresh random passwords.
// The credentials go ONLY to backend/.dev-accounts.local.txt (git-ignored, mode 600) — never to the console.
// The in-memory DB is discarded on exit, so the accounts (and passwords) change on every start.
if (process.argv.includes('--accounts')) {
  const crypto = await import('node:crypto');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const bcrypt = (await import('bcryptjs')).default;
  const { User } = await import('../src/models/User');
  const pw = () => `Dev-${crypto.randomBytes(6).toString('hex')}-Aa9!`;
  const accounts = [
    { label: 'ADMIN', fullName: 'Admin Dev', email: 'admin.dev@exploria360.test', role: 'ADMIN', password: pw() },
    { label: 'OWNER (Maison d\'Hôtes Démo)', fullName: 'Propriétaire Démo (dev)', email: 'owner.dev@exploria360.test', role: 'ESTABLISHMENT_OWNER', password: pw() },
  ];
  for (const a of accounts) {
    const user = await User.create({
      fullName: a.fullName, email: a.email, role: a.role, isActive: true, emailVerified: true,
      ...(a.role === 'ESTABLISHMENT_OWNER' ? { serviceDomains: ['HOTEL'] } : {}),
      passwordHash: await bcrypt.hash(a.password, 12),
    });
    if (a.role === 'ESTABLISHMENT_OWNER') await Venue.updateOne({ slug: 'maison-hotes-demo-exploria360' }, { $set: { ownerId: user._id } });
  }
  const file = path.resolve(import.meta.dirname, '../.dev-accounts.local.txt');
  const body = [
    '# Local in-memory dev accounts — regenerated on every `npm run dev:memory -- --accounts`.',
    '# Valid only against the local dev API (http://localhost:3001). Login: http://localhost:3000/login',
    '',
    ...accounts.flatMap((a) => [a.label, `  email:    ${a.email}`, `  password: ${a.password}`, '']),
  ].join('\n');
  fs.writeFileSync(file, body, { mode: 0o600 });
  console.log(`Dev accounts (admin + demo owner) written to ${file}`);
}

// Dev-only: `--bookable` adds a clearly labelled test maison with two rooms so the booking flow can be exercised.
if (process.argv.includes('--bookable')) {
  const { Room } = await import('../src/models/Room');
  const v = await Venue.create({
    name: '[DEV] Maison Test Réservable', slug: 'maison-test-dev', type: 'MAISON_DHOTE', city: 'Sidi Bou Saïd', governorate: 'Tunis', address: 'Adresse de test',
    description: 'DEV ONLY — fiche de test du moteur de réservation.', amenities: ['Wi-Fi'], isPublished: true, approvalStatus: 'approved',
    coordinates: { lat: 36.87, lng: 10.34 }, features: ['wifi', 'sea_view', 'breakfast'], cleaningFee: 30, maxGuests: 6, bedrooms: 2,
    coverImage: '/demo/maison-demo-cover.jpg', gallery: ['/demo/maison-demo-cover.jpg'],
  });
  await Room.create({ venueId: v._id, roomNumber: 1, name: 'Chambre Jasmin', roomType: 'double', capacity: 2, pricePerNight: 150 });
  await Room.create({ venueId: v._id, roomNumber: 2, name: 'Suite Olivier', roomType: 'suite', capacity: 4, pricePerNight: 260 });
  process.env.PUBLIC_VENUE_SLUGS = `${process.env.PUBLIC_VENUE_SLUGS},maison-test-dev`;
}

const app = (await import('../src/app')).default;
const server = app.listen(port, () => console.log(`Exploria360 dev API (in-memory DB, demo seeded) on http://localhost:${port}`));

const stop = async () => {
  server.close();
  await mongoose.disconnect();
  await replSet.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
