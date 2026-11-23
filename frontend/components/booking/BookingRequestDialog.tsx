'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, Copy, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BookingApiError, createBookingRequest, type BookingConfirmation, type Quote, type StayParams,
} from '@/lib/api/bookings';
import { formatLong, formatMoney } from '@/lib/booking/dates';

type AvailableQuote = Extract<Quote, { available: true }>;

interface Props {
  open: boolean;
  onClose: () => void;
  venueName: string;
  params: StayParams;
  quote: AvailableQuote | null;
  onBooked: () => void;
  onConflict: (message: string) => void;
  /** Instant booking: confirmed immediately (otherwise a request the host accepts). */
  instant?: boolean;
  /** Demonstration listing: the booking is a labelled simulation. */
  demo?: boolean;
}

const input =
  'mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-[#0B0B0C] px-4 text-[15px] text-white outline-none transition placeholder:text-neutral-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20';

function newKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function BookingRequestDialog({ open, onClose, venueName, params, quote, onBooked, onConflict, instant = false, demo = false }: Props) {
  const uid = useId();
  const firstField = useRef<HTMLInputElement>(null);
  const idemKey = useRef<string>(newKey());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<BookingConfirmation | null>(null);
  const [copied, setCopied] = useState(false);

  // scroll lock + Escape + initial focus
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => firstField.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      idemKey.current = newKey(); // one key per form opening: double-clicks replay, new attempts don't
      setError(null);
      setFields({});
      setDone(null);
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const f = new FormData(e.currentTarget);
    setSending(true);
    setError(null);
    setFields({});
    try {
      const res = await createBookingRequest(
        {
          ...params,
          guest: {
            firstName: String(f.get('firstName') ?? ''),
            lastName: String(f.get('lastName') ?? ''),
            email: String(f.get('email') ?? ''),
            phone: String(f.get('phone') ?? ''),
          },
          specialRequest: String(f.get('specialRequest') ?? '') || undefined,
          website: String(f.get('website') ?? ''),
        },
        idemKey.current
      );
      setDone(res);
      onBooked();
    } catch (err) {
      if (err instanceof BookingApiError) {
        if (err.status === 409) return onConflict(err.message);
        if (err.status === 422 && err.fields) setFields(err.fields);
        setError(err.status === 429 ? err.message : err.status === 403 ? err.message : err.status === 422 ? 'Veuillez corriger les champs indiqués.' : err.message);
      } else {
        setError('Connexion impossible. Veuillez réessayer.');
      }
    } finally {
      setSending(false);
    }
  }

  const trackUrl = done?.accessToken ? `/reservation-demande/${done.reference}?t=${done.accessToken}` : null;
  const confirmed = String(done?.status ?? '').toLowerCase() === 'confirmed';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} tabIndex={-1} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className="relative max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-[#111112] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem] sm:p-8"
      >
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white">
          <X className="size-5" />
        </button>

        {done ? (
          <div role="status" aria-live="polite" className="pt-2 text-center">
            <CheckCircle2 className="mx-auto size-14 text-emerald-400" aria-hidden="true" />
            <h2 id={`${uid}-title`} className="mt-4 font-serif text-3xl font-black text-white">{confirmed ? 'Réservation confirmée' : 'Demande envoyée'}</h2>
            {done.isDemo && <p className="mx-auto mt-3 max-w-sm rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">DÉMO — réservation simulée : aucun séjour réel, aucun paiement.</p>}
            <p className="mt-2 text-sm text-neutral-400">Votre numéro de référence</p>
            <p className="mt-1 inline-flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-mono text-2xl font-bold tracking-wider text-amber-300">
              {done.reference}
              <button type="button" aria-label="Copier la référence" onClick={() => { void navigator.clipboard?.writeText(done.reference); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                className="rounded-lg p-1.5 text-amber-300/80 hover:bg-amber-400/15"><Copy className="size-4" /></button>
            </p>
            {copied && <p className="mt-1 text-xs text-emerald-300">Référence copiée</p>}

            <dl className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm">
              {[
                ['Maison', done.summary.venueName ?? venueName],
                ['Hébergement', done.summary.roomName],
                ['Arrivée', formatLong(done.summary.checkIn)],
                ['Départ', formatLong(done.summary.checkOut)],
                ['Durée', `${done.summary.nights} nuit${done.summary.nights > 1 ? 's' : ''}`],
                ['Voyageurs', `${done.summary.adults} adulte${done.summary.adults > 1 ? 's' : ''}${done.summary.children ? `, ${done.summary.children} enfant${done.summary.children > 1 ? 's' : ''}` : ''}`],
                ['Total', done.summary.total != null ? formatMoney(done.summary.total) : 'À confirmer'],
                ['Paiement', done.isDemo ? 'Aucun (démonstration)' : 'Non payé — règlement sur place'],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="text-right font-medium text-white">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm leading-relaxed text-neutral-300">
              <p className="font-semibold text-white">Et maintenant ?</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-400">
                {confirmed ? (
                  <>
                    <li>Votre réservation est <strong className="text-emerald-300">confirmée</strong>. Un e-mail récapitulatif vous est envoyé.</li>
                    <li>Présentez votre référence à l&apos;arrivée.</li>
                    <li>Aucun paiement n&apos;a été effectué en ligne.</li>
                  </>
                ) : (
                  <>
                    <li>Votre demande est <strong className="text-amber-300">en attente de confirmation</strong> par la maison d&apos;hôtes.</li>
                    <li>Vous recevrez sa décision par e-mail.</li>
                    <li>Aucun paiement n&apos;est demandé à ce stade.</li>
                    {done.expiresAt && <li>Sans réponse avant le {new Date(done.expiresAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}, la demande expire et les dates sont libérées.</li>}
                  </>
                )}
              </ol>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {trackUrl && (
                <Link href={trackUrl} className="inline-flex h-12 items-center justify-center rounded-2xl bg-amber-400 px-6 text-sm font-black text-black hover:bg-amber-300">
                  {confirmed ? 'Voir ma réservation' : 'Suivre ma demande'}
                </Link>
              )}
              <button type="button" onClick={onClose} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 px-6 text-sm font-bold text-white hover:bg-white/10">Fermer</button>
            </div>
            <p className="mt-3 text-xs text-neutral-500">Conservez cette référence : elle vous permet de retrouver votre demande.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 id={`${uid}-title`} className="pr-10 font-serif text-2xl font-black text-white sm:text-3xl">{instant ? 'Finaliser ma réservation' : 'Finaliser ma demande'}</h2>
            <p className="mt-1 text-sm text-neutral-400">{venueName}</p>
            {demo && <p className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">Mode démonstration : cette réservation sera simulée et marquée « DÉMO ».</p>}

            <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Arrivée</span><span className="font-semibold text-white">{formatLong(params.checkIn)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Départ</span><span className="font-semibold text-white">{formatLong(params.checkOut)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Voyageurs</span><span className="font-semibold text-white">{params.adults} adulte{params.adults > 1 ? 's' : ''}{params.children ? `, ${params.children} enfant${params.children > 1 ? 's' : ''}` : ''}</span></div>
              {quote && <div className="flex justify-between gap-3"><span className="text-neutral-500">Hébergement</span><span className="font-semibold text-white">{quote.room.name}</span></div>}
              {quote && quote.subtotal != null && <div className="flex justify-between gap-3"><span className="text-neutral-500">{quote.nights} nuit{quote.nights > 1 ? 's' : ''}</span><span className="text-white">{formatMoney(quote.subtotal)}</span></div>}
              {quote && quote.cleaningFee > 0 && <div className="flex justify-between gap-3"><span className="text-neutral-500">Frais de ménage</span><span className="text-white">{formatMoney(quote.cleaningFee)}</span></div>}
              {quote && quote.serviceFee > 0 && <div className="flex justify-between gap-3"><span className="text-neutral-500">Frais de service</span><span className="text-white">{formatMoney(quote.serviceFee)}</span></div>}
              {quote && <div className="flex justify-between gap-3 border-t border-white/10 pt-2"><span className="text-neutral-300">Total ({quote.nights} nuit{quote.nights > 1 ? 's' : ''})</span><span className="font-serif text-xl font-black text-amber-400">{quote.total != null ? formatMoney(quote.total) : 'À confirmer'}</span></div>}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-ln`} className="text-sm font-medium text-neutral-200">Nom</label>
                <input ref={firstField} id={`${uid}-ln`} name="lastName" required autoComplete="family-name" maxLength={80} className={input} />
              </div>
              <div>
                <label htmlFor={`${uid}-fn`} className="text-sm font-medium text-neutral-200">Prénom</label>
                <input id={`${uid}-fn`} name="firstName" required autoComplete="given-name" maxLength={80} className={input} />
              </div>
              <div>
                <label htmlFor={`${uid}-ph`} className="text-sm font-medium text-neutral-200">Téléphone</label>
                <input id={`${uid}-ph`} name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="+216 …" maxLength={20} className={input} />
              </div>
              <div>
                <label htmlFor={`${uid}-em`} className="text-sm font-medium text-neutral-200">Email</label>
                <input id={`${uid}-em`} name="email" type="email" inputMode="email" required autoComplete="email" maxLength={160} className={input} />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor={`${uid}-sr`} className="text-sm font-medium text-neutral-200">Demandes particulières <span className="text-neutral-500">(facultatif)</span></label>
              <textarea id={`${uid}-sr`} name="specialRequest" rows={3} maxLength={1000} className={cn(input, 'h-auto py-3')} />
            </div>
            <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true"><label>Ne pas remplir<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

            {(error || Object.keys(fields).length > 0) && (
              <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
                {fields && Object.entries(fields).length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {Object.values(fields).flat().map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                )}
              </div>
            )}

            <button type="submit" disabled={sending}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-base font-black text-black shadow-[0_10px_28px_rgba(245,158,11,0.35)] transition hover:brightness-110 disabled:opacity-60">
              {sending && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
              {instant ? 'Confirmer ma réservation' : 'Envoyer ma demande de réservation'}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-neutral-500">
              Aucun paiement en ligne : règlement sur place. {instant ? 'La réservation est confirmée immédiatement.' : 'La maison d’hôtes confirme ou refuse votre demande ; vous en serez informé(e) par e-mail.'}
              En envoyant, vous acceptez que vos coordonnées soient transmises à la maison pour traiter votre demande (<Link href="/confidentialite" className="underline">confidentialité</Link>).
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
