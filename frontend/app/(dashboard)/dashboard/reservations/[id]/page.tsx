'use client';

/** Reservation detail (served at /mes-reservations/[id]). Stays show dates/nights; slots show times. */
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchReservationById } from '@/lib/api/reservations';
import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import { ArrowLeft, CalendarDays, Clock3, Hash, MapPin, Moon, Users, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

type VenueRef = string | { name?: string; address?: string; city?: string; slug?: string } | null | undefined;

const venueOf = (v: VenueRef) => (typeof v === 'object' && v ? v : {});

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente de l’hôte',
  CONFIRMED: 'Confirmée',
  CHECKED_IN: 'En cours',
  CANCELLED: 'Annulée',
  REJECTED: 'Refusée',
  COMPLETED: 'Terminée',
  EXPIRED: 'Expirée',
};
const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  CONFIRMED: 'bg-emerald-100 text-emerald-900',
  CHECKED_IN: 'bg-emerald-100 text-emerald-900',
  CANCELLED: 'bg-red-50 text-red-800',
  REJECTED: 'bg-red-50 text-red-800',
};

const longDay = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function Row({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <Icon className="mt-0.5 size-[18px] shrink-0 text-[#8a5a00]" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-[#847b6d]">{label}</dt>
        <dd className="mt-0.5 text-[15px] text-[#17140f]">{children}</dd>
      </div>
    </div>
  );
}

const backLink = (
  <Link href="/mes-reservations" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3b362e] hover:text-[#17140f]">
    <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" /> Mes réservations
  </Link>
);

export default function ReservationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: reservation, isLoading, error, refetch } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => fetchReservationById(id),
    enabled: !!id,
  });

  if (isLoading) return <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14"><DetailPageSkeleton /></div>;
  if (!id || error || !reservation) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:py-14">
        {backLink}
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const r = reservation as typeof reservation & { nights?: number; reservationCode?: string; adults?: number; children?: number; currency?: string };
  const venue = venueOf(r.venueId as VenueRef);
  const start = new Date(r.startAt);
  const end = new Date(r.endAt);
  const nights = r.nights ?? Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const isStay = nights >= 1;
  const status = String(r.status ?? '').toUpperCase();
  const address = [venue.address, venue.city].filter(Boolean).join(', ');
  const guests = r.adults != null ? r.adults + (r.children ?? 0) : r.partySize;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:py-14">
      {backLink}

      <article className="rounded-3xl border border-[#17140f]/10 bg-white p-5 shadow-[0_1px_0_rgba(23,20,15,0.04),0_10px_30px_rgba(23,20,15,0.05)] sm:p-7">
        <header className="flex flex-col gap-3 border-b border-[#17140f]/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a5a00]">{isStay ? 'Séjour' : 'Réservation'}</p>
            <h1 className="mt-1 font-serif text-[clamp(1.5rem,4vw,2rem)] leading-tight text-[#17140f]">{venue.name ?? 'Maison d’hôtes'}</h1>
          </div>
          <span className={cn('w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold', STATUS_TONE[status] ?? 'bg-[#17140f]/[0.06] text-[#3b362e]')}>
            {STATUS_LABEL[status] ?? r.status}
          </span>
        </header>

        <dl className="divide-y divide-[#17140f]/[0.07]">
          {isStay ? (
            <>
              <Row icon={CalendarDays} label="Arrivée">{longDay(start)}</Row>
              <Row icon={CalendarDays} label="Départ">{longDay(end)}</Row>
              <Row icon={Moon} label="Durée">{nights} nuit{nights > 1 ? 's' : ''}</Row>
            </>
          ) : (
            <>
              <Row icon={CalendarDays} label="Date">{longDay(start)}</Row>
              <Row icon={Clock3} label="Horaire">
                {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Row>
            </>
          )}
          {guests != null && <Row icon={Users} label={isStay ? 'Voyageurs' : 'Personnes'}>{guests}</Row>}
          {address && <Row icon={MapPin} label="Adresse">{address}</Row>}
          {r.totalPrice != null && (
            <Row icon={Wallet} label="Total">
              <span className="font-semibold tabular-nums">{r.totalPrice} {r.currency ?? 'TND'}</span>
              {isStay && <span className="text-[#847b6d]"> · aucun paiement en ligne</span>}
            </Row>
          )}
          {(r.reservationCode || r.confirmationCode) && (
            <Row icon={Hash} label="Référence">
              <span className="font-mono text-sm tracking-wide">{r.reservationCode ?? r.confirmationCode}</span>
            </Row>
          )}
        </dl>
      </article>

      <div className="flex flex-col gap-3 sm:flex-row">
        {venue.slug && (
          <Link
            href={`/maison-d-hote/${venue.slug}`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#e0a527] px-6 text-sm font-semibold text-[#17140f] transition-colors hover:bg-[#f0b93a]"
          >
            Revoir la maison en 360°
          </Link>
        )}
        {!isStay && (
          <Link
            href={`/reservation/${id}/confirmation`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#17140f]/12 bg-white px-6 text-sm font-semibold text-[#17140f] hover:bg-[#17140f]/[0.04]"
          >
            Voir le ticket
          </Link>
        )}
      </div>
    </div>
  );
}
