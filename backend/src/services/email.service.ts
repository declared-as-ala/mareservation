import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { getEnv } from '../config/env';
import { logger } from '../config/logger';

const env = getEnv();
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const smtpTransporter =
  env.EMAIL_HOST && env.EMAIL_PORT && env.EMAIL_USER && env.EMAIL_PASS
    ? nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: Number(env.EMAIL_PORT),
        secure: Number(env.EMAIL_PORT) === 465,
        auth: {
          user: env.EMAIL_USER,
          // Gmail app passwords are often copied with spaces.
          pass: env.EMAIL_PASS.replace(/\s+/g, ''),
        },
      })
    : null;

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  contentId?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

type EmailHealth = {
  emailFromConfigured: boolean;
  smtpConfigured: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUserMasked?: string;
  resendConfigured: boolean;
  smtpVerified?: boolean;
  smtpError?: string;
};

function maskEmail(email?: string): string | undefined {
  if (!email || !email.includes('@')) return undefined;
  const [name, domain] = email.split('@');
  if (!name || !domain) return undefined;
  const visible = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function getEmailHealth(): Promise<EmailHealth> {
  const health: EmailHealth = {
    emailFromConfigured: Boolean(env.EMAIL_FROM),
    smtpConfigured: Boolean(smtpTransporter),
    smtpHost: env.EMAIL_HOST,
    smtpPort: env.EMAIL_PORT ? Number(env.EMAIL_PORT) : undefined,
    smtpUserMasked: maskEmail(env.EMAIL_USER),
    resendConfigured: Boolean(resend),
  };

  if (smtpTransporter) {
    try {
      await smtpTransporter.verify();
      health.smtpVerified = true;
    } catch (error) {
      health.smtpVerified = false;
      health.smtpError = error instanceof Error ? error.message : String(error);
    }
  }

  return health;
}

export async function sendEmail({ to, subject, html, text, attachments }: EmailOptions): Promise<boolean> {
  logger.info('Email send attempt', {
    to,
    subject,
    transport: smtpTransporter ? 'smtp' : resend ? 'resend' : 'none',
  });

  if (!env.EMAIL_FROM) {
    logger.warn('EMAIL_FROM not configured. Skipping email send.');
    return false;
  }

  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: `Look and Book <${env.EMAIL_FROM}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        attachments: attachments?.map(({ contentId, ...attachment }) => ({
          ...attachment,
          cid: contentId,
        })),
      });
      logger.info(`Email sent via SMTP to ${to}: ${subject}`);
      return true;
    } catch (error) {
      logger.error(`SMTP send failed for ${to}`, error, {
        smtpHost: env.EMAIL_HOST,
        smtpPort: env.EMAIL_PORT ? Number(env.EMAIL_PORT) : undefined,
        smtpUserMasked: maskEmail(env.EMAIL_USER),
      });
    }
  }

  if (!resend) {
    logger.warn('Email send failed: SMTP unavailable/invalid and RESEND_API_KEY missing.');
    return false;
  }

  try {
    await resend.emails.send({
      from: `Look and Book <${env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      attachments,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error}`);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Password reset email template
export function createPasswordResetTemplate(
  userName: string,
  resetUrl: string,
  expiresIn: string = '1 heure'
): { subject: string; html: string; text: string } {
  const subject = 'Réinitialisation de votre mot de passe - Look and Book';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation du mot de passe</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td style="text-align: center; padding-bottom: 30px;">
            <div style="font-size:25px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #171717; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.08);">
            <h2 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">Réinitialisation du mot de passe</h2>
            <p style="color: #a3a3a3; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Bonjour ${userName},
            </p>
            <p style="color: #a3a3a3; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align: center; padding: 24px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24); color: #000000; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-weight: 600; font-size: 15px;">
                    Réinitialiser mon mot de passe
                  </a>
                </td>
              </tr>
            </table>
            <p style="color: #737373; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
              Ce lien expirera dans ${expiresIn}. Si vous n'avez pas demandé de réinitialisation, vous pouvez ignorer cet email en toute sécurité.
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; padding-top: 30px;">
            <p style="color: #525252; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Look and Book. Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Bonjour ${userName},

Nous avons reçu une demande de réinitialisation de votre mot de passe.

Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :
${resetUrl}

Ce lien expirera dans ${expiresIn}. Si vous n'avez pas demandé de réinitialisation, vous pouvez ignorer cet email en toute sécurité.

© ${new Date().getFullYear()} Look and Book. Tous droits réservés.
  `;

  return { subject, html, text };
}

// Email verification template
export function createEmailVerificationTemplate(
  userName: string,
  verificationUrl: string,
  expiresIn: string = '24 heures'
): { subject: string; html: string; text: string } {
  const subject = 'Vérifiez votre adresse email - Look and Book';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vérification de l'email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td style="text-align: center; padding-bottom: 30px;">
            <div style="font-size:25px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #171717; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.08);">
            <h2 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0 0 16px 0;">Vérifiez votre email</h2>
            <p style="color: #a3a3a3; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Bonjour ${userName},
            </p>
            <p style="color: #a3a3a3; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Merci de vous être inscrit sur Look and Book ! Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align: center; padding: 24px 0;">
                  <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24); color: #000000; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-weight: 600; font-size: 15px;">
                    Vérifier mon email
                  </a>
                </td>
              </tr>
            </table>
            <p style="color: #737373; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
              Ce lien expirera dans ${expiresIn}. Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; padding-top: 30px;">
            <p style="color: #525252; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Look and Book. Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Bonjour ${userName},

Merci de vous être inscrit sur Look and Book !

Pour vérifier votre adresse email, cliquez sur le lien suivant :
${verificationUrl}

Ce lien expirera dans ${expiresIn}. Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.

© ${new Date().getFullYear()} Look and Book. Tous droits réservés.
  `;

  return { subject, html, text };
}

// SOS Conseil admin notification template
export function createSOSConseilAdminTemplate(data: {
  fullName: string;
  phone: string;
  email?: string;
  occasionType: string;
  participantsCount: number;
  averageAgeRanges: string[];
  preferredRegion: string;
  preferredCategory: string;
  budgetRange?: string;
  ambianceTags?: string[];
  contactPreference?: 'whatsapp' | 'phone' | 'email';
  aiAssistSummary?: string;
  preferredDate?: string;
  preferredTime?: string;
  details?: string;
}): { subject: string; html: string; text: string } {
  const subject = `[SOS Conseil] ${data.fullName} • ${data.preferredRegion} • ${data.participantsCount} pers`;

  const formatBudget = (b: string) => {
    const map: Record<string, string> = {
      moins_100: 'Moins de 100 TND', '100_300': '100–300 TND',
      '300_600': '300–600 TND', '600_1000': '600–1 000 TND', plus_1000: 'Plus de 1 000 TND',
    };
    return map[b] || b;
  };

  const formatOccasion = (o: string) => {
    const map: Record<string, string> = {
      birthday: '🎂 Anniversaire', wedding_engagement: '💍 Mariage / Fiançailles',
      business_meeting: "💼 Réunion d'affaires", family_event: '👨‍👩‍👧 Événement familial',
      romantic_dinner: '🕯️ Dîner romantique', graduation: '🎓 Remise de diplôme',
      corporate: "🏢 Soirée d'entreprise", other: '✨ Autre',
    };
    return map[o] || o;
  };

  const formatCategory = (value: string) => {
    const map: Record<string, string> = {
      cafe: 'Café',
      restaurant: 'Restaurant',
      hotel: 'Hôtel',
      cinema: 'Cinéma',
      event_space: 'Espace événementiel',
      lounge: 'Lounge',
      rooftop: 'Rooftop',
    };
    return map[value] || value;
  };

  const formatContact = (cp?: string) =>
    ({
      whatsapp: 'WhatsApp',
      phone: 'Téléphone',
      email: 'Email',
    } as Record<string, string>)[cp || ''] || cp;

  const row = (label: string, value: string | undefined, accent = false) =>
    value ? `<tr><td style="padding:8px 0;border-bottom:1px solid #262626;color:#a3a3a3;font-size:13px;white-space:nowrap;padding-right:16px;width:1%">${label}</td><td style="padding:8px 0;border-bottom:1px solid #262626;color:${accent ? '#fbbf24' : '#ffffff'};font-size:13px;font-weight:600">${value}</td></tr>` : '';

  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Nouvelle demande SOS Conseil</title></head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
      <tr><td style="text-align:center;padding-bottom:24px;">
        <div style="font-size:22px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div>
        <p style="color:#525252;font-size:12px;margin:4px 0 0">Service Conciergerie</p>
      </td></tr>
      <tr><td style="background:#171717;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.08);">
        <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:999px;padding:6px 14px;margin-bottom:20px;">
          <span style="color:#fbbf24;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Nouvelle demande</span>
        </div>
        <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 20px">Demande de conseil — ${data.fullName}</h2>

        <p style="color:#a3a3a3;font-size:14px;margin:0 0 20px">Une nouvelle demande SOS Conseil vient d'être soumise. Voici les détails :</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #262626;">
          ${row('👤 Nom', data.fullName)}
          ${row('📞 Téléphone', data.phone, true)}
          ${row('📧 Email', data.email)}
          ${row('🎉 Occasion', formatOccasion(data.occasionType))}
          ${row('👥 Participants', String(data.participantsCount) + ' personnes')}
          ${row('📅 Tranches d\'âge', data.averageAgeRanges.map((r) => `${r} ans`).join(', '))}
          ${row('📍 Région', data.preferredRegion)}
          ${row('🏛️ Catégorie', formatCategory(data.preferredCategory))}
          ${data.ambianceTags?.length ? row('✨ Ambiance', data.ambianceTags.join(', '), true) : ''}
          ${data.contactPreference ? row('📱 Contact préféré', formatContact(data.contactPreference)) : ''}
          ${data.aiAssistSummary ? row('🤖 Synthèse assistant', data.aiAssistSummary) : ''}
          ${data.budgetRange ? row('💰 Budget', formatBudget(data.budgetRange), true) : ''}
          ${data.preferredDate ? row('📆 Date souhaitée', data.preferredDate) : ''}
          ${data.preferredTime ? row('⏰ Heure souhaitée', data.preferredTime) : ''}
        </table>

        ${data.details ? `
        <div style="margin-top:20px;background:#0a0a0a;border-radius:12px;padding:16px;border:1px solid #262626;">
          <p style="color:#737373;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px">Message</p>
          <p style="color:#d4d4d4;font-size:14px;line-height:1.6;margin:0">${data.details}</p>
        </div>` : ''}

        <div style="margin-top:24px;text-align:center;">
          <p style="color:#737373;font-size:13px;margin:0 0 16px">Contactez le client dans les plus brefs délais</p>
          ${data.phone ? `<a href="tel:${data.phone}" style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin:0 8px 8px">Appeler maintenant</a>` : ''}
          ${data.email ? `<a href="mailto:${data.email}" style="display:inline-block;background:transparent;color:#fbbf24;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;border:1px solid rgba(251,191,36,0.4);margin:0 8px 8px">Envoyer un email</a>` : ''}
        </div>
      </td></tr>
      <tr><td style="text-align:center;padding-top:24px;">
        <p style="color:#404040;font-size:11px;margin:0">© ${new Date().getFullYear()} Look and Book · Panneau d'administration</p>
      </td></tr>
    </table></body></html>
  `;

  const text = `
Nouvelle demande SOS Conseil — Look and Book

Client : ${data.fullName}
Téléphone : ${data.phone}
${data.email ? `Email : ${data.email}` : ''}
Occasion : ${formatOccasion(data.occasionType)}
Participants : ${data.participantsCount}
Tranches d'âge : ${data.averageAgeRanges.map((r) => `${r} ans`).join(', ')}
Région : ${data.preferredRegion}
Catégorie : ${formatCategory(data.preferredCategory)}
${data.ambianceTags?.length ? `Ambiance : ${data.ambianceTags.join(', ')}` : ''}
${data.contactPreference ? `Contact préféré : ${formatContact(data.contactPreference)}` : ''}
${data.aiAssistSummary ? `Synthèse assistant :\n${data.aiAssistSummary}` : ''}
${data.budgetRange ? `Budget : ${formatBudget(data.budgetRange)}` : ''}
${data.preferredDate ? `Date souhaitée : ${data.preferredDate}` : ''}
${data.preferredTime ? `Heure souhaitée : ${data.preferredTime}` : ''}
${data.details ? `Message : ${data.details}` : ''}
  `.trim();

  return { subject, html, text };
}

export function createPartnerApplicationAdminTemplate(data: {
  establishmentName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  message?: string;
  dashboardUrl?: string;
}): { subject: string; html: string; text: string } {
  const subject = `[Partenaire] ${data.establishmentName} • ${data.city}`;

  const row = (label: string, value: string | undefined, accent = false) =>
    value ? `<tr><td style="padding:8px 0;border-bottom:1px solid #262626;color:#a3a3a3;font-size:13px;white-space:nowrap;padding-right:16px;width:1%">${label}</td><td style="padding:8px 0;border-bottom:1px solid #262626;color:${accent ? '#fbbf24' : '#ffffff'};font-size:13px;font-weight:600">${value}</td></tr>` : '';

  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Nouvelle demande de partenariat</title></head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
      <tr><td style="text-align:center;padding-bottom:24px;">
        <div style="font-size:22px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div>
        <p style="color:#525252;font-size:12px;margin:4px 0 0">Demandes de partenariat</p>
      </td></tr>
      <tr><td style="background:#171717;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.08);">
        <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:999px;padding:6px 14px;margin-bottom:20px;">
          <span style="color:#fbbf24;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Nouveau partenaire</span>
        </div>
        <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 20px">${data.establishmentName}</h2>
        <p style="color:#a3a3a3;font-size:14px;margin:0 0 20px">Un établissement souhaite rejoindre la plateforme. Voici les détails :</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #262626;">
          ${row('🏬 Établissement', data.establishmentName, true)}
          ${row('👤 Contact', data.contactName)}
          ${row('📧 Email', data.email)}
          ${row('📞 Téléphone', data.phone, true)}
          ${row('📍 Ville', data.city)}
        </table>

        ${data.message ? `
        <div style="margin-top:20px;background:#0a0a0a;border-radius:12px;padding:16px;border:1px solid #262626;">
          <p style="color:#737373;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px">Message</p>
          <p style="color:#d4d4d4;font-size:14px;line-height:1.6;margin:0">${data.message}</p>
        </div>` : ''}

        <div style="margin-top:24px;text-align:center;">
          <p style="color:#737373;font-size:13px;margin:0 0 16px">Recontactez l'établissement et traitez la demande dans le tableau de bord.</p>
          ${data.dashboardUrl ? `<a href="${data.dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin:0 8px 8px">Voir dans le dashboard</a>` : ''}
          <a href="tel:${data.phone}" style="display:inline-block;background:transparent;color:#fbbf24;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;border:1px solid rgba(251,191,36,0.4);margin:0 8px 8px">Appeler</a>
        </div>
      </td></tr>
      <tr><td style="text-align:center;padding-top:24px;">
        <p style="color:#404040;font-size:11px;margin:0">© ${new Date().getFullYear()} Look and Book · Panneau d'administration</p>
      </td></tr>
    </table></body></html>
  `;

  const text = `
Nouvelle demande de partenariat — Look and Book

Établissement : ${data.establishmentName}
Contact : ${data.contactName}
Email : ${data.email}
Téléphone : ${data.phone}
Ville : ${data.city}
${data.message ? `Message : ${data.message}` : ''}
${data.dashboardUrl ? `Dashboard : ${data.dashboardUrl}` : ''}
  `.trim();

  return { subject, html, text };
}

