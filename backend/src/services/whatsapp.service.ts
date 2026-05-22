import { getEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

let twilioClient: import('twilio').Twilio | null = null;
let twilioFrom: string | null = null;
let twilioConfigured = false;

function getTwilioClient() {
  if (twilioConfigured) return twilioClient;
  twilioConfigured = true;

  const env = getEnv();
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    logger.debug('Twilio WhatsApp not configured — TWILIO_ACCOUNT_SID/AUTH_TOKEN/WHATSAPP_FROM missing');
    return null;
  }

  try {
    // Dynamic import to avoid hard crash when twilio is not yet installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio') as (sid: string, token: string) => import('twilio').Twilio;
    twilioClient = twilio(sid, token);
    twilioFrom = from;
    return twilioClient;
  } catch (err) {
    logger.error('Failed to initialise Twilio client', err);
    return null;
  }
}

export interface WhatsAppMessage {
  to: string;      // E.164 phone number, e.g. +21612345678  (whatsapp: prefix added automatically)
  body: string;
}

/**
 * Send a WhatsApp message via Twilio.
 * Fire-and-forget safe: returns false (never throws) if Twilio is not configured or the send fails.
 */
export async function sendWhatsApp({ to, body }: WhatsAppMessage): Promise<boolean> {
  const client = getTwilioClient();
  if (!client || !twilioFrom) return false;

  // Normalise the `to` number — add whatsapp: prefix if not present
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  try {
    await client.messages.create({
      from: twilioFrom,
      to: toFormatted,
      body,
    });
    logger.info('WhatsApp sent', { to: toFormatted });
    return true;
  } catch (err) {
    logger.error('WhatsApp send failed', err, { to: toFormatted });
    return false;
  }
}
