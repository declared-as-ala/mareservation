/**
 * Serialises booking critical sections (availability check + write) per unit.
 *
 * Why: "check for a conflict, then insert" is a race — two guests booking the
 * same room at the same instant can both pass the check. Two layers fix it:
 *
 *  1. In-process keyed mutex  — callers for the same key run one at a time
 *     (also protects standalone MongoDB, which has no transactions).
 *  2. MongoDB transaction that first writes a per-key lock document. Two
 *     concurrent transactions touching the same lock doc conflict, so the loser
 *     is retried by `withTransaction` and then sees the winner's data — this
 *     holds across multiple Node instances.
 *
 * `fn` must only do DB work through the provided `session` (it may be re-run
 * on transient transaction errors) and must not send emails/payments.
 */
import mongoose, { Schema, type ClientSession } from 'mongoose';
import { logger } from '../config/logger';

const BookingLockSchema = new Schema(
  { _id: { type: String }, v: { type: Number, default: 0 } },
  { collection: 'bookinglocks', versionKey: false }
);
const BookingLock = mongoose.models.BookingLock || mongoose.model('BookingLock', BookingLockSchema);

const tails = new Map<string, Promise<void>>();

/** Run `fn` after every earlier call with the same key has finished. */
export async function runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = prev.then(() => gate);
  tails.set(key, tail);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
}

let transactionsSupported = true;

function isTransactionUnsupported(err: unknown): boolean {
  const e = err as { code?: number; message?: string } | undefined;
  return (
    e?.code === 20 ||
    /Transaction numbers are only allowed on a replica set|replica set member or mongos|does not support transactions/i.test(
      e?.message ?? ''
    )
  );
}

export async function withBookingLock<T>(
  key: string,
  fn: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  return runExclusive(key, async () => {
    if (!transactionsSupported) return fn(undefined);
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        await BookingLock.updateOne({ _id: key }, { $inc: { v: 1 } }, { upsert: true, session });
        result = await fn(session);
      });
      return result;
    } catch (err) {
      if (isTransactionUnsupported(err)) {
        transactionsSupported = false;
        logger.warn('MongoDB transactions unavailable — falling back to in-process booking lock only');
        return fn(undefined);
      }
      throw err;
    } finally {
      await session.endSession();
    }
  });
}