// Reservation confirmation template
export function createReservationConfirmationTemplate(
  userName: string,
  reservationCode: string,
  venueName: string,
  date: string,
  time: string,
  partySize: number,
  tableLabel?: string,
  tableNumber?: number,
  guestPhone?: string,
  address?: string,
  venueType?: string
): { subject: string; html: string; text: string } {
  const subject = `✅ Réservation confirmée — ${venueName} · ${reservationCode}`;

  const tableRow = (tableLabel || tableNumber)
    ? `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;width:44%">Table</td>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:13px;font-weight:600;text-align:right">${tableLabel ?? `Table ${tableNumber}`}</td>
      </tr>` : '';

  const addressRow = address
    ? `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500">Adresse</td>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:13px;font-weight:600;text-align:right">${address}</td>
      </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réservation confirmée — Look and Book</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;">
    <tr>
      <td align="center" style="padding:32px 16px 0;">

        <!-- LOGO -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <span style="color:#D4AF37;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Ma</span><span style="color:#fbbf24;font-size:26px;font-weight:700;letter-spacing:-0.5px;"> Reservation</span>
            </td>
          </tr>
        </table>

        <!-- HERO SUCCESS BANNER -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="background:linear-gradient(135deg,#052e16 0%,#064e3b 50%,#065f46 100%);border-radius:20px 20px 0 0;padding:40px 32px;text-align:center;border:1px solid rgba(16,185,129,0.25);border-bottom:none;">
              <div style="display:inline-block;width:64px;height:64px;background:rgba(16,185,129,0.15);border:2px solid rgba(16,185,129,0.4);border-radius:50%;text-align:center;line-height:60px;font-size:28px;margin-bottom:16px;">✓</div>
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#34d399;letter-spacing:0.1em;text-transform:uppercase;">Réservation Confirmée</p>
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Tout est prêt, ${userName} !</h1>
              <p style="margin:0;font-size:14px;color:#6ee7b7;line-height:1.5;">Votre table vous attend chez <strong style="color:#a7f3d0;">${venueName}</strong></p>
            </td>
          </tr>
        </table>

        <!-- MAIN CARD -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 20px 20px;padding:32px;">

              <!-- REFERENCE CODE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(251,191,36,0.05));border:1px solid rgba(212,175,55,0.25);border-radius:12px;padding:16px 20px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#92400e;letter-spacing:0.12em;text-transform:uppercase;">Votre code de réservation</p>
                    <span style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:700;color:#D4AF37;letter-spacing:0.15em;">${reservationCode}</span>
                    <p style="margin:8px 0 0;font-size:11px;color:#6b7280;">Présentez ce code en caisse à votre arrivée</p>
                  </td>
                </tr>
              </table>

              <!-- DETAILS GRID -->
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#4b5563;letter-spacing:0.1em;text-transform:uppercase;">Détails de la réservation</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;width:44%;">Établissement</td>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${venueName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;">Date</td>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${date}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;">Heure</td>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#fbbf24;font-size:13px;font-weight:700;text-align:right;">${time}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;">Couverts</td>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${partySize} personne${partySize > 1 ? 's' : ''}</td>
                </tr>
                ${tableRow}
                ${addressRow}
              </table>

              <!-- QR PLACEHOLDER -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#0d0d0d;border:1px dashed rgba(212,175,55,0.2);border-radius:12px;padding:20px;text-align:center;">
                    <div style="font-size:40px;margin-bottom:8px;">📱</div>
                    <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#d1d5db;">Présentez le code en caisse</p>
                    <p style="margin:0;font-size:11px;color:#4b5563;">Votre code <span style="font-family:monospace;color:#D4AF37;">${reservationCode}</span> sera scanné à l'accueil</p>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://mareservation.tn/reservations" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#fbbf24,#f59e0b);color:#000000;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.02em;">Voir ma réservation</a>
                  </td>
                </tr>
              </table>

              <!-- CANCELLATION POLICY -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:14px 16px;">
                    <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6;">⚠️ <strong style="color:#6b7280;">Politique d'annulation :</strong> Vous pouvez annuler gratuitement jusqu'à 2h avant votre réservation depuis votre espace client.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- FOOTER -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td align="center" style="padding:28px 16px;">
              <p style="margin:0 0 4px;font-size:12px;color:#374151;">© ${new Date().getFullYear()} <span style="color:#D4AF37;">Look and Book</span> · Plateforme de réservation premium en Tunisie</p>
              <p style="margin:0;font-size:11px;color:#1f2937;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
Bonjour ${userName},

Votre réservation est confirmée !

Code de réservation : ${reservationCode}
Établissement : ${venueName}
Date : ${date}
Heure : ${time}
Couverts : ${partySize}${tableLabel ? `\nTable : ${tableLabel}` : tableNumber ? `\nTable : ${tableNumber}` : ''}${address ? `\nAdresse : ${address}` : ''}

Présentez ce code en caisse à votre arrivée.

Voir ma réservation : https://mareservation.tn/reservations

© ${new Date().getFullYear()} Look and Book. Tous droits réservés.
  `;

  return { subject, html, text };
}

