/**
 * Idempotent seed for the ONE demonstration maison d'hôtes.
 *
 *   npx tsx src/scripts/seed-demo-maison.ts --dry-run
 *   npx tsx src/scripts/seed-demo-maison.ts --yes                 (local database)
 *   npx tsx src/scripts/seed-demo-maison.ts --yes --allow-remote  (Atlas / non-local; take a backup first!)
 *
 * Safety:
 *  - touches ONLY the venue whose slug is the demo slug (upsert); never deletes or resets anything
 *  - re-running cannot create duplicates (slug is unique + upsert)
 *  - refuses to run without --yes, and refuses remote databases without --allow-remote
 *  - prints the target host/database (never credentials) and verifies afterwards that no other
 *    venue was added or removed
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Venue } from '../models/Venue';
import { DEMO_SLUG, upsertDemoMaison } from '../utils/demoMaison';

dotenv.config();

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const confirmed = args.has('--yes');
const allowRemote = args.has('--allow-remote');

function describeTarget(uri: string) {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:'));
    const db = decodeURIComponent(u.pathname.replace(/^\//, '')) || '(default)';
    return { host: u.host.replace(/^.*@/, ''), db, srv: uri.startsWith('mongodb+srv:') };
  } catch {
    return { host: '(unparseable)', db: '(unknown)', srv: false };
  }
}

function isLocal(host: string) {
  return /^(localhost|127\.0\.0\.1|\[::1\]|mongo|mongodb)(:\d+)?$/i.test(host);
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) is required.');

  const target = describeTarget(uri);
  const remote = target.srv || !isLocal(target.host.split(',')[0]);
  console.log(`Target database → host: ${target.host} | db: ${target.db} | remote: ${remote}`);

  if (remote && !allowRemote) {
    throw new Error('Refusing to run against a remote database without --allow-remote (take a verified backup first).');
  }
  if (!dryRun && !confirmed) {
    throw new Error('Refusing to write without --yes. Use --dry-run to preview.');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    const before = await Venue.estimatedDocumentCount();
    const existing = await Venue.findOne({ slug: DEMO_SLUG }).select('_id name isDemo').lean();
    console.log(`Venues before: ${before} | demo present: ${existing ? 'yes' : 'no'}`);

    if (dryRun) {
      console.log(existing ? 'DRY RUN → would UPDATE the demo venue only.' : 'DRY RUN → would INSERT the demo venue only.');
      return;
    }

    const result = await upsertDemoMaison(Venue);
    const after = await Venue.estimatedDocumentCount();
    const copies = await Venue.countDocuments({ slug: DEMO_SLUG });
    console.log(`Result: ${result.inserted ? 'inserted' : 'updated'} | venues after: ${after} | demo copies: ${copies}`);

    const expectedAfter = before + (result.inserted ? 1 : 0);
    if (copies !== 1 || after !== expectedAfter) {
      throw new Error(`Post-check failed (copies=${copies}, after=${after}, expected=${expectedAfter}).`);
    }
    console.log('Post-check OK: exactly one demo venue, no other venue added or removed.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('seed-demo-maison failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
