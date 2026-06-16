/**
 * One-off (idempotent) migration: re-type legacy CAFE_LOUNGE venues into the
 * precise nightlife types (BAR / ROOFTOP / BEACH_CLUB / CLUB / LOUNGE) so the
 * public Sorties categories and the admin type filters agree.
 *
 * A venue's new type is inferred from its name + description; anything
 * ambiguous defaults to LOUNGE. Only CAFE_LOUNGE venues are touched, so this is
 * safe to run repeatedly (e.g. on every deploy) — once converted they are no
 * longer CAFE_LOUNGE.
 *
 * Local:  npm run migrate:sortie-types
 * Deploy: docker compose exec -T backend npx tsx src/scripts/migrate-sortie-types.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Venue } from '../models/Venue';

function inferType(name: string, description: string): string {
  const hay = `${name} ${description}`.toLowerCase();
  if (hay.includes('rooftop')) return 'ROOFTOP';
  if (hay.includes('beach') || hay.includes('plage')) return 'BEACH_CLUB';
  if (hay.includes('club') || hay.includes('nightclub') || hay.includes('discothèque') || hay.includes('discotheque')) return 'CLUB';
  if (hay.includes('bar')) return 'BAR';
  if (hay.includes('lounge')) return 'LOUNGE';
  return 'LOUNGE';
}

async function run() {
  await connectDatabase();
  try {
    const legacy = await Venue.find({ type: 'CAFE_LOUNGE' }).select('_id name description type').lean();
    if (!legacy.length) {
      console.log('ℹ️  No legacy CAFE_LOUNGE venues — nothing to migrate.');
      return;
    }
    let migrated = 0;
    for (const v of legacy) {
      const newType = inferType((v as any).name ?? '', (v as any).description ?? '');
      await Venue.updateOne({ _id: (v as any)._id }, { $set: { type: newType } });
      migrated += 1;
      console.log(`✅ ${(v as any).name}: CAFE_LOUNGE → ${newType}`);
    }
    console.log(`🎯 Migrated ${migrated} CAFE_LOUNGE venue(s) to precise nightlife types.`);
  } finally {
    await mongoose.connection.close();
  }
}

run().catch((err) => {
  console.error('❌ Sortie-type migration failed:', err);
  mongoose.connection.close().finally(() => process.exit(1));
});