export function createReservationCancellationTemplate(
  userName: string,
  reservationCode: string,
  venueName: string,
  date: string,
  time: string
): { subject: string; html: string; text: string } {
  const subject = `Annulation de reservation - ${reservationCode}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Annulation de reservation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td style="text-align: center; padding-bottom: 30px;">
            <div style="font-size:25px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #171717; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.08);">
            <h2 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0 0 24px 0;">Reservation annulee</h2>
            <p style="color: #a3a3a3; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Bonjour ${userName},
            </p>
            <p style="color: #a3a3a3; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Votre reservation a bien ete annulee. Voici un rappel des informations concernees :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; border-radius: 12px; padding: 20px;">
              <tr><td style="padding: 8px 0;"><strong style="color: #fbbf24;">Code :</strong><span style="color: #ffffff; margin-left: 8px;">${reservationCode}</span></td></tr>
              <tr><td style="padding: 8px 0;"><strong style="color: #fbbf24;">Lieu :</strong><span style="color: #ffffff; margin-left: 8px;">${venueName}</span></td></tr>
              <tr><td style="padding: 8px 0;"><strong style="color: #fbbf24;">Date :</strong><span style="color: #ffffff; margin-left: 8px;">${date}</span></td></tr>
              <tr><td style="padding: 8px 0;"><strong style="color: #fbbf24;">Heure :</strong><span style="color: #ffffff; margin-left: 8px;">${time}</span></td></tr>
            </table>
            <p style="color: #a3a3a3; font-size: 15px; line-height: 1.6; margin: 24px 0 0 0;">
              Vous pouvez explorer d'autres lieux et creer une nouvelle reservation a tout moment.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Bonjour ${userName},

Votre reservation a ete annulee.

Code : ${reservationCode}
Lieu : ${venueName}
Date : ${date}
Heure : ${time}
  `.trim();

  return { subject, html, text };
}

