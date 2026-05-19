'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BedDouble,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Download,
  ExternalLink,
  Hotel,
  Loader2,
  MapPin,
  Phone,
  Printer,
  QrCode,
  Receipt,
  Share2,
  Shield,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PopulatedVenue {
  _id?: string;
  name?: string;
  slug?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  coverImage?: string;
}

interface PopulatedRoom {
  _id?: string;
  name?: string;
  roomNumber?: number;
  roomType?: string;
  pricePerNight?: number;
  coverImage?: string;
  gallery?: string[];
  capacity?: number;
  capacityAdults?: number;
  bedType?: string;
  surface?: number;
  amenities?: string[];
}

interface TicketReservation {
  _id: string;
  reservationCode?: string;
  confirmationCode: string;
  status: string;
  paymentStatus: string;
  paymentOption?: 'online' | 'deposit' | 'pay_at_hotel';
  totalPrice: number;
  amountPaid?: number;
  remainingAmount?: number;
  startAt: string;
  endAt: string;
  nights?: number;
  adults?: number;
  children?: number;
  partySize?: number;
  arrivalTime?: string;
  qrCodeImageUrl?: string;
  cancellationDeadline?: string;
  guestFirstName?: string;
  guestLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  extras?: Array<{ key: string; name: string; quantity: number; unitPrice: number; unit?: string }>;
  priceBreakdown?: { subtotal?: number; taxes?: number; extrasTotal?: number; total?: number; currency?: string };
  venueId?: PopulatedVenue | string;
  roomId?: PopulatedRoom | string;
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtMoney(n?: number) {
  return `${Math.round(n ?? 0).toLocaleString('fr-FR')} DT`;
}

const STATUS_LABEL: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'neutral' }> = {
  confirmed: { label: 'Confirmée', tone: 'green' },
  CONFIRMED: { label: 'Confirmée', tone: 'green' },
  pending: { label: 'En attente de l\'hôtel', tone: 'amber' },
  PENDING: { label: 'En attente de l\'hôtel', tone: 'amber' },
  checked_in: { label: 'Arrivé(e)', tone: 'green' },
  completed: { label: 'Séjour terminé', tone: 'neutral' },
  cancelled: { label: 'Annulée', tone: 'red' },
  CANCELLED: { label: 'Annulée', tone: 'red' },
};

