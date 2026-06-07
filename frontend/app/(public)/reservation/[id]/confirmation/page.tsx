'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchReservationById } from '@/lib/api/reservations';
import { fetchHotelTicket, getCalendarIcsUrl } from '@/lib/api/hotel-checkout';
import type { Reservation } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import {
  Armchair,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
  Printer,
  QrCode,
  Receipt,
  Share2,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { HotelTicket } from '@/components/hotel/HotelTicket';

type PopulatedEvent = {
  _id?: string;
  title?: string;
  slug?: string;
  type?: string;
  description?: string;
  coverImage?: string;
  afficheImageUrl?: string;
  galleryUrls?: string[];
  startAt?: string;
  endsAt?: string;
  organizerName?: string;
  ageRestriction?: string;
};

type PopulatedVenue = {
  _id?: string;
  name?: string;
  city?: string;
  address?: string;
  type?: string;
  coverImage?: string;
  phone?: string;
};

function asEvent(eventId: Reservation['eventId']): PopulatedEvent | null {
  return typeof eventId === 'object' && eventId ? eventId as PopulatedEvent : null;
}

function asVenue(venueId: Reservation['venueId']): PopulatedVenue | null {
  return typeof venueId === 'object' && venueId ? venueId as PopulatedVenue : null;
}

function getVenueName(r: Reservation) {
  return asVenue(r.venueId)?.name || 'Lieu';
}

function getEventName(r: Reservation) {
  return asEvent(r.eventId)?.title || '';
}

function getEventImage(r: Reservation): string | null {
  const event = asEvent(r.eventId);
  const venue = asVenue(r.venueId);
  return (
    event?.coverImage ||
    event?.afficheImageUrl ||
    event?.galleryUrls?.[0] ||
    venue?.coverImage ||
    null
  );
}

function getTicketLabel(notes?: string) {
  if (!notes?.includes('event_ticket:')) return '';
  const raw = notes.split('event_ticket:')[1]?.split(';')[0];
  return raw || '';
}

function formatMoney(value?: number) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeRange(start: Date, end: Date) {
  return `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

function paymentLabel(status?: string, method?: string) {
  if (status === 'paid') return 'Paye en ligne';
  if (status === 'pending') return method === 'cash' ? 'Cash en attente' : 'Paiement en attente';
  if (status === 'failed') return 'Paiement echoue';
  return 'Non paye';
}

function EventTicketView({ reservation }: { reservation: Reservation }) {
  const start = new Date(reservation.startAt);
  const end = new Date(reservation.endAt);
  const event = asEvent(reservation.eventId);
  const venue = asVenue(reservation.venueId);
  const venueName = getVenueName(reservation);
  const venueLine = [venue?.city, venue?.address].filter(Boolean).join(' - ');
  const eventName = getEventName(reservation) || venueName;
  const eventImage = getEventImage(reservation);
  const ticketLabel = getTicketLabel(reservation.notes) || 'Billet evenement';
  const quantity = reservation.partySize ?? 1;
  const code = reservation.confirmationCode ?? reservation.reservationCode ?? reservation._id.slice(-8).toUpperCase();
  const subtotal = reservation.priceBreakdown?.subtotal;
  const serviceFee = reservation.priceBreakdown?.serviceFee;
  const total = reservation.priceBreakdown?.total ?? reservation.totalPrice;
  const shareTitle = `Ticket MaTable - ${eventName}`;
  const shareText = `${eventName} | ${formatDate(start)} | ${formatTimeRange(start, end)} | Ref: ${code}`;
  const table = reservation.tableId as { tableNumber?: number; name?: string; locationLabel?: string } | undefined;
  const tableName = table ? (table.name || `Table ${table.tableNumber ?? ''}`) : null;

  function currentShareUrl() {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  function openShareWindow(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=720');
  }

  function handleShareError(error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    toast.error("Impossible de partager le ticket.");
  }

  async function copyShareText() {
    const text = `${shareText}\n${currentShareUrl()}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    toast.success('Lien du ticket copie.');
  }

  async function shareNative() {
    const url = currentShareUrl();
    if ('share' in navigator && typeof navigator.share === 'function') {
      await navigator.share({ title: shareTitle, text: shareText, url });
      return;
    }
    await copyShareText();
  }

  function shareWhatsApp() {
    openShareWindow(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${currentShareUrl()}`)}`);
  }

  function shareFacebook() {
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentShareUrl())}`);
  }

  async function shareInstagram() {
    if ('share' in navigator && typeof navigator.share === 'function') {
      await shareNative();
      return;
    }
    await copyShareText();
    openShareWindow('https://www.instagram.com/');
  }

  const printTicket = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#070707] px-4 py-8 text-zinc-100 print:bg-white print:px-0 print:py-0">
      <style jsx global>{`
        @media print {
          @page {
            margin: 12mm;
            size: A4;
          }
          body {
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          .event-ticket-paper {
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>

      <main id="event-ticket-print" className="mx-auto max-w-5xl print:max-w-none">
        <header className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="size-4" />
              Ticket confirme
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Votre ticket est pret</h1>
            <p className="mt-1 text-sm text-zinc-500">Gardez ce QR code avec vous et imprimez le ticket si besoin.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => void shareNative().catch(handleShareError)}
              variant="outline"
              className="h-11 rounded-full border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
            >
              <Share2 className="mr-2 size-4" />
              Partager
            </Button>
            <Button
              type="button"
              onClick={printTicket}
              className="h-11 rounded-full bg-amber-400 px-5 font-bold text-black hover:bg-amber-300"
            >
              <Printer className="mr-2 size-4" />
              Imprimer le ticket
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900">
              <Link href="/mes-reservations">Mes reservations</Link>
            </Button>
          </div>
        </header>

        <section className="event-ticket-paper overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/40 print:rounded-none print:border print:border-zinc-300 print:bg-white print:text-black">
          <div className="grid lg:grid-cols-[minmax(0,1.18fr)_360px]">
            <div className="min-w-0">
              <div className="relative min-h-[300px] overflow-hidden bg-zinc-900 print:min-h-[220px]">
                {eventImage ? (
                  <img
                    src={eventImage}
                    alt={eventName}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.26),transparent_30%),linear-gradient(135deg,#18181b,#020617)]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.88))] print:bg-black/35" />
                <div className="absolute left-5 right-5 top-5 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-white/20 bg-black/45 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur">
                    MaTable Ticket
                  </span>
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-black">
                    {paymentLabel(reservation.paymentStatus, reservation.paymentMethod)}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{ticketLabel}</p>
                  <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl print:text-3xl">
                    {eventName}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-white backdrop-blur">
                      <Calendar className="size-3.5 text-amber-300" />
                      {formatDate(start)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-white backdrop-blur">
                      <Clock className="size-3.5 text-amber-300" />
                      {formatTimeRange(start, end)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-white backdrop-blur">
                      <Users className="size-3.5 text-amber-300" />
                      {quantity} billet{quantity > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:p-7 print:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <TicketFact icon={MapPin} label="Lieu" value={venueName} sub={venueLine || undefined} />
                  <TicketFact icon={Ticket} label="Type" value={ticketLabel} />
                  <TicketFact icon={CreditCard} label="Paiement" value={paymentLabel(reservation.paymentStatus, reservation.paymentMethod)} />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 print:border-zinc-300 print:bg-white">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-100 print:text-black">
                    <Receipt className="size-4 text-amber-300 print:text-black" />
                    Detail du prix
                  </div>
                  <div className="space-y-2 text-sm">
                    {subtotal != null && <PriceRow label="Sous-total billets" value={formatMoney(subtotal)} />}
                    {serviceFee != null && <PriceRow label="Frais service" value={formatMoney(serviceFee)} />}
                    {reservation.priceBreakdown?.discount ? (
                      <PriceRow label="Reduction" value={`- ${formatMoney(reservation.priceBreakdown.discount)}`} />
                    ) : null}
                    <div className="mt-3 border-t border-white/10 pt-3 print:border-zinc-300">
                      <PriceRow label="Total paye" value={formatMoney(total)} strong />
                    </div>
                  </div>
                </div>

                {(event?.organizerName || event?.ageRestriction || reservation.customerEmail) && (
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    {event?.organizerName && <MetaBlock label="Organisateur" value={event.organizerName} />}
                    {event?.ageRestriction && <MetaBlock label="Age" value={event.ageRestriction} />}
                    {reservation.customerEmail && <MetaBlock label="Email" value={reservation.customerEmail} mono />}
                  </div>
                )}
              </div>
            </div>

            <aside className="border-t border-white/10 bg-[#0b0b0b] p-5 sm:p-7 lg:border-l lg:border-t-0 print:border-l print:border-zinc-300 print:bg-white">
              <div className="flex h-full flex-col">
                <div>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 print:text-zinc-600">Reference</p>
                      <p className="mt-1 font-mono text-lg font-black text-amber-300 print:text-black">{code}</p>
                    </div>
                    <ShieldCheck className="size-8 text-emerald-300 print:text-black" />
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white p-4 text-center shadow-xl shadow-black/20 print:border-zinc-300 print:shadow-none">
                    {reservation.qrCodeImageUrl ? (
                      <img
                        src={reservation.qrCodeImageUrl}
                        alt={`QR code ticket ${code}`}
                        className="mx-auto aspect-square w-full max-w-[250px] rounded-xl object-contain"
                      />
                    ) : (
                      <div className="grid aspect-square w-full place-items-center rounded-xl border border-zinc-200 text-center text-black">
                        <div>
                          <QrCode className="mx-auto mb-2 size-12" />
                          <p className="font-mono text-xs">{code}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-center text-xs leading-5 text-zinc-500 print:text-zinc-700">
                    Presentez ce QR code a l'entree. Une piece d'identite peut etre demandee.
                  </p>
                </div>

                <div className="my-6 border-t border-dashed border-white/15 print:border-zinc-300" />

                <dl className="space-y-4 text-sm">
                  <TicketDef label="Client" value={[reservation.customerFirstName, reservation.customerLastName].filter(Boolean).join(' ') || 'Client MaTable'} />
                  <TicketDef label="Date" value={formatDate(start)} />
                  <TicketDef label="Heure" value={formatTimeRange(start, end)} />
                  {tableName && <TicketDef label="Table" value={tableName} />}
                  <TicketDef label="Quantite" value={`${quantity} billet${quantity > 1 ? 's' : ''}`} />
                  <TicketDef label="Total" value={formatMoney(total)} strong />
                </dl>
              </div>
            </aside>
          </div>
        </section>

        <section className="no-print mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Partager le ticket</h2>
              <p className="mt-1 text-xs text-zinc-500">Envoyez le lien et la reference a vos reseaux.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <SocialShareButton icon={MessageCircle} label="WhatsApp" onClick={shareWhatsApp} className="border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10" />
              <SocialShareButton icon={Facebook} label="Facebook" onClick={shareFacebook} className="border-sky-500/25 text-sky-300 hover:bg-sky-500/10" />
              <SocialShareButton icon={Instagram} label="Instagram" onClick={() => void shareInstagram().catch(handleShareError)} className="border-pink-500/25 text-pink-300 hover:bg-pink-500/10" />
              <SocialShareButton icon={Copy} label="Copier" onClick={() => void copyShareText().catch(handleShareError)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-900" />
            </div>
          </div>
        </section>

        <div className="no-print mt-5 grid gap-3 sm:grid-cols-2">
          <Button asChild className="h-12 rounded-full bg-amber-400 font-bold text-black hover:bg-amber-300">
            <Link href="/mes-reservations">Voir mes reservations</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-full border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900">
            <Link href="/explorer">Explorer les lieux</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function SocialShareButton({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 min-w-[128px] cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors ${className ?? ''}`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function TicketFact({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 print:border-zinc-300 print:bg-white">
      <Icon className="mb-3 size-5 text-amber-300 print:text-black" />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 print:text-zinc-600">{label}</p>
      <p className="mt-1 text-sm font-bold text-zinc-100 print:text-black">{value}</p>
      {sub && <p className="mt-1 text-xs leading-5 text-zinc-500 print:text-zinc-700">{sub}</p>}
    </div>
  );
}

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? 'font-black text-zinc-100 print:text-black' : 'text-zinc-400 print:text-zinc-700'}>{label}</span>
      <span className={strong ? 'font-mono text-lg font-black text-amber-300 print:text-black' : 'font-mono text-zinc-200 print:text-black'}>{value}</span>
    </div>
  );
}

function MetaBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 print:border-zinc-300 print:bg-white">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 print:text-zinc-600">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-zinc-100 print:text-black ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function TicketDef({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 print:text-zinc-600">{label}</dt>
      <dd className={`text-right text-sm ${strong ? 'font-mono font-black text-amber-300 print:text-black' : 'font-semibold text-zinc-100 print:text-black'}`}>
        {value}
      </dd>
    </div>
  );
}

function GenericReservationView({ reservation }: { reservation: Reservation }) {
  const start = new Date(reservation.startAt);
  const end = new Date(reservation.endAt);
  const venueName = getVenueName(reservation);
  const venue = asVenue(reservation.venueId);
  const code = reservation.confirmationCode ?? reservation.reservationCode ?? reservation._id.slice(-8).toUpperCase();
  const shareText = `${venueName} | ${formatDate(start)} | ${formatTimeRange(start, end)} | Ref: ${code}`;
  const table = reservation.tableId as { tableNumber?: number; name?: string; locationLabel?: string } | undefined;
  const tableName = table ? (table.name || `Table ${table.tableNumber ?? ''}`) : null;

  function currentShareUrl() {
    return typeof window !== 'undefined' ? window.location.href : '';
  }
  function openShareWindow(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=720');
  }
  function shareWhatsApp() {
    openShareWindow(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${currentShareUrl()}`)}`);
  }
  function shareFacebook() {
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentShareUrl())}`);
  }
  async function shareInstagram() {
    if ('share' in navigator && typeof navigator.share === 'function') {
      try { await navigator.share({ title: venueName, text: shareText, url: currentShareUrl() }); return; } catch {}
    }
    await handleCopyLink();
    openShareWindow('https://www.instagram.com/');
  }
  async function handleCopyLink() {
    const text = `${shareText}\n${currentShareUrl()}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      toast.success('Lien copie !');
    } catch { toast.error('Impossible de copier.'); }
  }

  function printTicketOnly() {
    const ticketEl = document.getElementById('generic-ticket-print');
    if (!ticketEl) { window.print(); return; }
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) { window.print(); return; }
    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Billet MaTable – ${code}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#fff;font-family:'Segoe UI',system-ui,sans-serif;color:#111;padding:24px}
    .ticket{max-width:560px;margin:0 auto;border:2px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .ticket-header{background:linear-gradient(135deg,#064e3b 0%,#065f46 60%,#047857 100%);padding:32px 28px;text-align:center}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:4px 14px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fff;margin-bottom:16px}
    .checkmark{width:60px;height:60px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;border:3px solid rgba(255,255,255,.3)}
    .checkmark svg{width:30px;height:30px;stroke:#fff;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .ticket-header h1{font-size:22px;font-weight:800;color:#fff;margin-bottom:6px}
    .ticket-header p{font-size:13px;color:rgba(255,255,255,.7)}
    .ref-pill{display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:7px 18px;margin-top:16px;font-family:monospace;font-size:16px;font-weight:900;letter-spacing:.18em;color:#fbbf24}
    .tear{height:0;border-top:2px dashed #d1d5db;margin:0 -2px;position:relative}
    .tear::before,.tear::after{content:'';position:absolute;top:-12px;width:22px;height:22px;background:#fff;border-radius:50%;border:2px solid #e5e7eb}
    .tear::before{left:-13px}.tear::after{right:-13px}
    .ticket-body{padding:24px 28px}
    .venue{font-size:18px;font-weight:800;color:#111;margin-bottom:16px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
    .info-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px}
    .info-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px}
    .info-value{font-size:13px;font-weight:700;color:#111}
    .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 28px;text-align:center;font-size:11px;color:#9ca3af}
    .footer strong{color:#374151}
    @media print{body{padding:0}.ticket{border:1px solid #ccc;box-shadow:none}}
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <div class="badge">✓ Confirmation</div>
      <div class="checkmark"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
      <h1>Réservation Confirmée</h1>
      <p>Votre table est réservée</p>
      <div class="ref-pill">⬛ ${code}</div>
    </div>
    <div class="tear"></div>
    <div class="ticket-body">
      <div class="venue">${venueName}</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">📅 Date</div><div class="info-value">${formatDate(start)}</div></div>
        <div class="info-item"><div class="info-label">🕐 Heure</div><div class="info-value">${formatTimeRange(start, end)}</div></div>
        ${reservation.partySize != null ? `<div class="info-item"><div class="info-label">👥 Couverts</div><div class="info-value">${reservation.partySize} personne${reservation.partySize > 1 ? 's' : ''}</div></div>` : ''}
        ${tableName ? `<div class="info-item"><div class="info-label">🪑 Table</div><div class="info-value">${tableName}${table?.locationLabel ? ` (${table.locationLabel})` : ''}</div></div>` : ''}
        ${venue?.city ? `<div class="info-item"><div class="info-label">📍 Ville</div><div class="info-value">${venue.city}</div></div>` : ''}
        ${reservation.totalPrice != null && reservation.totalPrice > 0 ? `<div class="info-item"><div class="info-label">💰 Total</div><div class="info-value">${formatMoney(reservation.totalPrice)}</div></div>` : ''}
        <div class="info-item"><div class="info-label">📋 Référence</div><div class="info-value" style="font-family:monospace;color:#d97706">${code}</div></div>
      </div>
    </div>
    <div class="footer">Présentez cette référence à l'arrivée &nbsp;•&nbsp; <strong>MaTable</strong></div>
  </div>
  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),1000)}<\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  return (
    <div className="min-h-screen bg-[#070707] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* ── Success hero ticket ── */}
        <div id="generic-ticket-print" className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/60">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 px-8 py-10 text-center">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-10 -top-10 size-48 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute -right-10 bottom-0 size-40 rounded-full bg-teal-500/10 blur-3xl" />
            </div>
            {/* Badge */}
            <div className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              Réservation confirmée
            </div>
            {/* Checkmark */}
            <div className="relative mx-auto mb-5 flex size-[72px] items-center justify-center rounded-full border-[3px] border-emerald-400/40 bg-emerald-500/20 shadow-lg shadow-emerald-900/50">
              <CheckCircle2 className="size-9 text-emerald-400" />
            </div>
            <h1 className="relative text-2xl font-black tracking-tight text-white sm:text-3xl">
              Votre table est réservée !
            </h1>
            <p className="relative mt-2 text-sm text-emerald-200/70">
              Un email de confirmation a été envoyé.
            </p>
            {/* Ref pill */}
            <div className="relative mt-5 inline-flex items-center gap-2.5 rounded-full border border-amber-400/30 bg-black/40 px-5 py-2.5 backdrop-blur">
              <QrCode className="size-4 text-amber-400" />
              <span className="font-mono text-base font-black tracking-[0.18em] text-amber-400">{code}</span>
            </div>
          </div>

          {/* Tear line */}
          <div className="relative flex items-center bg-zinc-950">
            <div className="-ml-4 size-8 shrink-0 rounded-full bg-[#070707]" />
            <div className="flex-1 border-t-2 border-dashed border-zinc-700/60" />
            <div className="-mr-4 size-8 shrink-0 rounded-full bg-[#070707]" />
          </div>

          {/* Body */}
          <div className="bg-zinc-950 px-8 py-7">
            <h2 className="mb-5 text-lg font-black text-white">{venueName}</h2>
            <div className={`grid gap-3 ${tableName ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              <div className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-zinc-900/80 p-4">
                <Calendar className="size-4 text-amber-400/70" />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</p>
                <p className="text-sm font-bold text-zinc-100">{formatDate(start)}</p>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-zinc-900/80 p-4">
                <Clock className="size-4 text-amber-400/70" />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Heure</p>
                <p className="text-sm font-bold text-zinc-100">{formatTimeRange(start, end)}</p>
              </div>
              {reservation.partySize != null && (
                <div className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-zinc-900/80 p-4">
                  <Users className="size-4 text-amber-400/70" />
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Couverts</p>
                  <p className="text-sm font-bold text-zinc-100">{reservation.partySize} personne{reservation.partySize > 1 ? 's' : ''}</p>
                </div>
              )}
              {tableName && (
                <div className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-zinc-900/80 p-4">
                  <Armchair className="size-4 text-amber-400/70" />
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Table</p>
                  <p className="text-sm font-bold text-zinc-100">
                    {tableName}
                    {table?.locationLabel && (
                      <span className="block text-[10px] font-medium text-zinc-500 mt-0.5 leading-tight">
                        {table.locationLabel}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
            {(reservation.totalPrice != null && reservation.totalPrice > 0) || reservation.priceBreakdown?.serviceFee ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-5 py-4">
                {reservation.priceBreakdown?.subtotal != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Sous-total</span>
                    <span className="font-semibold text-zinc-300">{formatMoney(reservation.priceBreakdown.subtotal)}</span>
                  </div>
                )}
                {reservation.priceBreakdown?.serviceFee != null && reservation.priceBreakdown.serviceFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Frais de réservation</span>
                    <span className="font-semibold text-amber-400/80">{formatMoney(reservation.priceBreakdown.serviceFee)}</span>
                  </div>
                )}
                {reservation.priceBreakdown?.discount != null && reservation.priceBreakdown.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Réduction</span>
                    <span className="font-semibold text-emerald-400">- {formatMoney(reservation.priceBreakdown.discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-white/8 pt-2">
                  <span className="text-sm font-semibold text-zinc-300">Total à payer</span>
                  <span className="font-mono text-lg font-black text-amber-400">
                    {formatMoney(reservation.priceBreakdown?.total ?? reservation.totalPrice)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer strip */}
          <div className="bg-zinc-900 px-8 py-3 text-center text-xs text-zinc-500">
            Présentez cette référence à l&apos;arrivée &nbsp;•&nbsp; <span className="font-semibold text-zinc-300">MaTable</span>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={printTicketOnly}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            <Printer className="size-4 text-amber-400" />
            Imprimer
          </button>
          <Button asChild className="h-12 rounded-2xl bg-amber-400 font-bold text-zinc-950 hover:bg-amber-300">
            <Link href="/mes-reservations">Mes réservations</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-2xl border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Link href="/explorer">Explorer les lieux</Link>
          </Button>
        </div>

        {/* ── Share card ── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
              <Share2 className="size-4 text-amber-400" />
              Partager ma réservation
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Envoyez le détail à vos proches via vos réseaux.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={shareWhatsApp}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 text-sm font-bold text-emerald-300 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/15"
            >
              <MessageCircle className="size-4 transition-transform group-hover:scale-110" />
              WhatsApp
            </button>
            {/* Facebook */}
            <button
              type="button"
              onClick={shareFacebook}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 text-sm font-bold text-sky-300 transition-all hover:border-sky-500/50 hover:bg-sky-500/15"
            >
              <Facebook className="size-4 transition-transform group-hover:scale-110" />
              Facebook
            </button>
            {/* Instagram */}
            <button
              type="button"
              onClick={() => void shareInstagram()}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-pink-500/25 bg-pink-500/5 px-3 text-sm font-bold text-pink-300 transition-all hover:border-pink-500/50 hover:bg-pink-500/15"
            >
              <Instagram className="size-4 transition-transform group-hover:scale-110" />
              Instagram
            </button>
            {/* Copy link */}
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-bold text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-800"
            >
              <Copy className="size-4 transition-transform group-hover:scale-110" />
              Copier
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ReservationConfirmationPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: reservation, isLoading, error, refetch } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => fetchReservationById(id),
    enabled: !!id,
  });

  const isRoomReservation = reservation?.bookingType === 'ROOM';
  const { data: hotelTicket } = useQuery({
    queryKey: ['hotel-ticket', id],
    queryFn: () => fetchHotelTicket(id),
    enabled: !!id && isRoomReservation,
    retry: 1,
  });

  const data = hotelTicket ?? reservation;

  if (!id) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#080808] px-4 text-center">
        <p className="text-neutral-500">Reservation introuvable.</p>
      </div>
    );
  }

  if (isLoading && !data) {
    return <div className="container px-4 py-8"><DetailPageSkeleton /></div>;
  }

  if ((error && !data) || !data) {
    return (
      <div className="container px-4 py-12">
        <ErrorState title="Reservation introuvable" onRetry={() => refetch()} />
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/mes-reservations">Mes reservations</Link>
        </Button>
      </div>
    );
  }

  if (data.bookingType === 'ROOM') {
    return <HotelTicket reservation={data} icsUrl={getCalendarIcsUrl(id)} />;
  }

  const isEventTicket = Boolean(getEventName(data) || (data as any).source === 'event_checkout' || data.notes?.includes('event_ticket:'));
  if (isEventTicket) {
    return <EventTicketView reservation={data} />;
  }

  return <GenericReservationView reservation={data} />;
}