export function createReservationReminderTemplate(
  userName: string,
  venueName: string,
  date: string,
  time: string,
  reservationCode: string
): { subject: string; html: string; text: string } {
  const subject = `Rappel de reservation - ${venueName}`;
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="margin:0 0 20px 0;"><div style="font-size:25px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></div>
          <h2 style="color:#fff;margin:0 0 16px 0;">Rappel de votre reservation</h2>
          <p style="color:#a3a3a3;line-height:1.6;">Bonjour ${userName}, votre reservation approche.</p>
          <p style="color:#fff;line-height:1.8;">
            Lieu: <strong>${venueName}</strong><br/>
            Date: <strong>${date}</strong><br/>
            Heure: <strong>${time}</strong><br/>
            Code: <strong>${reservationCode}</strong>
          </p>
        </td></tr>
      </table>
    </body></html>
  `;
  const text = `Bonjour ${userName}, rappel de reservation chez ${venueName} le ${date} a ${time}. Code: ${reservationCode}`;
  return { subject, html, text };
}

export function createReservationReviewRequestTemplate(
  userName: string,
  venueName: string,
  reservationCode: string
): { subject: string; html: string; text: string } {
  const subject = `Comment s'est passee votre reservation ?`;
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="margin:0 0 20px 0;"><div style="font-size:25px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></div>
          <h2 style="color:#fff;margin:0 0 16px 0;">Votre avis nous interesse</h2>
          <p style="color:#a3a3a3;line-height:1.6;">Bonjour ${userName}, merci pour votre passage chez ${venueName}.</p>
          <p style="color:#a3a3a3;line-height:1.6;">Si vous avez quelques minutes, laissez un avis sur votre reservation ${reservationCode} pour aider les prochains clients.</p>
        </td></tr>
      </table>
    </body></html>
  `;
  const text = `Bonjour ${userName}, merci pour votre reservation chez ${venueName}. Votre avis sur la reservation ${reservationCode} nous aiderait beaucoup.`;
  return { subject, html, text };
}

interface HotelEmailParams {
  guestName: string;
  hotelName: string;
  roomName: string;
  reservationCode: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  total: string;
  paid: string;
  remaining: string;
  paymentLabel: string;
  ticketUrl?: string;
  hotelAddress?: string;
  hotelPhone?: string;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:8px 0;color:#a3a3a3;font-size:14px;">${label}</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:600;">${value}</td></tr>`;
}

