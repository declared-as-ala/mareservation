/**
 * Booking notifications: branded HTML templates (dark / gold Exploria360) + who gets what.
 * Everything goes through the outbox, keyed per (reservation, event, recipient) => no duplicates.
 *
 * Wording rules: an unpaid booking is never described as paid; demo bookings are labelled as such
 * in the subject and body and state that no stay or payment exists.
 */
import { Reservation } from '../models/Reservation';
import { Venue } from '../models/Venue';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { enqueueEmail, kickOutbox } from './emailOutbox';
import { mailerConfig } from './mailer';
import { logger } from '../config/logger';

export type BookingEvent =
  | 'request_received' // pending request created
  | 'instant_confirmed' // instant booking created
  | 'confirmed' // owner accepted
  | 'rejected'
  | 'cancelled_by_customer'
  | 'cancelled_by_host'
  | 'expired'
  | 'manual_created';

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
const money = (n: number | null | undefined) => (n == null ? 'À confirmer' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)} TND`);

const STATUS_FR: Record<string, string> = {
  pending: 'En attente de confirmation',
  confirmed: 'Confirmée',
  rejected: 'Refusée',
  cancelled: 'Annulée',
  expired: 'Expirée',
  completed: 'Séjour terminé',
  no_show: 'Non présenté',
  checked_in: 'Arrivé',
};
const PAYMENT_FR: Record<string, string> = {
  unpaid: 'Non payé — règlement sur place auprès de la maison',
  pending: 'Paiement en cours de vérification',
  paid: 'Payé',
  failed: 'Paiement échoué',
  refunded: 'Remboursé',
};

export interface EmailView {
  heading: string;
  intro: string;
  rows: [string, string][];
  ctaLabel?: string;
  ctaUrl?: string;
  note?: string;
  demo?: boolean;
}

/** Shared responsive layout. Table-based, inline styles: renders in Gmail, Outlook and mobile clients. */
export function renderLayout(view: EmailView): { html: string; text: string } {
  const c = mailerConfig();
  const logo = `${c.appBaseUrl}/logo.svg`;
  const gold = '#d4a537';
  const demoBanner = view.demo
    ? `<tr><td style="background:#3a2a05;color:#fcd34d;padding:12px 28px;font:600 13px/1.5 Arial,sans-serif;text-align:center">MODE DÉMONSTRATION — aucune réservation réelle, aucun séjour et aucun paiement ne sont associés à ce message.</td></tr>`
    : '';
  const rows = view.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #262626;color:#a3a3a3;font:14px/1.4 Arial,sans-serif">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #262626;color:#fafafa;font:600 14px/1.4 Arial,sans-serif;text-align:right">${esc(v)}</td></tr>`
    )
    .join('');
  const cta = view.ctaUrl
    ? `<tr><td style="padding:8px 28px 28px" align="center"><a href="${esc(view.ctaUrl)}" style="display:inline-block;background:${gold};color:#0a0a0a;text-decoration:none;font:700 15px Arial,sans-serif;padding:14px 26px;border-radius:12px">${esc(view.ctaLabel ?? 'Voir le détail')}</a></td></tr>`
    : '';
  const support = c.supportEmail ? `Une question ? Écrivez-nous : <a href="mailto:${esc(c.supportEmail)}" style="color:${gold}">${esc(c.supportEmail)}</a><br>` : '';
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(view.heading)}</title></head>
<body style="margin:0;padding:0;background:#050505">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0f0f10;border:1px solid #2a2a2a;border-radius:18px;overflow:hidden">
<tr><td style="padding:24px 28px;border-bottom:1px solid #1f1f1f"><a href="${esc(c.appBaseUrl)}" style="text-decoration:none"><img src="${esc(logo)}" width="150" alt="Exploria360" style="display:block;border:0;max-width:150px;height:auto"></a></td></tr>
${demoBanner}
<tr><td style="padding:28px 28px 8px"><h1 style="margin:0 0 12px;color:#fafafa;font:700 24px/1.3 Georgia,'Times New Roman',serif">${esc(view.heading)}</h1><p style="margin:0;color:#d4d4d4;font:15px/1.6 Arial,sans-serif">${esc(view.intro)}</p></td></tr>
<tr><td style="padding:16px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
${view.note ? `<tr><td style="padding:0 28px 20px;color:#a3a3a3;font:13px/1.6 Arial,sans-serif">${esc(view.note)}</td></tr>` : ''}
${cta}
<tr><td style="padding:20px 28px;background:#0a0a0a;border-top:1px solid #1f1f1f;color:#737373;font:12px/1.6 Arial,sans-serif">${support}Exploria360 — maisons d'hôtes en Tunisie, à visiter en 360°.<br><a href="${esc(c.appBaseUrl)}" style="color:#a3a3a3">${esc(c.appBaseUrl.replace(/^https?:\/\//, ''))}</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    view.demo ? '[MODE DÉMONSTRATION — aucune réservation réelle, aucun séjour ni paiement]' : '',
    view.heading,
    '',
    view.intro,
    '',
    ...view.rows.map(([k, v]) => `${k} : ${v}`),
    view.note ? `\n${view.note}` : '',
    view.ctaUrl ? `\n${view.ctaLabel ?? 'Détail'} : ${view.ctaUrl}` : '',
    '',
    c.supportEmail ? `Contact : ${c.supportEmail}` : '',
    `Exploria360 — ${c.appBaseUrl}`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');
  return { html, text };
}