export function HotelTicket({ reservation, icsUrl }: { reservation: TicketReservation; icsUrl: string }) {
  const venue = (typeof reservation.venueId === 'object' ? reservation.venueId : undefined) as PopulatedVenue | undefined;
  const room = (typeof reservation.roomId === 'object' ? reservation.roomId : undefined) as PopulatedRoom | undefined;

  const status = STATUS_LABEL[reservation.status] ?? { label: reservation.status, tone: 'neutral' as const };
  const refCode = reservation.reservationCode ?? reservation.confirmationCode ?? reservation._id.slice(-8).toUpperCase();
  const cover = room?.coverImage ?? room?.gallery?.[0] ?? venue?.coverImage;
  const nights = reservation.nights ?? Math.max(1, Math.round((new Date(reservation.endAt).getTime() - new Date(reservation.startAt).getTime()) / 86_400_000));
  const guests = (reservation.adults ?? reservation.partySize ?? 1) + (reservation.children ?? 0);

  const [shareLoading, setShareLoading] = useState(false);

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: `Réservation ${venue?.name ?? 'hôtel'} — ${refCode}`,
          text: `Voici ma réservation pour ${venue?.name ?? 'l\'hôtel'} du ${fmtDate(reservation.startAt)} au ${fmtDate(reservation.endAt)}.`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié dans le presse-papiers');
      }
    } catch {
      // silent: user cancelled share
    } finally {
      setShareLoading(false);
    }
  }

  const mapsUrl = venue?.address || venue?.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.name, venue.address, venue.city].filter(Boolean).join(', '))}`
    : undefined;

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100 print:bg-white print:text-black">
      {/* Print stylesheet hint */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-light { background: white !important; color: black !important; border-color: #ddd !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-6">
        {/* ─── Success banner ──────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.04] to-transparent p-8 sm:p-10 print-light"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl no-print" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="size-20 shrink-0 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
            >
              <CheckCircle2 className="size-10 text-emerald-400" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
                    status.tone === 'green' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                    status.tone === 'amber' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                    status.tone === 'red' && 'border-red-500/30 bg-red-500/10 text-red-300',
                    status.tone === 'neutral' && 'border-white/15 bg-white/[0.04] text-neutral-300'
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {status.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-1 text-[11px] text-neutral-300">
                  <Hotel className="size-3" /> Hôtel
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white print:text-black leading-tight">
                Réservation confirmée
              </h1>
              <p className="mt-2 text-sm text-neutral-400 print:text-neutral-700">
                Votre séjour à <span className="text-neutral-200 print:text-black font-medium">{venue?.name ?? 'l\'hôtel'}</span> est enregistré. Un email récapitulatif vous a été envoyé.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 print:bg-white print:border-neutral-300">
                <Receipt className="size-4 text-amber-400" />
                <span className="text-[11px] uppercase tracking-widest text-neutral-500 print:text-neutral-600">Référence</span>
                <span className="font-mono font-bold text-amber-400 tabular-nums">{refCode}</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ─── Ticket card + QR ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: hotel + stay details */}
          <article className="lg:col-span-3 rounded-3xl border border-white/[0.08] bg-[#0C0C0C] overflow-hidden print-light print:border-neutral-300">
            {cover && (
              <div className="relative aspect-[16/8] sm:aspect-[16/7]">
                <Image src={cover} alt={venue?.name ?? 'Hôtel'} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-1.5">
                    <Crown className="size-3" /> {venue?.name ?? 'Hôtel'}
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
                    {room?.name ?? room?.roomType ?? 'Chambre'}
                  </h2>
                  {venue && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-300">
                      <MapPin className="size-3" />
                      {[venue.address, venue.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-5 sm:p-6 space-y-5">
              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <TicketStat icon={Clock} label="Arrivée" value={new Date(reservation.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} sub={reservation.arrivalTime ?? 'dès 14h'} />
                <TicketStat icon={Clock} label="Départ" value={new Date(reservation.endAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} sub="avant 12h" />
                <TicketStat icon={BedDouble} label="Nuits" value={String(nights)} />
                <TicketStat icon={Users} label="Voyageurs" value={String(guests)} sub={reservation.children ? `${reservation.adults ?? guests - reservation.children} adultes · ${reservation.children} enfants` : undefined} />
              </div>

              <div className="h-px bg-white/[0.06] print:bg-neutral-200" />

              {/* Full dates row */}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="Date d'arrivée" value={fmtDate(reservation.startAt)} />
                <Row label="Date de départ" value={fmtDate(reservation.endAt)} />
                <Row label="Voyageur principal" value={[reservation.guestFirstName, reservation.guestLastName].filter(Boolean).join(' ') || '—'} />
                <Row label="Email" value={reservation.customerEmail ?? '—'} mono />
                {reservation.customerPhone && <Row label="Téléphone" value={reservation.customerPhone} mono />}
                {room?.bedType && <Row label="Type de lit" value={room.bedType} />}
                {room?.surface && <Row label="Superficie" value={`${room.surface} m²`} />}
              </dl>

              {/* Extras */}
              {reservation.extras && reservation.extras.length > 0 && (
                <>
                  <div className="h-px bg-white/[0.06] print:bg-neutral-200" />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2 flex items-center gap-1.5">
                      <Sparkles className="size-3 text-amber-400" /> Extras inclus
                    </h4>
                    <ul className="space-y-1.5 text-sm">
                      {reservation.extras.map((e) => (
                        <li key={e.key} className="flex items-center justify-between gap-2 text-neutral-300 print:text-black">
                          <span>· {e.name} <span className="text-neutral-600">× {e.quantity}</span></span>
                          <span className="text-neutral-500 tabular-nums">{fmtMoney(e.unitPrice * e.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Price summary */}
              <div className="h-px bg-white/[0.06] print:bg-neutral-200" />
              <div className="space-y-1.5 text-sm">
                {reservation.priceBreakdown?.subtotal != null && (
                  <PriceLine label="Sous-total" value={fmtMoney(reservation.priceBreakdown.subtotal)} />
                )}
                {reservation.priceBreakdown?.taxes != null && (
                  <PriceLine label="Taxes & frais" value={fmtMoney(reservation.priceBreakdown.taxes)} />
                )}
                {reservation.priceBreakdown?.extrasTotal ? (
                  <PriceLine label="Extras" value={fmtMoney(reservation.priceBreakdown.extrasTotal)} />
                ) : null}
                <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06] print:border-neutral-300">
                  <span className="text-sm font-semibold text-neutral-200 print:text-black">Total</span>
                  <span className="text-xl font-bold text-amber-400 tabular-nums">{fmtMoney(reservation.totalPrice)}</span>
                </div>
                {reservation.amountPaid != null && reservation.remainingAmount != null && (
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <PaidBlock label="Payé" value={fmtMoney(reservation.amountPaid)} tone="green" />
                    <PaidBlock label="À régler sur place" value={fmtMoney(reservation.remainingAmount)} tone="amber" />
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* Right: QR + actions */}
          <aside className="lg:col-span-2 space-y-5">
            <div className="rounded-3xl border border-white/[0.08] bg-[#0C0C0C] overflow-hidden print-light print:border-neutral-300">
              <div className="p-5 sm:p-6 text-center space-y-4">
                <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-amber-400">
                  <QrCode className="size-3" /> Ticket d'accès
                </div>
                <p className="text-sm text-neutral-400 print:text-neutral-700 leading-relaxed">
                  Présentez ce QR à la réception pour un check-in express.
                </p>
                <div className="mx-auto inline-block rounded-2xl bg-white p-4 shadow-xl">
                  {reservation.qrCodeImageUrl ? (
                    <Image
                      src={reservation.qrCodeImageUrl}
                      alt="QR Code de la réservation"
                      width={220}
                      height={220}
                      unoptimized
                      className="block"
                    />
                  ) : (
                    <div className="size-[220px] grid place-items-center text-neutral-400">
                      <QrCode className="size-16" />
                    </div>
                  )}
                </div>
                <div className="font-mono text-xs tracking-[0.3em] text-neutral-500 print:text-neutral-700">
                  {refCode}
                </div>
              </div>

              <div className="border-t border-white/[0.06] bg-black/30 p-4 grid grid-cols-2 gap-2 no-print print:hidden">
                <ActionButton onClick={handlePrint} icon={Download} label="Imprimer / PDF" />
                <ActionButton href={icsUrl} icon={CalendarPlus} label="Ajouter au calendrier" download />
                {venue?.phone && <ActionButton href={`tel:${venue.phone}`} icon={Phone} label="Contacter l'hôtel" />}
                {mapsUrl && <ActionButton href={mapsUrl} icon={MapPin} label="Itinéraire" external />}
                <ActionButton onClick={handleShare} icon={shareLoading ? Loader2 : Share2} label="Partager" spin={shareLoading} />
                <ActionButton onClick={() => window.print()} icon={Printer} label="Version papier" />
              </div>
            </div>

            {/* Cancellation policy */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs text-neutral-400 leading-relaxed print:bg-neutral-50 print:text-neutral-700 print:border-neutral-300">
              <div className="flex items-start gap-2 mb-2">
                <Shield className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-semibold text-neutral-200 print:text-black">Politique d'annulation</span>
              </div>
              {reservation.cancellationDeadline ? (
                <p>
                  Annulation <span className="text-emerald-300 font-semibold print:text-emerald-700">gratuite</span> jusqu'au{' '}
                  <span className="font-medium text-neutral-200 print:text-black">{fmtDate(reservation.cancellationDeadline)}</span>.
                </p>
              ) : (
                <p>Annulation gratuite jusqu'à 24h avant l'arrivée.</p>
              )}
            </div>
          </aside>
        </section>

        {/* ─── Hotel info + next steps ─────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {venue && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3 print-light print:border-neutral-300">
              <h3 className="text-sm font-semibold text-neutral-200 print:text-black flex items-center gap-2">
                <Hotel className="size-4 text-amber-400" /> Coordonnées de l'hôtel
              </h3>
              <ul className="space-y-2 text-sm text-neutral-400 print:text-neutral-700">
                {venue.address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="size-4 text-neutral-600 mt-0.5 shrink-0" />
                    <span>{[venue.address, venue.city].filter(Boolean).join(', ')}</span>
                  </li>
                )}
                {venue.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="size-4 text-neutral-600 shrink-0" />
                    <a href={`tel:${venue.phone}`} className="text-amber-400 hover:underline">{venue.phone}</a>
                  </li>
                )}
                {venue.slug && (
                  <li>
                    <Link href={`/hotel/${venue.slug}`} className="inline-flex items-center gap-1 text-amber-400 hover:underline text-xs">
                      Voir la fiche complète <ChevronRight className="size-3" />
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3 print-light print:border-neutral-300">
            <h3 className="text-sm font-semibold text-neutral-200 print:text-black flex items-center gap-2">
              <Star className="size-4 text-amber-400" /> Instructions de check-in
            </h3>
            <ol className="space-y-2 text-sm text-neutral-400 print:text-neutral-700 list-decimal list-inside">
              <li>Arrivée à partir de <span className="text-neutral-200 print:text-black font-medium">14h00</span></li>
              <li>Présentez une pièce d'identité valide</li>
              <li>Présentez ce QR code à la réception</li>
              {reservation.remainingAmount && reservation.remainingAmount > 0 ? (
                <li>Réglez le solde restant : <span className="text-amber-400 font-semibold">{fmtMoney(reservation.remainingAmount)}</span></li>
              ) : null}
            </ol>
          </div>
        </section>

        {/* ─── Footer CTAs ─────────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row gap-3 pt-2 no-print print:hidden">
          <Link
            href="/mes-reservations"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold h-12 px-6 text-sm shadow-lg shadow-amber-400/25 transition-all"
          >
            Mes réservations
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/hotels"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-neutral-300 hover:text-white hover:border-white/20 h-12 px-6 text-sm font-medium transition-all"
          >
            Explorer d'autres hôtels
          </Link>
        </section>
      </div>
    </div>
  );
}

/* ─── primitives ───────────────────────────────────────────────────── */

function TicketStat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 print:border-neutral-200">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-600 print:text-neutral-500 font-medium mb-1">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="text-sm font-bold text-neutral-100 print:text-black">{value}</div>
      {sub && <div className="text-[10px] text-neutral-600 print:text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-neutral-600 print:text-neutral-500 font-medium">{label}</dt>
      <dd className={cn('mt-0.5 text-sm text-neutral-200 print:text-black', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-neutral-500 print:text-neutral-700">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function PaidBlock({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-2',
        tone === 'green' ? 'border-emerald-500/25 bg-emerald-500/[0.05]' : 'border-amber-500/25 bg-amber-500/[0.05]'
      )}
    >
      <div className={cn('text-[10px] uppercase tracking-widest font-medium', tone === 'green' ? 'text-emerald-300' : 'text-amber-300')}>
        {label}
      </div>
      <div className={cn('font-semibold tabular-nums', tone === 'green' ? 'text-emerald-200' : 'text-amber-200')}>
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  href,
  download,
  external,
  spin,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
  download?: boolean;
  external?: boolean;
  spin?: boolean;
}) {
  const cls =
    'flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-[11px] font-medium text-neutral-300 hover:text-white h-10 px-2.5 transition-all';
  const inner = (
    <>
      <Icon className={cn('size-3.5', spin && 'animate-spin')} />
      <span className="truncate">{label}</span>
      {external && <ExternalLink className="size-3 opacity-50" />}
    </>
  );
  if (href) {
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} download={download} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