export function createHotelClientConfirmationTemplate(p: HotelEmailParams): { subject: string; html: string; text: string } {
  const subject = `Réservation confirmée — ${p.hotelName} · ${p.reservationCode}`;
  const ticketBtn = p.ticketUrl
    ? `<tr><td style="padding-top:24px;text-align:center;"><a href="${p.ticketUrl}" style="display:inline-block;background:#fbbf24;color:#000;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;font-size:14px;">Voir mon ticket</a></td></tr>`
    : '';
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#34d399;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Réservation confirmée</div>
          <h2 style="color:#fff;margin:16px 0 8px 0;font-size:22px;">Bonjour ${p.guestName},</h2>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 24px 0;">Votre séjour à <strong style="color:#fff;">${p.hotelName}</strong> est confirmé. Conservez cet email — il fait office de ticket.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:12px;padding:18px;border:1px solid rgba(255,255,255,0.05);">
            ${row('Référence', `<span style="font-family:monospace;color:#fbbf24;">${p.reservationCode}</span>`)}
            ${row('Hôtel', p.hotelName)}
            ${row('Chambre', p.roomName)}
            ${row('Arrivée', p.checkIn)}
            ${row('Départ', p.checkOut)}
            ${row('Durée', `${p.nights} nuit${p.nights > 1 ? 's' : ''}`)}
            ${row('Voyageurs', String(p.guests))}
            ${row('Paiement', p.paymentLabel)}
            ${row('Total', `${p.total}`)}
            ${row('Payé', p.paid)}
            ${row('À régler sur place', p.remaining)}
          </table>
          ${p.hotelAddress || p.hotelPhone ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:#0a0a0a;border-radius:12px;padding:16px;border:1px solid rgba(255,255,255,0.05);">
            <tr><td style="color:#a3a3a3;font-size:13px;line-height:1.6;">
              ${p.hotelAddress ? `📍 ${p.hotelAddress}<br>` : ''}
              ${p.hotelPhone ? `📞 <a href="tel:${p.hotelPhone}" style="color:#fbbf24;text-decoration:none;">${p.hotelPhone}</a>` : ''}
            </td></tr>
          </table>` : ''}
          ${ticketBtn}
          <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:24px 0 0 0;">Annulation gratuite jusqu'à 24h avant l'arrivée. Présentez le QR code de votre ticket à la réception.</p>
        </td></tr>
      </table>
    </body></html>`;
  const text = `Bonjour ${p.guestName}, votre réservation à ${p.hotelName} est confirmée. Référence: ${p.reservationCode}. Du ${p.checkIn} au ${p.checkOut} (${p.nights} nuits). Total: ${p.total}.`;
  return { subject, html, text };
}

export function createHotelOwnerNewReservationTemplate(p: HotelEmailParams & { ownerName: string }): { subject: string; html: string; text: string } {
  const subject = `Nouvelle réservation — ${p.roomName} · ${p.reservationCode}`;
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="display:inline-block;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);color:#fbbf24;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Nouvelle réservation</div>
          <h2 style="color:#fff;margin:16px 0 8px 0;font-size:22px;">Bonjour ${p.ownerName},</h2>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;">Vous avez une nouvelle réservation à <strong style="color:#fff;">${p.hotelName}</strong>.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#0a0a0a;border-radius:12px;padding:18px;border:1px solid rgba(255,255,255,0.05);">
            ${row('Référence', `<span style="font-family:monospace;color:#fbbf24;">${p.reservationCode}</span>`)}
            ${row('Chambre', p.roomName)}
            ${row('Client', p.guestName)}
            ${row('Arrivée', p.checkIn)}
            ${row('Départ', p.checkOut)}
            ${row('Durée', `${p.nights} nuit${p.nights > 1 ? 's' : ''}`)}
            ${row('Voyageurs', String(p.guests))}
            ${row('Paiement', p.paymentLabel)}
            ${row('Montant total', p.total)}
            ${row('Payé', p.paid)}
          </table>
          <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:24px 0 0 0;">Connectez-vous à votre espace pour consulter ou gérer cette réservation.</p>
        </td></tr>
      </table>
    </body></html>`;
  const text = `Nouvelle réservation ${p.reservationCode} pour ${p.roomName} (${p.hotelName}). Client: ${p.guestName}. Du ${p.checkIn} au ${p.checkOut}.`;
  return { subject, html, text };
}

// ── Shared shell for the lighter lifecycle emails ──────────────────────────
function emailShell(opts: {
  badge: string;
  badgeColor: string;
  heading: string;
  intro: string;
  rows: Array<[string, string]>;
  footer?: string;
}): string {
  const rowsHtml = opts.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;"><strong style="color:#fbbf24;">${k} :</strong><span style="color:#fff;margin-left:8px;">${v}</span></td></tr>`
    )
    .join('');
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
      <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
      <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
        <div style="display:inline-block;background:${opts.badgeColor}1f;border:1px solid ${opts.badgeColor}4d;color:${opts.badgeColor};padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">${opts.badge}</div>
        <h2 style="color:#fff;margin:16px 0 12px 0;font-size:22px;">${opts.heading}</h2>
        <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 20px 0;">${opts.intro}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:12px;padding:18px;border:1px solid rgba(255,255,255,0.05);">${rowsHtml}</table>
        ${opts.footer ? `<p style="color:#6b7280;font-size:12px;line-height:1.6;margin:22px 0 0 0;">${opts.footer}</p>` : ''}
      </td></tr>
      <tr><td style="text-align:center;padding-top:24px;"><p style="color:#525252;font-size:12px;margin:0;">© ${new Date().getFullYear()} Look and Book</p></td></tr>
    </table></body></html>`;
}

/** Owner notification when a café / restaurant / coworking booking is created. */
export function createOwnerNewReservationTemplate(p: {
  ownerName: string;
  venueName: string;
  bookingTypeLabel: string;
  reservationCode: string;
  date: string;
  time: string;
  partySize: number;
  guestName: string;
  guestPhone?: string;
}): { subject: string; html: string; text: string } {
  const subject = `⚡ Nouvelle réservation — ${p.venueName} · ${p.reservationCode}`;
  const now = new Date();
  const timestamp = now.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  const phoneRow = p.guestPhone
    ? `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;width:44%;">Téléphone</td>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;font-weight:600;text-align:right;"><a href="tel:${p.guestPhone}" style="color:#fbbf24;text-decoration:none;">${p.guestPhone}</a></td>
      </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle réservation — ${p.venueName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;">
    <tr>
      <td align="center" style="padding:32px 16px 0;">

        <!-- LOGO -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="color:#D4AF37;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Ma</span><span style="color:#fbbf24;font-size:24px;font-weight:700;letter-spacing:-0.5px;"> Reservation</span>
              <p style="margin:4px 0 0;font-size:11px;color:#374151;letter-spacing:0.08em;text-transform:uppercase;">Espace Propriétaire</p>
            </td>
          </tr>
        </table>

        <!-- URGENCY HEADER -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="background:linear-gradient(135deg,#1c1400 0%,#292400 60%,#1f1a00 100%);border:1px solid rgba(212,175,55,0.3);border-radius:20px 20px 0 0;padding:28px 32px;border-bottom:none;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.35);color:#fbbf24;padding:5px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">⚡ Nouvelle réservation reçue</span>
                    <h1 style="margin:14px 0 4px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${p.venueName}</h1>
                    <p style="margin:0;font-size:14px;color:#a3a3a3;">Bonjour ${p.ownerName}, un client vient de réserver.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- MAIN CARD -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 20px 20px;padding:28px 32px;">

              <!-- REFERENCE CODE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
                <tr>
                  <td style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:10px;padding:12px 18px;text-align:center;">
                    <p style="margin:0 0 2px;font-size:11px;color:#78716c;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Référence réservation</p>
                    <span style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:#D4AF37;letter-spacing:0.15em;">${p.reservationCode}</span>
                  </td>
                </tr>
              </table>

              <!-- CUSTOMER INFO -->
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#4b5563;letter-spacing:0.1em;text-transform:uppercase;">Informations client</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin-bottom:22px;">
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;width:44%;">Client</td>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:13px;font-weight:700;text-align:right;">${p.guestName}</td>
                </tr>
                ${phoneRow}
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;">Type</td>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${p.bookingTypeLabel}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;">Date</td>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${p.date}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#6b7280;font-size:13px;font-weight:500;">Heure</td>
                  <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#fbbf24;font-size:13px;font-weight:700;text-align:right;">${p.time}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;color:#6b7280;font-size:13px;font-weight:500;">Couverts</td>
                  <td style="padding:10px 12px;color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${p.partySize} personne${p.partySize > 1 ? 's' : ''}</td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="https://mareservation.tn/admin/reservations" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#fbbf24,#f59e0b);color:#000000;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.02em;">Gérer les réservations</a>
                  </td>
                </tr>
              </table>

              <!-- TIMESTAMP NOTE -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:12px 16px;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#374151;">🕐 Réservation reçue le <span style="color:#6b7280;">${timestamp}</span> · Répondez rapidement pour confirmer.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- FOOTER -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td align="center" style="padding:24px 16px;">
              <p style="margin:0;font-size:11px;color:#1f2937;">© ${new Date().getFullYear()} <span style="color:#D4AF37;">Look and Book</span> · Panneau d'administration propriétaire</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `⚡ Nouvelle réservation reçue — ${p.venueName}

Bonjour ${p.ownerName},

Référence : ${p.reservationCode}
Client : ${p.guestName}${p.guestPhone ? `\nTéléphone : ${p.guestPhone}` : ''}
Type : ${p.bookingTypeLabel}
Date : ${p.date}
Heure : ${p.time}
Couverts : ${p.partySize}

Gérer les réservations : https://mareservation.tn/admin/reservations

Reçu le ${timestamp}
© ${new Date().getFullYear()} Look and Book.`;
  return { subject, html, text };
}

/** Receipt sent to the customer once a payment succeeds. */
export function createPaymentReceiptTemplate(p: {
  guestName: string;
  venueName: string;
  reservationCode: string;
  amount: string;
  method: string;
  date: string;
}): { subject: string; html: string; text: string } {
  const subject = `Paiement confirmé — ${p.venueName} · ${p.reservationCode}`;
  const html = emailShell({
    badge: 'Paiement reçu',
    badgeColor: '#34d399',
    heading: `Merci ${p.guestName} !`,
    intro: `Nous confirmons la réception de votre paiement pour votre réservation à <strong style="color:#fff;">${p.venueName}</strong>.`,
    rows: [
      ['Référence', `<span style="font-family:monospace;color:#fbbf24;">${p.reservationCode}</span>`],
      ['Montant payé', p.amount],
      ['Méthode', p.method],
      ['Date', p.date],
    ],
    footer: 'Ce message tient lieu de reçu. Conservez-le pour vos archives.',
  });
  const text = `Paiement confirmé pour ${p.reservationCode} à ${p.venueName}. Montant: ${p.amount} (${p.method}).`;
  return { subject, html, text };
}

/** Reminder that a deposit / payment is still due before the cancellation deadline. */
export function createDepositReminderTemplate(p: {
  guestName: string;
  venueName: string;
  reservationCode: string;
  deadline: string;
  amount: string;
}): { subject: string; html: string; text: string } {
  const subject = `Action requise — paiement en attente · ${p.reservationCode}`;
  const html = emailShell({
    badge: 'Paiement en attente',
    badgeColor: '#fbbf24',
    heading: `Bonjour ${p.guestName},`,
    intro: `Votre réservation à <strong style="color:#fff;">${p.venueName}</strong> n'est pas encore réglée. Merci de finaliser le paiement pour la garantir.`,
    rows: [
      ['Référence', `<span style="font-family:monospace;color:#fbbf24;">${p.reservationCode}</span>`],
      ['Montant dû', p.amount],
      ['À régler avant', p.deadline],
    ],
    footer: 'Sans paiement avant cette date, la réservation pourra être annulée automatiquement.',
  });
  const text = `Rappel: paiement en attente pour ${p.reservationCode} à ${p.venueName}. Montant: ${p.amount}. À régler avant ${p.deadline}.`;
  return { subject, html, text };
}

