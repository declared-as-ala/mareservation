'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { lookupBooking } from '@/lib/api/bookings';
import { formatLong, formatMoney } from '@/lib/booking/dates';

const STATUS: Record<string, { label: string; tone: string; text: string }> = {
  pending: { label: 'En attente de confirmation', tone: 'text-orange-300 border-orange-500/30 bg-orange-500/10', text: 'La maison d’hôtes examine votre demande. Vous serez informé(e) de sa décision.' },
  confirmed: { label: 'Confirmée', tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10', text: 'Votre réservation est confirmée. Présentez cette référence à votre arrivée.' },
  rejected: { label: 'Refusée', tone: 'text-red-300 border-red-500/30 bg-red-500/10', text: 'La maison d’hôtes n’a pas pu accepter cette demande.' },
  cancelled: { label: 'Annulée', tone: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10', text: 'Cette réservation a été annulée.' },
  expired: { label: 'Expirée', tone: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10', text: 'Sans réponse dans le délai prévu, la demande a expiré et les dates ont été libérées.' },
};

function Tracker() {
  const { reference } = useParams<{ reference: string }>();
  const token = useSearchParams().get('t') ?? '';
  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking-lookup', reference, token],
    queryFn: () => lookupBooking(reference, token),
    enabled: !!token,
    retry: false, // a wrong link is a definitive 404 — show it immediately
    refetchInterval: (q) => (q.state.status === 'error' ? false : 30_000),
  });

  if (!token || isError) {
    return <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">Demande introuvable. Vérifiez le lien reçu lors de votre réservation.</p>;
  }
  if (isLoading || !data) return <p className="text-neutral-400">Chargement…</p>;

  const st = STATUS[String(data.status).toLowerCase()] ?? { label: data.status, tone: 'text-white border-white/20', text: '' };
  const s = data.summary;
  const rows: [string, string | undefined][] = [
    ['Maison', s.venueName],
    ['Hébergement', s.roomName],
    ['Arrivée', formatLong(s.checkIn)],
    ['Départ', formatLong(s.checkOut)],
    ['Durée', `${s.nights} nuit${s.nights > 1 ? 's' : ''}`],
    ['Voyageurs', `${s.adults} adulte(s)${s.children ? `, ${s.children} enfant(s)` : ''}`],
    ['Total estimé', s.total != null ? formatMoney(s.total) : 'À confirmer'],
  ];
  return (
    <div className="space-y-6">
      <p className="font-mono text-3xl font-bold tracking-wider text-amber-300">{data.reference}</p>
      <div role="status" className={`rounded-2xl border p-5 ${st.tone}`}>
        <p className="text-lg font-bold">{st.label}</p>
        <p className="mt-1 text-sm opacity-90">{st.text}{data.statusReason ? ` Motif : ${data.statusReason}` : ''}</p>
      </div>
      <dl className="space-y-2 rounded-2xl border border-white/10 bg-[#111112] p-5 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
            <dt className="text-neutral-500">{k}</dt>
            <dd className="text-right font-medium text-white">{v}</dd>
          </div>
        ))}
      </dl>
      <Link href="/accommodations" className="inline-flex h-12 items-center rounded-2xl border border-white/15 px-6 text-sm font-bold text-white hover:bg-white/10">
        Retour aux maisons d&apos;hôtes
      </Link>
    </div>
  );
}

export default function BookingTrackingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14 text-white sm:py-20">
      <h1 className="mb-6 font-serif text-4xl font-black">Suivi de ma demande</h1>
      <Suspense fallback={<p className="text-neutral-400">Chargement…</p>}>
        <Tracker />
      </Suspense>
    </div>
  );
}
