'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookingApiError, CANCELLATION_LABEL, cancelBooking, lookupBooking } from '@/lib/api/bookings';
import { formatLong, formatMoney } from '@/lib/booking/dates';

const STATUS: Record<string, { label: string; tone: string; text: string }> = {
  pending: { label: 'En attente de confirmation', tone: 'text-orange-300 border-orange-500/30 bg-orange-500/10', text: 'La maison d’hôtes examine votre demande. Vous recevrez sa décision par e-mail.' },
  confirmed: { label: 'Confirmée', tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10', text: 'Votre réservation est confirmée. Présentez cette référence à votre arrivée.' },
  rejected: { label: 'Refusée', tone: 'text-red-300 border-red-500/30 bg-red-500/10', text: 'La maison d’hôtes n’a pas pu accepter cette demande.' },
  cancelled: { label: 'Annulée', tone: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10', text: 'Cette réservation a été annulée.' },
  expired: { label: 'Expirée', tone: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10', text: 'Sans réponse dans le délai prévu, la demande a expiré et les dates ont été libérées.' },
  completed: { label: 'Séjour terminé', tone: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10', text: 'Merci pour votre séjour.' },
  no_show: { label: 'Non présenté', tone: 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10', text: 'Vous ne vous êtes pas présenté(e) à la date prévue.' },
};
const PAYMENT: Record<string, string> = { unpaid: 'Non payé — règlement sur place', pending: 'Paiement en vérification', paid: 'Payé', refunded: 'Remboursé', failed: 'Paiement échoué' };

function Tracker() {
  const { reference } = useParams<{ reference: string }>();
  const token = useSearchParams().get('t') ?? '';
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [cancelErr, setCancelErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
    ['Hébergement (nuits)', s.subtotal != null ? formatMoney(s.subtotal) : undefined],
    ['Frais de ménage', s.cleaningFee ? formatMoney(s.cleaningFee) : undefined],
    ['Frais de service', s.serviceFee ? formatMoney(s.serviceFee) : undefined],
    ['Total', s.total != null ? formatMoney(s.total) : 'À confirmer'],
    ['Paiement', data.isDemo ? 'Aucun (démonstration)' : PAYMENT[data.paymentStatus ?? 'unpaid']],
  ];
  const policy = data.cancellationPolicy ? CANCELLATION_LABEL[data.cancellationPolicy] : null;

  async function doCancel() {
    setBusy(true);
    setCancelErr(null);
    try {
      await cancelBooking(reference, token);
      setConfirming(false);
      await qc.invalidateQueries({ queryKey: ['booking-lookup', reference, token] });
    } catch (e) {
      setCancelErr(e instanceof BookingApiError ? e.message : 'Annulation impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-mono text-3xl font-bold tracking-wider text-amber-300">{data.reference}</p>
      {data.isDemo && <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200">DÉMO — réservation simulée sur une fiche de démonstration : aucun séjour réel, aucun paiement.</p>}
      <div role="status" className={`rounded-2xl border p-5 ${st.tone}`}>
        <p className="text-lg font-bold">{st.label}</p>
        <p className="mt-1 text-sm opacity-90">{st.text}{data.statusReason ? ` Motif : ${data.statusReason}` : ''}</p>
      </div>
      {data.arrivalInstructions && (
        <div className="rounded-2xl border border-white/10 bg-[#111112] p-5 text-sm">
          <p className="font-semibold text-white">Informations d’arrivée</p>
          <p className="mt-1 whitespace-pre-line text-neutral-300">{data.arrivalInstructions}</p>
        </div>
      )}
      <dl className="space-y-2 rounded-2xl border border-white/10 bg-[#111112] p-5 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
            <dt className="text-neutral-500">{k}</dt>
            <dd className="text-right font-medium text-white">{v}</dd>
          </div>
        ))}
      </dl>

      {data.history && data.history.length > 0 && (
        <ol className="space-y-2 border-l border-white/10 pl-4 text-sm" aria-label="Historique">
          {data.history.map((h, i) => (
            <li key={i} className="text-neutral-400">
              <span className="text-white">{STATUS[h.to]?.label ?? h.to}</span> — {new Date(h.at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
            </li>
          ))}
        </ol>
      )}

      {data.cancellable && (
        <div className="rounded-2xl border border-white/10 bg-[#111112] p-5 text-sm">
          {policy && <p className="text-neutral-400">Politique d’annulation {policy.title.toLowerCase()} : {policy.text}</p>}
          {data.cancellationNotes && <p className="mt-1 text-neutral-500">{data.cancellationNotes}</p>}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} className="mt-4 h-11 rounded-xl border border-red-500/40 px-5 font-semibold text-red-300 hover:bg-red-500/10">Annuler ma réservation</button>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-white">Confirmer l’annulation ?</span>
              <button type="button" disabled={busy} onClick={doCancel} className="h-11 rounded-xl bg-red-500 px-5 font-semibold text-white disabled:opacity-60">Oui, annuler</button>
              <button type="button" onClick={() => setConfirming(false)} className="h-11 rounded-xl border border-white/15 px-5 text-white">Non</button>
            </div>
          )}
          {cancelErr && <p role="alert" className="mt-3 text-red-300">{cancelErr}</p>}
        </div>
      )}

      <Link href={s.venueSlug ? `/maison-d-hote/${s.venueSlug}` : '/maisons-d-hotes'} className="inline-flex h-12 items-center rounded-2xl border border-white/15 px-6 text-sm font-bold text-white hover:bg-white/10">
        Retour à la maison d&apos;hôtes
      </Link>
    </div>
  );
}

export default function BookingTrackingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14 text-white sm:py-20">
      <h1 className="mb-6 font-serif text-4xl font-black">Ma réservation</h1>
      <Suspense fallback={<p className="text-neutral-400">Chargement…</p>}>
        <Tracker />
      </Suspense>
    </div>
  );
}
