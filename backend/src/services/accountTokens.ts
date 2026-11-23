/**
 * One-time password setup / reset links. Only a SHA-256 hash of the token is stored; the token
 * itself exists only in the link handed to the account holder. Issuing a link never changes the
 * current password: it changes only when the holder uses the link.
 */
import crypto from 'crypto';
import type { Types } from 'mongoose';
import { PasswordReset } from '../models/PasswordReset';
import { mailerConfig } from './mailer';

export const hashResetToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

export async function issuePasswordLink(userId: Types.ObjectId | string, ttlHours = 2): Promise<{ token: string; url: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000);
  // Older unused links for this user stop working.
  await PasswordReset.updateMany({ userId, used: false }, { $set: { used: true } });
  await PasswordReset.create({ userId, tokenHash: hashResetToken(token), expiresAt, used: false });
  return { token, url: `${mailerConfig().appBaseUrl}/reset-password?token=${token}`, expiresAt };
}

/** Atomically consumes a valid token; returns the user id or null. */
export async function consumePasswordToken(token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await PasswordReset.findOneAndUpdate(
    { tokenHash: hashResetToken(token), used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true } },
    { new: true }
  ).lean();
  return row ? String(row.userId) : null;
}