export function createReservationAcceptedTemplate(p: HotelEmailParams): { subject: string; html: string; text: string } {
  const subject = `Réservation acceptée — ${p.hotelName} · ${p.reservationCode}`;
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#34d399;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Acceptée</div>
          <h2 style="color:#fff;margin:16px 0 8px 0;font-size:22px;">Bonne nouvelle ${p.guestName} !</h2>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 18px 0;">L'hôtel <strong style="color:#fff;">${p.hotelName}</strong> a confirmé votre demande de réservation pour la chambre <strong style="color:#fff;">${p.roomName}</strong>, du ${p.checkIn} au ${p.checkOut}.</p>
          <p style="color:#a3a3a3;font-size:14px;line-height:1.6;">Référence : <span style="font-family:monospace;color:#fbbf24;">${p.reservationCode}</span></p>
        </td></tr>
      </table>
    </body></html>`;
  const text = `Bonne nouvelle ${p.guestName} ! Votre demande à ${p.hotelName} pour ${p.roomName} (${p.checkIn} → ${p.checkOut}) est acceptée. Référence : ${p.reservationCode}.`;
  return { subject, html, text };
}

export interface OwnerReservationEmailParams {
  venueName: string;
  reservationCode: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
  tableLabel?: string;
  menuOrder?: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  currency?: string;
}

/** Notify a café/restaurant owner of a new table reservation (with optional menu pre-order). */
export function createOwnerReservationEmail(p: OwnerReservationEmailParams): { subject: string; html: string; text: string } {
  const currency = p.currency ?? 'TND';
  const subject = `Nouvelle réservation — ${p.venueName} · ${p.reservationCode}`;
  const menu = (p.menuOrder ?? []).filter((l) => l && l.name && l.quantity > 0);
  const menuRows = menu
    .map(
      (l) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e5e5;font-size:14px;">${l.quantity} × ${l.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#fbbf24;font-size:14px;font-weight:700;text-align:right;">${(l.unitPrice * l.quantity).toLocaleString('fr-FR')} ${currency}</td>
      </tr>`
    )
    .join('');
  const menuBlock = menu.length
    ? `<h3 style="color:#fff;font-size:15px;margin:22px 0 8px;">Commande (pré-commande menu)</h3>
       <table width="100%" cellpadding="0" cellspacing="0">${menuRows}</table>`
    : '';
  const row = (label: string, value: string) =>
    `<tr><td style="padding:7px 0;color:#a3a3a3;font-size:14px;">${label}</td><td style="padding:7px 0;color:#fff;font-size:14px;font-weight:600;text-align:right;">${value}</td></tr>`;
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="display:inline-block;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);color:#fbbf24;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Nouvelle réservation</div>
          <h2 style="color:#fff;margin:16px 0 8px 0;font-size:22px;">${p.venueName}</h2>
          <p style="color:#a3a3a3;font-size:14px;margin:0 0 18px;">Référence : <span style="font-family:monospace;color:#fbbf24;">${p.reservationCode}</span></p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Client', p.guestName)}
            ${p.guestPhone ? row('Téléphone', p.guestPhone) : ''}
            ${p.guestEmail ? row('Email', p.guestEmail) : ''}
            ${row('Date', p.dateLabel)}
            ${row('Heure', p.timeLabel)}
            ${row('Personnes', String(p.partySize))}
            ${p.tableLabel ? row('Table', p.tableLabel) : ''}
          </table>
          ${menuBlock}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid rgba(255,255,255,0.08);">
            ${row('Total', `${p.total.toLocaleString('fr-FR')} ${currency}`)}
          </table>
        </td></tr>
      </table>
    </body></html>`;
  const text = `Nouvelle réservation — ${p.venueName} (${p.reservationCode})