interface Ctx {
  r: any;
  venue: any;
  owner: any;
  unitName: string;
  trackUrl?: string;
}

function baseRows(ctx: Ctx): [string, string][] {
  const r = ctx.r;
  const guests = `${r.adults ?? 0} adulte(s)${r.children ? `, ${r.children} enfant(s)` : ''}`;
  return [
    ['Référence', r.reservationCode],
    ["Maison d'hôtes", ctx.venue?.name ?? '—'],
    ['Hébergement', ctx.unitName],
    ['Arrivée', fmtDate(new Date(r.startAt))],
    ['Départ', fmtDate(new Date(r.endAt))],
    ['Durée', `${r.nights} nuit${r.nights > 1 ? 's' : ''}`],
    ['Voyageurs', guests],
    ['Statut', STATUS_FR[String(r.status).toLowerCase()] ?? String(r.status)],
    ['Montant total', money(r.totalPrice)],
    ['Paiement', r.isDemo ? 'Aucun (démonstration)' : PAYMENT_FR[r.paymentStatus] ?? r.paymentStatus],
  ];
}

const guestName = (r: any) => [r.customerFirstName ?? r.guestFirstName, r.customerLastName ?? r.guestLastName].filter(Boolean).join(' ');

function customerView(event: BookingEvent, ctx: Ctx): EmailView | null {
  const r = ctx.r;
  const rows = baseRows(ctx);
  const demo = !!r.isDemo;
  const cta = ctx.trackUrl ? { ctaLabel: 'Suivre ma réservation', ctaUrl: ctx.trackUrl } : {};
  const hello = `Bonjour ${r.customerFirstName ?? ''},`.trim();
  switch (event) {
    case 'request_received':
      return { demo, heading: 'Demande de réservation reçue', intro: `${hello} votre demande pour ${ctx.venue?.name} a bien été transmise à la maison d'hôtes. Elle n'est pas encore confirmée : vous recevrez sa réponse par e-mail.`, rows, note: "Aucun paiement n'a été effectué en ligne. Les dates restent réservées pour vous pendant l'examen de votre demande.", ...cta };
    case 'instant_confirmed':
      return { demo, heading: 'Réservation confirmée', intro: `${hello} votre réservation à ${ctx.venue?.name} est confirmée. Présentez votre référence à l'arrivée.`, rows, note: ctx.venue?.arrivalInstructions ? `Informations d'arrivée : ${ctx.venue.arrivalInstructions}` : "Le règlement s'effectue directement auprès de la maison d'hôtes, sauf indication contraire.", ...cta };
    case 'confirmed':
      return { demo, heading: 'Votre réservation est confirmée', intro: `${hello} bonne nouvelle : ${ctx.venue?.name} a accepté votre demande.`, rows, note: ctx.venue?.arrivalInstructions ? `Informations d'arrivée : ${ctx.venue.arrivalInstructions}` : "Le règlement s'effectue directement auprès de la maison d'hôtes, sauf indication contraire.", ...cta };
    case 'rejected': {
      const reason = [...(r.statusHistory ?? [])].reverse().find((h: any) => h.to === 'rejected')?.reason;
      return { demo, heading: 'Demande de réservation refusée', intro: `${hello} ${ctx.venue?.name} ne peut malheureusement pas accepter votre demande.${reason ? ` Motif : ${reason}.` : ''} Les dates ont été libérées.`, rows, ...cta };
    }
    case 'cancelled_by_customer':
      return { demo, heading: 'Réservation annulée', intro: `${hello} votre annulation a bien été enregistrée.`, rows, ...cta };
    case 'cancelled_by_host': {
      const reason = [...(r.statusHistory ?? [])].reverse().find((h: any) => h.to === 'cancelled')?.reason;
      return { demo, heading: 'Réservation annulée par la maison', intro: `${hello} ${ctx.venue?.name} a annulé votre réservation.${reason ? ` Motif : ${reason}.` : ''}`, rows, ...cta };
    }
    case 'expired':
      return { demo, heading: 'Demande expirée', intro: `${hello} la maison d'hôtes n'a pas répondu dans le délai prévu. Votre demande a expiré et aucune réservation n'a été créée.`, rows, ...cta };
    default:
      return null;
  }
}

