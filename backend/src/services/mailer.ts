/**
 * Provider-independent SMTP transport for transactional e-mail.
 *
 *   SMTP_HOST, SMTP_PORT (465), SMTP_SECURE (true = implicit TLS), SMTP_USER, SMTP_PASSWORD,
 *   SMTP_FROM ("Exploria360 <reservations@exploria360.com>"), ADMIN_NOTIFICATION_EMAIL, APP_BASE_URL
 *
 * Legacy EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASS / EMAIL_FROM are honoured as fallbacks.
 * Credentials are read from the environment only and are never logged or returned by any API.
 */
import nodemailer, { type Transporter } from 'nodemailer';

export interface MailerConfig {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  hasPassword: boolean;
  from?: string;
  adminEmail?: string;
  appBaseUrl: string;
  supportEmail?: string;
}

const env = (k: string) => (process.env[k] ?? '').trim() || undefined;

export function mailerConfig(): MailerConfig {
  const port = Number(env('SMTP_PORT') ?? env('EMAIL_PORT') ?? 465);
  const secureRaw = env('SMTP_SECURE');
  const fromAddr = env('SMTP_FROM') ?? env('EMAIL_FROM');
  return {
    host: env('SMTP_HOST') ?? env('EMAIL_HOST'),
    port,
    secure: secureRaw ? secureRaw === 'true' : port === 465,
    user: env('SMTP_USER') ?? env('EMAIL_USER'),
    hasPassword: !!(env('SMTP_PASSWORD') ?? env('EMAIL_PASS')),
    from: fromAddr ? (fromAddr.includes('<') ? fromAddr : `Exploria360 <${fromAddr}>`) : undefined,
    adminEmail: env('ADMIN_NOTIFICATION_EMAIL'),
    appBaseUrl: (env('APP_BASE_URL') ?? env('FRONTEND_URL') ?? 'https://www.exploria360.com').replace(/\/+$/, ''),
    supportEmail: env('SUPPORT_EMAIL') ?? env('ADMIN_NOTIFICATION_EMAIL'),
  };
}

export function isMailerConfigured(c: MailerConfig = mailerConfig()): boolean {
  return !!(c.host && c.user && c.hasPassword && c.from);
}

let cached: { key: string; transport: Transporter } | null = null;
let testTransport: Transporter | null = null;

/** Tests inject a fake transport (e.g. one that fails N times). */
export function setTestTransport(t: Transporter | null): void {
  testTransport = t;
}

function transport(): Transporter | null {
  if (testTransport) return testTransport;
  const c = mailerConfig();
  if (!isMailerConfigured(c)) return null;
  const key = `${c.host}|${c.port}|${c.secure}|${c.user}`;
  if (cached?.key === key) return cached.transport;
  const t = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: (env('SMTP_PASSWORD') ?? env('EMAIL_PASS'))!.replace(/\s+/g, '') },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    tls: { minVersion: 'TLSv1.2' },
  });
  cached = { key, transport: t };
  return t;
}

export class MailerNotConfiguredError extends Error {
  constructor() {
    super('SMTP_NOT_CONFIGURED');
  }
}

/** Sends now. Throws on any failure (the outbox decides about retries). */
export async function sendMailNow(msg: { to: string; subject: string; html: string; text: string }): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
  const t = transport();
  if (!t) throw new MailerNotConfiguredError();
  const c = mailerConfig();
  const info = await t.sendMail({ from: c.from ?? 'Exploria360 <no-reply@exploria360.com>', to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
  const accepted = (info.accepted ?? []).map(String);
  const rejected = (info.rejected ?? []).map(String);
  if (!accepted.length) throw new Error(`Recipient rejected by SMTP server (${rejected.join(', ') || 'unknown'})`);
  return { messageId: String(info.messageId ?? ''), accepted, rejected };
}

/** Status for the admin page: never returns secrets. */
export async function mailerStatus(verify = false) {
  const c = mailerConfig();
  const configured = isMailerConfigured(c);
  const maskedUser = c.user ? c.user.replace(/^(.{2}).*(@.*)$/, '$1***$2') : undefined;
  const fromDomain = c.from?.match(/@([^>\s]+)/)?.[1];
  const userDomain = c.user?.split('@')[1];
  const result: Record<string, unknown> = {
    configured,
    host: c.host ?? null,
    port: c.port,
    secure: c.secure,
    user: maskedUser ?? null,
    from: c.from ?? null,
    adminNotificationEmail: c.adminEmail ? c.adminEmail.replace(/^(.{2}).*(@.*)$/, '$1***$2') : null,
    appBaseUrl: c.appBaseUrl,
    senderDomainMatchesBrand: fromDomain ? /exploria360\.com$/i.test(fromDomain) : false,
    senderMatchesMailbox: !!(fromDomain && userDomain && fromDomain.toLowerCase() === userDomain.toLowerCase()),
  };
  if (verify && configured) {
    try {
      await transport()!.verify();
      result.verified = true;
    } catch (err) {
      result.verified = false;
      result.verifyError = (err instanceof Error ? err.message : String(err)).slice(0, 300);
    }
  }
  return result;
}