Client : ${p.guestName}${p.guestPhone ? ` · ${p.guestPhone}` : ''}${p.guestEmail ? ` · ${p.guestEmail}` : ''}
Date : ${p.dateLabel} ${p.timeLabel} · ${p.partySize} pers.${p.tableLabel ? ` · ${p.tableLabel}` : ''}
${menu.length ? `Commande :\n${menu.map((l) => `- ${l.quantity} × ${l.name} : ${(l.unitPrice * l.quantity).toLocaleString('fr-FR')} ${currency}`).join('\n')}\n` : ''}Total : ${p.total.toLocaleString('fr-FR')} ${currency}`;
  return { subject, html, text };
}

export function createReservationRejectedTemplate(p: HotelEmailParams & { reason?: string }): { subject: string; html: string; text: string } {
  const subject = `Demande refusée — ${p.hotelName} · ${p.reservationCode}`;
  const reasonBlock = p.reason ? `<p style="color:#a3a3a3;font-size:14px;background:#0a0a0a;border-radius:10px;padding:14px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:#fff;">Motif :</strong> ${p.reason}</p>` : '';
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="display:inline-block;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Demande refusée</div>
          <h2 style="color:#fff;margin:16px 0 8px 0;font-size:22px;">Bonjour ${p.guestName},</h2>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 18px 0;">L'hôtel <strong style="color:#fff;">${p.hotelName}</strong> n'a malheureusement pas pu honorer votre demande pour la chambre <strong style="color:#fff;">${p.roomName}</strong>, du ${p.checkIn} au ${p.checkOut}. Aucun paiement n'a été prélevé.</p>
          ${reasonBlock}
          <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin-top:18px;">Vous pouvez explorer d'autres établissements similaires sur Look and Book. Référence : <span style="font-family:monospace;color:#fbbf24;">${p.reservationCode}</span>.</p>
        </td></tr>
      </table>
    </body></html>`;
  const text = `Bonjour ${p.guestName}, l'hôtel ${p.hotelName} a refusé votre demande pour ${p.roomName} (${p.checkIn} → ${p.checkOut}). Aucun paiement prélevé. Référence : ${p.reservationCode}.`;
  return { subject, html, text };
}