function ownerView(event: BookingEvent, ctx: Ctx): EmailView | null {
  const c = mailerConfig();
  const r = ctx.r;
  const demo = !!r.isDemo;
  const rows: [string, string][] = [
    ...baseRows(ctx),
    ['Client', guestName(r) || '—'],
    ['Téléphone', r.customerPhone ?? r.guestPhone ?? '—'],
    ['E-mail', r.customerEmail ?? '—'],
    ...(r.specialRequest ? ([['Demande particulière', r.specialRequest]] as [string, string][]) : []),
  ];
  const cta = { ctaLabel: 'Ouvrir mon calendrier', ctaUrl: `${c.appBaseUrl}/owner/calendrier` };
  switch (event) {
    case 'request_received':
      return { demo, heading: 'Nouvelle demande de réservation', intro: `Une demande attend votre réponse pour ${ctx.venue?.name}. Sans réponse, elle expirera automatiquement.`, rows, ...cta };
    case 'instant_confirmed':
      return { demo, heading: 'Nouvelle réservation instantanée', intro: `Une réservation a été confirmée automatiquement pour ${ctx.venue?.name} (réservation instantanée activée).`, rows, ...cta };
    case 'cancelled_by_customer':
      return { demo, heading: 'Annulation par le client', intro: `Le client a annulé sa réservation pour ${ctx.venue?.name}. Les dates sont de nouveau disponibles.`, rows, ...cta };
    case 'expired':
      return { demo, heading: 'Demande expirée sans réponse', intro: `La demande ci-dessous a expiré faute de réponse. Les dates ont été libérées.`, rows, ...cta };
    default:
      return null;
  }
}

function adminView(event: BookingEvent, ctx: Ctx): EmailView | null {
  if (event !== 'request_received' && event !== 'instant_confirmed') return null;
  const c = mailerConfig();
  return {
    demo: !!ctx.r.isDemo,
    heading: event === 'instant_confirmed' ? 'Nouvelle réservation (instantanée)' : 'Nouvelle demande de réservation',
    intro: `Activité plateforme — ${ctx.venue?.name}${ctx.owner ? ` (propriétaire : ${ctx.owner.fullName ?? ctx.owner.email})` : ' (aucun propriétaire assigné)'}.`,
    rows: baseRows(ctx),
    ctaLabel: 'Ouvrir la console',
    ctaUrl: `${c.appBaseUrl}/admin/calendrier`,
  };
}

const subjectPrefix = (demo: boolean) => (demo ? '[DÉMO] ' : '');

