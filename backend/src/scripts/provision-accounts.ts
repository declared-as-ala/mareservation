/**
 * Idempotent account provisioning for demonstrations.
 *
 *   npx tsx src/scripts/provision-accounts.ts --dry-run --allow-remote
 *   npx tsx src/scripts/provision-accounts.ts --yes --allow-remote \
 *        --admin-email=<existing super admin e-mail> [--owner-email=demo.proprietaire@exploria360.com] [--out=/path/file]
 *
 * What it does (and never does):
 *  - SUPER ADMIN: uses the EXISTING admin account given by --admin-email (it never creates a second admin when
 *    one exists, never changes a password). It issues a one-time password-setup link (24 h) that only takes
 *    effect if used. If no admin exists at all, it creates one with an unusable random password + a setup link.
 *  - DEMO OWNER: reuses the owner already assigned to the demo maison; otherwise finds/creates the account
 *    --owner-email (role ESTABLISHMENT_OWNER, unusable random password) and assigns ONLY the demo maison to it.
 *  - DEMO BOOKINGS: if the demo maison has no booking profile yet, gives it a clearly-labelled demonstration
 *    profile (entire house, demo price) and opens DEMO bookings (flagged isDemo, never commercial).
 *  - Links are written ONLY to --out (created with mode 600), never printed, never logged.
 *  - Never deletes anything.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Venue } from '../models/Venue';
import { DEMO_SLUG } from '../utils/demoMaison';
import { issuePasswordLink } from '../services/accountTokens';

dotenv.config();

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const dryRun = flag('dry-run');
const mask = (e?: string) => (e ? e.replace(/^(.{2}).*(@.*)$/, '$1***$2') : '(none)');

/** Demonstration booking profile — explicitly fictional, shown with "DÉMO" labels everywhere. */
const DEMO_BOOKING_PROFILE = {
  rentalMode: 'entire',
  entirePricePerNight: 250,
  maxGuests: 6,
  minimumNights: 1,
  cleaningFee: 0,
  serviceFee: 0,
  bookingMode: 'request',
  bookingEnabled: true,
  cancellationPolicy: 'flexible',
};

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');
  const remote = !/^mongodb:\/\/(localhost|127\.0\.0\.1|mongo)/.test(uri);
  if (remote && !flag('allow-remote')) throw new Error('Remote database: re-run with --allow-remote (after a verified backup).');
  if (!dryRun && !flag('yes')) throw new Error('Refusing to write without --yes. Use --dry-run to preview.');
  const out = opt('out') ?? '/tmp/exploria360-provisioning.txt';

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const lines: string[] = [`# Exploria360 — provisioning ${new Date().toISOString()}`, '# One-time links. Do not commit, do not share publicly. Delete after use.', ''];
  try {
    /* ── super admin ── */
    const admins = await User.find({ role: 'ADMIN' }).select('email fullName isActive').lean();
    console.log(`Admins found: ${admins.length} → ${admins.map((a: any) => mask(a.email)).join(', ') || '-'}`);
    const wantedAdmin = opt('admin-email')?.toLowerCase();
    let admin: any = wantedAdmin ? admins.find((a: any) => a.email === wantedAdmin) : admins.length === 1 ? admins[0] : null;
    if (!admin && admins.length === 0) {
      const email = wantedAdmin ?? 'admin@exploria360.com';
      console.log(`No admin exists → will create ${mask(email)} (unusable random password + setup link).`);
      if (!dryRun) {
        admin = await User.create({ fullName: 'Super Admin Exploria360', email, role: 'ADMIN', isActive: true, emailVerified: true, passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12) });
      }
    }
    if (!admin && admins.length > 0) throw new Error('Several admins exist: pass --admin-email=<the one you administer>.');
    if (admin) {
      console.log(`Super admin: ${mask(admin.email)} (existing password untouched)`);
      if (!dryRun) {
        const link = await issuePasswordLink(admin._id, 24);
        lines.push('SUPER ADMIN', `  login:        https://www.exploria360.com/login`, `  email:        ${admin.email}`, `  set password: ${link.url}`, `  link expires: ${link.expiresAt.toISOString()}`, '');
      }
    }

    /* ── demo owner ── */
    const demo: any = await Venue.findOne({ slug: DEMO_SLUG }).lean();
    if (!demo) throw new Error(`Demo maison (${DEMO_SLUG}) not found — run seed-demo-maison first.`);
    let owner: any = demo.ownerId ? await User.findById(demo.ownerId).lean() : null;
    if (owner) console.log(`Demo maison already has an owner: ${mask(owner.email)} → kept.`);
    else {
      const email = (opt('owner-email') ?? 'demo.proprietaire@exploria360.com').toLowerCase();
      owner = await User.findOne({ email }).lean();
      if (owner && owner.role !== 'ESTABLISHMENT_OWNER') throw new Error(`${mask(email)} exists but is not an owner account — refusing to change its role.`);
      console.log(owner ? `Owner ${mask(email)} exists → will be assigned to the demo.` : `Will create owner ${mask(email)} and assign the demo.`);
      if (!dryRun) {
        if (!owner) {
          owner = await User.create({ fullName: 'Propriétaire Démo', email, role: 'ESTABLISHMENT_OWNER', serviceDomains: ['HOTEL'], isActive: true, emailVerified: true, passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12) });
        } else if (!(owner.serviceDomains ?? []).includes('HOTEL')) {
          await User.updateOne({ _id: owner._id }, { $addToSet: { serviceDomains: 'HOTEL' } });
        }
        await Venue.updateOne({ _id: demo._id, $or: [{ ownerId: null }, { ownerId: { $exists: false } }] }, { $set: { ownerId: owner._id } });
      }
    }
    if (owner && !dryRun) {
      const link = await issuePasswordLink(owner._id, 72);
      lines.push('DEMO GUESTHOUSE OWNER', `  login:        https://www.exploria360.com/login`, `  email:        ${owner.email}`, `  property:     ${demo.name}`, `  set password: ${link.url}`, `  link expires: ${link.expiresAt.toISOString()}`, '');
    }

    /* ── demo booking profile ── */
    if (!demo.rentalMode) {
      console.log('Demo maison has no booking profile → will set the demonstration profile (entire house, DEMO bookings open).');
      if (!dryRun) await Venue.updateOne({ _id: demo._id, rentalMode: { $exists: false } }, { $set: DEMO_BOOKING_PROFILE });
    } else console.log(`Demo booking profile already set (rentalMode=${demo.rentalMode}, bookingEnabled=${demo.bookingEnabled}) → kept.`);

    if (!dryRun) {
      fs.writeFileSync(out, lines.join('\n') + '\n', { mode: 0o600 });
      console.log(`Links written to ${out} (mode 600). They are not printed here.`);
    } else console.log('Dry run: nothing written.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('provision-accounts failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
