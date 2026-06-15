import type { EmailAttachment } from './email.service';

export const RESERVATION_QR_CONTENT_ID = 'ma-reservation-ticket-qr';

export type ReservationTicketStatus = 'confirmed' | 'pending';

export interface ReservationTicketDetail {
  label: string;
  value: string;
  accent?: boolean;
}

export interface ReservationMenuLine {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ReservationTicketEmailParams {
  guestName: string;
  reservationCode: string;
  venueName: string;
  experienceLabel: string;
  status?: ReservationTicketStatus;
  details: ReservationTicketDetail[];
  ticketUrl: string;
  qrImageSrc?: string;
  address?: string;
  phone?: string;
  note?: string;
  /** Optional café/restaurant menu pre-order to display on the ticket. */
  menuOrder?: ReservationMenuLine[];
  currency?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeUrl(value: string): string {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:', 'cid:'].includes(parsed.protocol) ? escapeHtml(value) : '#';
  } catch {
    return value.startsWith('cid:') ? escapeHtml(value) : '#';
  }
}

export function createReservationQrAttachment(dataUrl?: string): EmailAttachment | undefined {
  if (!dataUrl) return undefined;
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return undefined;
  return {
    filename: 'ticket-qr.png',
    content: Buffer.from(match[1], 'base64'),
    contentType: 'image/png',
    contentId: RESERVATION_QR_CONTENT_ID,
  };
}

export function createReservationTicketEmail(
  params: ReservationTicketEmailParams
): { subject: string; html: string; text: string } {
  const status = params.status ?? 'confirmed';
  const isConfirmed = status === 'confirmed';
  const statusLabel = isConfirmed ? 'Réservation confirmée' : 'Demande enregistrée';
  const headline = isConfirmed
    ? `Votre ticket est prêt, ${params.guestName}`
    : `Votre demande est bien enregistrée, ${params.guestName}`;
  const intro = isConfirmed
    ? `Votre réservation chez ${params.venueName} est confirmée. Présentez ce QR code à votre arrivée.`
    : `Votre demande chez ${params.venueName} a bien été reçue. Nous vous informerons dès sa confirmation.`;
  const statusColor = isConfirmed ? '#047857' : '#b45309';
  const statusBackground = isConfirmed ? '#ecfdf5' : '#fffbeb';
  const statusBorder = isConfirmed ? '#a7f3d0' : '#fde68a';
  const subject = `${statusLabel} - ${params.venueName} - ${params.reservationCode}`;
  const ticketUrl = safeUrl(params.ticketUrl);
  const qrImageSrc = params.qrImageSrc ? safeUrl(params.qrImageSrc) : undefined;

  const detailRows = params.details
    .filter((detail) => detail.label && detail.value)
    .map(
      (detail) => `
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #ece9e2;color:#78716c;font-size:13px;line-height:1.4;width:42%;vertical-align:top;">
            ${escapeHtml(detail.label)}
          </td>
          <td style="padding:11px 0;border-bottom:1px solid #ece9e2;color:${detail.accent ? '#9a6700' : '#1c1917'};font-size:13px;line-height:1.4;font-weight:700;text-align:right;vertical-align:top;">
            ${escapeHtml(detail.value)}
          </td>
        </tr>`
    )
    .join('');

  const currency = params.currency ?? 'TND';
  const menuLines = (params.menuOrder ?? []).filter((l) => l && l.name && l.quantity > 0);
  const menuTotal = menuLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const menuBlock = menuLines.length
    ? `
      <p style="margin:0 0 10px;color:#78716c;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Votre commande</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;border-top:1px solid #ece9e2;">
        ${menuLines
          .map(
            (l) => `
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #ece9e2;color:#1c1917;font-size:13px;line-height:1.4;vertical-align:top;">${escapeHtml(String(l.quantity))} × ${escapeHtml(l.name)}</td>
          <td style="padding:11px 0;border-bottom:1px solid #ece9e2;color:#1c1917;font-size:13px;line-height:1.4;font-weight:700;text-align:right;vertical-align:top;">${escapeHtml((l.unitPrice * l.quantity).toLocaleString('fr-FR'))} ${escapeHtml(currency)}</td>
        </tr>`
          )
          .join('')}
        <tr>
          <td style="padding:11px 0;color:#78716c;font-size:13px;line-height:1.4;font-weight:700;vertical-align:top;">Sous-total commande</td>
          <td style="padding:11px 0;color:#9a6700;font-size:13px;line-height:1.4;font-weight:800;text-align:right;vertical-align:top;">${escapeHtml(menuTotal.toLocaleString('fr-FR'))} ${escapeHtml(currency)}</td>
        </tr>
      </table>`
    : '';

  const contactBlock = params.address || params.phone
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#fafaf9;border:1px solid #ece9e2;border-radius:14px;">
        <tr>
          <td style="padding:16px 18px;">
            <p style="margin:0 0 6px;color:#78716c;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Lieu</p>
            ${params.address ? `<p style="margin:0 0 ${params.phone ? '6px' : '0'};color:#292524;font-size:13px;line-height:1.5;">${escapeHtml(params.address)}</p>` : ''}
            ${params.phone ? `<p style="margin:0;color:#292524;font-size:13px;line-height:1.5;">Téléphone : <a href="tel:${escapeHtml(params.phone)}" style="color:#9a6700;text-decoration:none;font-weight:700;">${escapeHtml(params.phone)}</a></p>` : ''}
          </td>
        </tr>
      </table>`
    : '';

  const qrBlock = qrImageSrc
    ? `<img src="${qrImageSrc}" width="188" height="188" alt="QR code du ticket ${escapeHtml(params.reservationCode)}" style="display:block;width:188px;height:188px;margin:0 auto;border:0;border-radius:10px;">`
    : `<div style="padding:34px 16px;border:1px dashed #d6d3d1;border-radius:10px;color:#78716c;font-size:13px;line-height:1.5;">Ouvrez votre ticket avec le bouton ci-dessous pour afficher le QR code.</div>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(statusLabel)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell { padding: 18px 10px !important; }
      .email-card { padding: 24px 18px !important; }
      .email-hero { padding: 28px 18px !important; }
      .email-title { font-size: 25px !important; }
      .email-button { display: block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1c1917;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(statusLabel)} chez ${escapeHtml(params.venueName)}. Ticket ${escapeHtml(params.reservationCode)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;">
    <tr>
      <td class="email-shell" align="center" style="padding:34px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="padding:0 0 18px;text-align:center;">
              <span style="color:#1c1917;font-size:24px;font-weight:800;letter-spacing:-0.04em;">Ma</span>
              <span style="color:#b58516;font-size:24px;font-weight:800;letter-spacing:-0.04em;"> Reservation</span>
            </td>
          </tr>
          <tr>
            <td class="email-hero" style="padding:34px 32px;background:#17140f;border-radius:22px 22px 0 0;text-align:center;">
              <span style="display:inline-block;padding:7px 12px;background:${statusBackground};border:1px solid ${statusBorder};border-radius:999px;color:${statusColor};font-size:11px;line-height:1;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(statusLabel)}</span>
              <h1 class="email-title" style="margin:18px 0 9px;color:#ffffff;font-size:30px;line-height:1.18;font-weight:800;letter-spacing:-0.04em;">${escapeHtml(headline)}</h1>
              <p style="margin:0;color:#d6d3d1;font-size:15px;line-height:1.65;">${escapeHtml(intro)}</p>
            </td>
          </tr>
          <tr>
            <td class="email-card" style="padding:30px 32px;background:#ffffff;border:1px solid #e7e2d7;border-top:0;border-radius:0 0 22px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;background:#fffbeb;border:1px solid #fde68a;border-radius:14px;">
                <tr>
                  <td style="padding:16px 18px;text-align:center;">
                    <p style="margin:0 0 5px;color:#92400e;font-size:10px;line-height:1.4;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Référence du ticket</p>
                    <p style="margin:0;color:#7c4a03;font-family:'Courier New',monospace;font-size:22px;line-height:1.2;font-weight:800;letter-spacing:0.12em;">${escapeHtml(params.reservationCode)}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px;color:#78716c;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Détails du ticket</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;border-top:1px solid #ece9e2;">
                <tr>
                  <td style="padding:11px 0;border-bottom:1px solid #ece9e2;color:#78716c;font-size:13px;line-height:1.4;width:42%;vertical-align:top;">Expérience</td>
                  <td style="padding:11px 0;border-bottom:1px solid #ece9e2;color:#1c1917;font-size:13px;line-height:1.4;font-weight:700;text-align:right;vertical-align:top;">${escapeHtml(params.experienceLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:11px 0;border-bottom:1px solid #ece9e2;color:#78716c;font-size:13px;line-height:1.4;width:42%;vertical-align:top;">Établissement</td>
                  <td style="padding:11px 0;border-bottom:1px solid #ece9e2;color:#1c1917;font-size:13px;line-height:1.4;font-weight:700;text-align:right;vertical-align:top;">${escapeHtml(params.venueName)}</td>
                </tr>
                ${detailRows}
              </table>

              ${menuBlock}

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #ece9e2;border-radius:18px;">
                <tr>
                  <td style="padding:22px;text-align:center;">
                    <p style="margin:0 0 14px;color:#1c1917;font-size:14px;line-height:1.4;font-weight:800;">Votre QR ticket</p>
                    <div style="display:inline-block;padding:12px;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;">${qrBlock}</div>
                    <p style="margin:14px 0 0;color:#78716c;font-size:12px;line-height:1.5;">Présentez-le à l'accueil pour vérifier votre réservation.</p>
                  </td>
                </tr>
              </table>

              ${contactBlock}

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                <tr>
                  <td align="center">
                    <a class="email-button" href="${ticketUrl}" style="display:inline-block;padding:15px 30px;background:#d6a72e;border-radius:12px;color:#17140f;font-size:14px;line-height:1.2;font-weight:800;text-decoration:none;">Ouvrir mon ticket</a>
                  </td>
                </tr>
              </table>

              ${params.note ? `<p style="margin:20px 0 0;padding:14px 16px;background:#fafaf9;border-left:3px solid #d6a72e;color:#57534e;font-size:12px;line-height:1.6;">${escapeHtml(params.note)}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 12px 0;text-align:center;">
              <p style="margin:0;color:#78716c;font-size:11px;line-height:1.6;">© ${new Date().getFullYear()} Ma Reservation · Conservez cet email jusqu'à votre arrivée.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const detailsText = params.details
    .filter((detail) => detail.label && detail.value)
    .map((detail) => `${detail.label} : ${detail.value}`)
    .join('\n');
  const text = `${statusLabel}

Bonjour ${params.guestName},

${intro}

Référence : ${params.reservationCode}
Expérience : ${params.experienceLabel}
Établissement : ${params.venueName}
${detailsText}
${menuLines.length ? `\nVotre commande :\n${menuLines.map((l) => `- ${l.quantity} × ${l.name} : ${(l.unitPrice * l.quantity).toLocaleString('fr-FR')} ${currency}`).join('\n')}\nSous-total commande : ${menuTotal.toLocaleString('fr-FR')} ${currency}\n` : ''}${params.address ? `Adresse : ${params.address}\n` : ''}${params.phone ? `Téléphone : ${params.phone}\n` : ''}
Ouvrir mon ticket : ${params.ticketUrl}

${params.note ?? 'Présentez votre QR code ou votre référence à votre arrivée.'}`;

  return { subject, html, text };
}