export function createCheckinReminderTemplate(p: {
  guestName: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  reservationCode: string;
  ticketUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Rappel d'arrivée demain — ${p.hotelName} · ${p.reservationCode}`;
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="display:inline-block;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);color:#fbbf24;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Rappel de séjour</div>
          <h2 style="color:#fff;margin:16px 0 8px 0;font-size:22px;">À demain, ${p.guestName} !</h2>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;">Votre arrivée à <strong style="color:#fff;">${p.hotelName}</strong> est prévue demain.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#0a0a0a;border-radius:12px;padding:18px;border:1px solid rgba(255,255,255,0.05);">
            <tr><td style="padding:8px 0;color:#a3a3a3;font-size:14px;">Référence</td><td style="padding:8px 0;color:#fbbf24;font-size:14px;font-weight:600;font-family:monospace;text-align:right;">${p.reservationCode}</td></tr>
            <tr><td style="padding:8px 0;color:#a3a3a3;font-size:14px;">Hôtel</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;text-align:right;">${p.hotelName}</td></tr>
            <tr><td style="padding:8px 0;color:#a3a3a3;font-size:14px;">Arrivée</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;text-align:right;">${p.checkIn}</td></tr>
            <tr><td style="padding:8px 0;color:#a3a3a3;font-size:14px;">Départ</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;text-align:right;">${p.checkOut}</td></tr>
          </table>
          <div style="margin-top:24px;text-align:center;">
            <a href="${p.ticketUrl}" style="display:inline-block;background:#fbbf24;color:#000;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;font-size:14px;">Voir mon ticket</a>
          </div>
          <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:24px 0 0 0;">Présentez votre QR code à la réception à votre arrivée.</p>
        </td></tr>
      </table>
    </body></html>`;
  const text = `À demain ${p.guestName} ! Votre arrivée à ${p.hotelName} est prévue le ${p.checkIn}. Référence : ${p.reservationCode}. Ticket : ${p.ticketUrl}`;
  return { subject, html, text };
}

export function createReviewRequestTemplate(p: {
  guestName: string;
  hotelName: string;
  reservationCode: string;
  reviewUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Comment s'est passé votre séjour à ${p.hotelName} ?`;
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          <div style="display:inline-block;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);color:#fbbf24;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Votre avis</div>
          <h2 style="color:#fff;margin:16px 0 8px 0;font-size:22px;">Bonjour ${p.guestName},</h2>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;">Nous espérons que votre séjour à <strong style="color:#fff;">${p.hotelName}</strong> s'est bien passé.</p>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;">Votre avis aide d'autres voyageurs à choisir les meilleurs établissements. Cela ne prend que 2 minutes !</p>
          <div style="margin-top:24px;text-align:center;">
            <a href="${p.reviewUrl}" style="display:inline-block;background:#fbbf24;color:#000;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;font-size:14px;">Laisser mon avis</a>
          </div>
          <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:24px 0 0 0;">Référence de réservation : ${p.reservationCode}</p>
        </td></tr>
      </table>
    </body></html>`;
  const text = `Bonjour ${p.guestName}, merci pour votre séjour à ${p.hotelName}. Laissez votre avis ici : ${p.reviewUrl} (réf. ${p.reservationCode}).`;
  return { subject, html, text };
}

export function createHotelApprovalTemplate(p: { ownerName: string; hotelName: string; approved: boolean; reason?: string }): { subject: string; html: string; text: string } {
  const subject = p.approved
    ? `Hôtel approuvé — ${p.hotelName}`
    : `Demande d'approbation refusée — ${p.hotelName}`;
  const banner = p.approved
    ? `<div style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#34d399;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Approuvé</div>`
    : `<div style="display:inline-block;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Refusé</div>`;
  const body = p.approved
    ? `<p style="color:#a3a3a3;font-size:15px;line-height:1.6;">Votre établissement <strong style="color:#fff;">${p.hotelName}</strong> est désormais visible sur Look and Book. Les clients peuvent commencer à réserver immédiatement.</p>`
    : `<p style="color:#a3a3a3;font-size:15px;line-height:1.6;">Votre demande pour <strong style="color:#fff;">${p.hotelName}</strong> n'a pas été approuvée.</p>${p.reason ? `<p style="color:#a3a3a3;font-size:14px;background:#0a0a0a;border-radius:10px;padding:14px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:#fff;">Motif :</strong> ${p.reason}</p>` : ''}`;
  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <tr><td style="text-align:center;padding-bottom:24px;"><div style="font-size:23px;font-weight:800;letter-spacing:0.14em;color:#fbbf24;text-transform:uppercase;">LOOK AND BOOK</div><div style="margin-top:5px;font-size:9px;font-weight:700;letter-spacing:0.36em;color:#9ca3af;text-transform:uppercase;">Book your moment</div></td></tr>
        <tr><td style="background:#171717;border-radius:16px;padding:36px;border:1px solid rgba(255,255,255,0.08);">
          ${banner}
          <h2 style="color:#fff;margin:16px 0 8px 0;font-size:22px;">Bonjour ${p.ownerName},</h2>
          ${body}
        </td></tr>
      </table>
    </body></html>`;
  const text = `Bonjour ${p.ownerName}, ${p.approved ? `votre hôtel ${p.hotelName} a été approuvé.` : `votre demande pour ${p.hotelName} n'a pas été approuvée.${p.reason ? ` Motif : ${p.reason}` : ''}`}`;
  return { subject, html, text };
}