/**
 * Queue every e-mail for one booking event. Never throws: notifications must not break bookings.
 * `trackToken` (plain access token) is only available right after creation.
 */
export async function notifyBookingEvent(reservationId: unknown, event: BookingEvent, opts: { trackToken?: string } = {}): Promise<number> {
  try {
    const r: any = await Reservation.findById(reservationId).lean();
    if (!r) return 0;
    const venue: any = await Venue.findById(r.venueId).select('name ownerId arrivalInstructions').lean();
    const owner: any = venue?.ownerId ? await User.findById(venue.ownerId).select('email fullName isActive').lean() : null;
    let unitName = 'Maison entière';
    if (r.unitScope !== 'entire') {
      const ids = r.roomIds?.length ? r.roomIds : r.roomId ? [r.roomId] : [];
      const rooms = await Room.find({ _id: { $in: ids } }).select('name roomNumber').lean();
      unitName = rooms.map((x: any) => x.name || `Chambre ${x.roomNumber}`).join(' + ') || 'Chambre';
    }
    const c = mailerConfig();
    const trackUrl = opts.trackToken ? `${c.appBaseUrl}/reservation-demande/${encodeURIComponent(r.reservationCode)}?t=${opts.trackToken}` : undefined;
    const ctx: Ctx = { r, venue, owner, unitName, trackUrl };
    const ref = r.reservationCode;
    const demo = !!r.isDemo;
    let queued = 0;

    const queue = async (role: 'customer' | 'owner' | 'admin', to: string | undefined, view: EmailView | null, subject: string) => {
      if (!to || !view) return;
      const { html, text } = renderLayout(view);
      const res = await enqueueEmail({ key: `${r._id}:${event}:${role}`, event, to, recipientRole: role, subject: `${subjectPrefix(demo)}${subject}`, html, text, reservationId: r._id, isDemo: demo });
      if (res.queued) queued += 1;
    };

    const venueName = venue?.name ?? 'Exploria360';
    const customerSubject: Record<string, string> = {
      request_received: `Demande reçue — ${ref} — ${venueName}`,
      instant_confirmed: `Réservation confirmée — ${ref} — ${venueName}`,
      confirmed: `Réservation confirmée — ${ref} — ${venueName}`,
      rejected: `Demande refusée — ${ref}`,
      cancelled_by_customer: `Annulation confirmée — ${ref}`,
      cancelled_by_host: `Réservation annulée — ${ref}`,
      expired: `Demande expirée — ${ref}`,
    };
    const ownerSubject: Record<string, string> = {
      request_received: `Nouvelle demande ${ref} — à confirmer`,
      instant_confirmed: `Nouvelle réservation ${ref} (instantanée)`,
      cancelled_by_customer: `Annulation client — ${ref}`,
      expired: `Demande expirée — ${ref}`,
    };

    if (customerSubject[event]) await queue('customer', r.customerEmail, customerView(event, ctx), customerSubject[event]);
    if (ownerSubject[event] && owner?.email && owner.isActive !== false) await queue('owner', owner.email, ownerView(event, ctx), ownerSubject[event]);
    const admin = c.adminEmail;
    if (admin) await queue('admin', admin, adminView(event, ctx), event === 'instant_confirmed' ? `Nouvelle réservation ${ref}` : `Nouvelle demande ${ref}`);

    if (queued) kickOutbox();
    return queued;
  } catch (err) {
    logger.warn('notifyBookingEvent failed', { event, reservationId: String(reservationId), error: String(err) });
    return 0;
  }
}

/** Generic account e-mail (password setup/reset). */
export async function queueAccountEmail(args: { key: string; to: string; subject: string; heading: string; intro: string; ctaLabel: string; ctaUrl: string; note?: string }) {
  const { html, text } = renderLayout({ heading: args.heading, intro: args.intro, rows: [], ctaLabel: args.ctaLabel, ctaUrl: args.ctaUrl, note: args.note });
  const res = await enqueueEmail({ key: args.key, event: 'account', to: args.to, recipientRole: 'account', subject: args.subject, html, text });
  kickOutbox();
  return res;
}
