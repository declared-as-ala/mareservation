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
const port = Number(process.env.PORT || 3001);

await mongoose.connect(process.env.MONGODB_URI);
const { Venue } = await import('../src/models/Venue');
const { upsertDemoMaison } = await import('../src/utils/demoMaison');
await Venue.init();
await upsertDemoMaison(Venue);

// Dev-only: `--bookable` adds a clearly labelled test maison with two rooms so the booking flow can be exercised.
if (process.argv.includes('--bookable')) {
  const { Room } = await import('../src/models/Room');
  const v = await Venue.create({
    name: '[DEV] Maison Test Réservable', slug: 'maison-test-dev', type: 'MAISON_DHOTE', city: 'Tunis', address: 'Adresse de test',
    description: 'DEV ONLY — fiche de test du moteur de réservation.', amenities: ['Wi-Fi'], isPublished: true,
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
