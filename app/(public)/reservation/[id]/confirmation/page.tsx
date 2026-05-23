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
  const code = reservation.confirmationCode ?? reservation.reservationCode ?? reservation._id.slice(-8).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="size-10 text-emerald-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-zinc-100">Reservation confirmee</h1>
          <p className="mb-4 text-sm text-zinc-400">Votre reservation a bien ete enregistree.</p>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2">
            <QrCode className="size-4 text-amber-400" />
            <span className="font-mono text-sm font-semibold tracking-wider text-amber-400">{code}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">{venueName}</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <Calendar className="size-4 shrink-0 text-amber-400/60" />
              <span>{formatDate(start)}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock className="size-4 shrink-0 text-amber-400/60" />
              <span>{formatTimeRange(start, end)}</span>
            </div>
            {reservation.partySize != null && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Users className="size-4 shrink-0 text-amber-400/60" />
                <span>{reservation.partySize} personne{reservation.partySize > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          {reservation.totalPrice != null && reservation.totalPrice > 0 && (
            <p className="mt-4 font-semibold text-amber-400">Total : {formatMoney(reservation.totalPrice)}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1 rounded-full bg-amber-400 font-bold text-zinc-950 hover:bg-amber-300">
            <Link href="/mes-reservations">Voir mes reservations</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 rounded-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Link href="/explorer">Explorer les lieux</Link>
          </Button>
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
