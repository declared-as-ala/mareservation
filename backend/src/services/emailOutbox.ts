/**
 * Transactional e-mail outbox.
 *
 *  - enqueueEmail() is idempotent: the unique `key` (e.g. `<reservationId>:request_received:customer`)
 *    means a retried HTTP request or a re-run job never produces a second e-mail.
 *  - processOutbox() claims rows atomically (safe with several API instances), sends them, and
 *    reschedules failures with exponential back-off; after maxAttempts a row is marked `failed`
 *    and stays visible to the super admin, who can retry it.
 *  - A delivery failure never modifies the reservation it belongs to.
 */
import type { Types } from 'mongoose';
import { EmailOutbox, type IEmailOutbox } from '../models/EmailOutbox';
import { MailerNotConfiguredError, sendMailNow } from './mailer';
import { logger } from '../config/logger';

const BACKOFF_MIN = [1, 5, 15, 60, 240, 720];
const STALE_SENDING_MS = 10 * 60 * 1000;

export interface EnqueueInput {
  key: string;
  event: string;
  to: string;
  recipientRole: IEmailOutbox['recipientRole'];
  subject: string;
  html: string;
  text: string;
  reservationId?: Types.ObjectId | string;
  isDemo?: boolean;
}

export async function enqueueEmail(input: EnqueueInput): Promise<{ queued: boolean }> {
  try {
    const res = await EmailOutbox.updateOne(
      { key: input.key },
      { $setOnInsert: { ...input, status: 'queued', attempts: 0, nextAttemptAt: new Date() } },
      { upsert: true }
    );
    return { queued: res.upsertedCount > 0 };
  } catch (err: any) {
    if (err?.code === 11000) return { queued: false }; // concurrent duplicate — already queued
    throw err;
  }
}

let kickScheduled = false;
/** Process soon (after the current request finished), without blocking the caller. */
export function kickOutbox(): void {
  if (kickScheduled || process.env.EMAIL_OUTBOX_AUTOKICK === 'false') return;
  kickScheduled = true;
  setTimeout(() => {
    kickScheduled = false;
    processOutbox().catch((err) => logger.warn('email outbox kick failed', { error: String(err) }));
  }, 250).unref?.();
}

async function claimNext(now: Date): Promise<IEmailOutbox | null> {
  return EmailOutbox.findOneAndUpdate(
    { status: 'queued', nextAttemptAt: { $lte: now } },
    { $set: { status: 'sending', updatedAt: now }, $inc: { attempts: 1 } },
    { sort: { nextAttemptAt: 1 }, new: true }
  );
}

export async function deliverOne(row: IEmailOutbox): Promise<'sent' | 'retry' | 'failed'> {
  try {
    const info = await sendMailNow({ to: row.to, subject: row.subject, html: row.html, text: row.text });
    await EmailOutbox.updateOne({ _id: row._id }, { $set: { status: 'sent', sentAt: new Date(), messageId: info.messageId, lastError: undefined } });
    logger.info('email sent', { event: row.event, role: row.recipientRole, outboxId: String(row._id) });
    return 'sent';
  } catch (err) {
    const notConfigured = err instanceof MailerNotConfiguredError;
    const message = notConfigured ? 'SMTP non configuré' : (err instanceof Error ? err.message : String(err)).slice(0, 900);
    const exhausted = row.attempts >= row.maxAttempts;
    const delayMin = BACKOFF_MIN[Math.min(row.attempts - 1, BACKOFF_MIN.length - 1)];
    await EmailOutbox.updateOne(
      { _id: row._id },
      { $set: { status: exhausted ? 'failed' : 'queued', lastError: message, nextAttemptAt: new Date(Date.now() + delayMin * 60_000) } }
    );
    logger.warn('email delivery failed', { event: row.event, role: row.recipientRole, outboxId: String(row._id), attempt: row.attempts, exhausted, error: message });
    return exhausted ? 'failed' : 'retry';
  }
}

let running = false;
export async function processOutbox(limit = 25, now: Date = new Date()): Promise<{ sent: number; retry: number; failed: number }> {
  const stats = { sent: 0, retry: 0, failed: 0 };
  if (running) return stats;
  running = true;
  try {
    // Rows stuck in "sending" (process crashed mid-send) go back to the queue.
    await EmailOutbox.updateMany({ status: 'sending', updatedAt: { $lt: new Date(now.getTime() - STALE_SENDING_MS) } }, { $set: { status: 'queued' } });
    for (let i = 0; i < limit; i++) {
      const row = await claimNext(now);
      if (!row) break;
      stats[await deliverOne(row)] += 1;
    }
  } finally {
    running = false;
  }
  return stats;
}

/** Admin "retry": re-queue a failed (or queued) row immediately. */
export async function retryOutboxRow(id: string): Promise<boolean> {
  const res = await EmailOutbox.updateOne(
    { _id: id, status: { $in: ['failed', 'queued'] } },
    { $set: { status: 'queued', nextAttemptAt: new Date() }, $inc: { maxAttempts: 1 } }
  );
  if (res.modifiedCount) kickOutbox();
  return res.modifiedCount > 0;
}

let timer: NodeJS.Timeout | null = null;
export function startEmailOutboxLoop(intervalMs = 30_000): void {
  if (timer) return;
  timer = setInterval(() => {
    processOutbox().catch((err) => logger.warn('email outbox loop failed', { error: String(err) }));
  }, intervalMs);
  timer.unref?.();
}
