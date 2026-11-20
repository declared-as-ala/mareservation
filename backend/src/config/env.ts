import { z } from 'zod';

const PLACEHOLDER_SECRET = /your-super-secret|change-in-production|changeme|change-me|dev-jwt-secret|replace-me|example|secret-key/i;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  MONGODB_URI: z.string().min(1).optional().or(z.literal('')),
  MONGO_URI: z.string().optional(), // alias
  // Required in EVERY environment (no built-in fallback). Placeholders from templates are rejected.
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET is required — generate with: openssl rand -base64 64' })
    .min(32, 'JWT_SECRET must be at least 32 characters — generate with: openssl rand -base64 64')
    .refine((v) => !PLACEHOLDER_SECRET.test(v), 'JWT_SECRET looks like a placeholder — set a random value'),
  // Legacy/unused (refresh tokens are random values stored in the DB). Kept optional for old .env files.
  REFRESH_SECRET: z.string().optional(),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  CORS_ORIGIN: z.string().optional(),
  FRONTEND_URL: z.string().url().optional().or(z.literal('')),
  // Email (for verification + password reset)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional().or(z.literal('')),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional().transform((v) => (v ? Number(v) : undefined)),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  // Payment gateway (Konnect)
  KONNECT_API_KEY: z.string().optional(),
  KONNECT_SECRET_KEY: z.string().optional(),
  KONNECT_ENTITY_ID: z.string().optional(),
  // Upload / storage (optional for MVP)
  UPLOAD_MAX_FILE_SIZE_MB: z.string().default('50').transform(Number),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // OpenRouter (SOS assistant — lazy-read in route; omit in dev if unused)
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  OPENROUTER_SITE_URL: z.string().optional(),
  OPENROUTER_APP_TITLE: z.string().optional(),
  /** Comma/semicolon list for SOS Conseil submit notifications (optional; route has defaults). */
  SOS_CONSEIL_NOTIFICATION_EMAILS: z.string().optional(),
  // WhatsApp via Twilio (optional — notifications silently skipped if unset)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  /** Twilio WhatsApp sender, format: whatsapp:+1415XXXXXXX */
  TWILIO_WHATSAPP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  // Trim any trailing carriage returns, newlines, or whitespace from environment variables
  const cleanEnv: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    cleanEnv[key] = typeof value === 'string' ? value.trim() : value;
  }

  const raw = {
    ...cleanEnv,
    MONGODB_URI: cleanEnv.MONGODB_URI || cleanEnv.MONGO_URI || (cleanEnv.NODE_ENV === 'production' ? undefined : 'mongodb://localhost:27017/exploria360'),
  };
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.flatten().fieldErrors;
    console.error('❌ Invalid environment variables:', msg);
    if (cleanEnv.NODE_ENV === 'production') {
      throw new Error(`Invalid environment variables: ${JSON.stringify(msg)}`);
    }
  }
  return result.success ? result.data : envSchema.parse(raw);
}
