'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, CircleSlash, ExternalLink, Mail, RotateCcw, X } from 'lucide-react';
import { fetchReservationDetail, NEXT_STATES, retryEmail, transitionReservation } from '@/lib/api/admin-console';
import { Drawer, ErrorBox, Field, PAYMENT_STATUS, Skeleton, Spinner, StatusBadge, button, fmtDateTime, fmtStayDay, fmtTND, inputCls, labelCls } from './ui';

type Target = 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show';
const ACTION: Record<Target, { label: string; variant: 'success' | 'danger' | 'outline'; icon: React.ComponentType<{ className?: string }>; needsReason?: boolean; confirm: string }> = {
  confirmed: { label: 'Confirmer', variant: 'success', icon: Check, confirm: 'Confirmer cette réservation ? Le client et le propriétaire seront prévenus par e-mail.' },
  rejected: { label: 'Refuser', variant: 'danger', icon: X, needsReason: true, confirm: 'Refuser cette demande ? Le client sera prévenu.' },
  cancelled: { label: 'Annuler la réservation', variant: 'danger', icon: CircleSlash, needsReason: true, confirm: 'Annuler cette réservation ? Les dates seront libérées et le client prévenu.' },
  completed: { label: 'Marquer terminée', variant: 'outline', icon: Check, confirm: 'Marquer ce séjour comme terminé ?' },
  no_show: { label: 'Non présenté', variant: 'outline', icon: CircleSlash, needsReason: true, confirm: 'Déclarer le client non présenté ?' },
};
const EVENT_LABEL: Record<string, string> = {
  request_received: 'Demande reçue', instant_confirmed: 'Confirmation immédiate', confirmed: 'Confirmation', rejected: 'Refus',
  cancelled_by_host: 'Annulation (hôte/admin)', cancelled_by_guest: 'Annulation (client)', expired: 'Expiration', reminder: 'Rappel',
};
const ROLE_LABEL: Record<string, string> = { customer: 'client', owner: 'propriétaire', admin: 'admin', test: 'test' };

export function ReservationDrawer({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Target | null>(null);
  const [reason, setReason] = useState('');
  const { data: r, isLoading, error, refetch } = useQuery({ queryKey: ['admin-reservation', id], queryFn: () => fetchReservationDetail(id!), enabled: !!id && open });

  const mutation = useMutation({
    mutationFn: ({ to, why }: { to: Target; why?: string }) => transitionReservation(id!, to, why),
    onSuccess: (_d, v) => {
      toast.success(`Réservation : ${ACTION[v.to].label.toLowerCase()} — effectué.`);
      setPending(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['admin-reservation', id] });
      qc.invalidateQueries({ queryKey: ['admin-reservations'] });
      qc.invalidateQueries({ queryKey: ['admin-analytics'] });
      qc.invalidateQueries({ queryKey: ['admin-nav'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.'),
  });
  const retry = useMutation({
    mutationFn: retryEmail,
    onSuccess: () => { toast.success('E-mail remis en file d’envoi.'); refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Relance impossible.'),
  });

  const status = String(r?.status ?? '').toLowerCase();
  const next = NEXT_STATES[status] ?? [];
  const guest = [r?.customerFirstName, r?.customerLastName].filter(Boolean).join(' ') || '—';
  const pb = r?.priceBreakdown;
  const venue = r?.venueId;

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => { if (!o) { setPending(null); setReason(''); } onOpenChange(o); }}
      title={r ? <span className="flex flex-wrap items-center gap-2">{r.reservationCode ?? 'Réservation'} <StatusBadge status={status} />{r.isDemo && <span className="rounded bg-[#F1EFEA] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#6B6760]">Démo</span>}</span> : 'Réservation'}
      description={r ? `Créée le ${fmtDateTime(r.createdAt)}` : undefined}
      footer={
        r && (next.length > 0 || pending) ? (
          pending ? (
            <div className="space-y-2">
              <p className="text-[13px] text-[#171717]">{ACTION[pending].confirm}</p>
              {ACTION[pending].needsReason && (
                <div>
                  <label htmlFor="transition-reason" className={labelCls}>Motif (communiqué au client)</label>
                  <input id="transition-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Ex. dates indisponibles" />
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className={button('ghost')} onClick={() => { setPending(null); setReason(''); }}>Retour</button>
                <button
                  type="button"
                  className={button(ACTION[pending].variant)}
                  disabled={mutation.isPending || (ACTION[pending].needsReason && reason.trim().length < 3)}
                  onClick={() => mutation.mutate({ to: pending, why: reason.trim() || undefined })}
                >
                  {mutation.isPending && <Spinner />} {ACTION[pending].label}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              {next.map((t) => {
                const A = ACTION[t];
                return (
                  <button key={t} type="button" className={button(A.variant)} onClick={() => setPending(t)}>
                    <A.icon className="size-4" aria-hidden="true" /> {A.label}
                  </button>
                );
              })}
            </div>
          )
        ) : undefined
      }
    >
      {isLoading || !id ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-32" /><Skeleton className="h-40" /></div>
      ) : error ? (
        <ErrorBox error={error} onRetry={() => refetch()} />
      ) : r ? (
        <div className="space-y-5">
          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">Séjour</h3>
            <dl className="divide-y divide-[#F1EFEA]">
              <Field label="Maison">{venue?.name ?? '—'}</Field>
              <Field label="Arrivée">{fmtStayDay(r.startAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Field>
              <Field label="Départ">{fmtStayDay(r.endAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Field>
              <Field label="Nuits">{r.nights ?? '—'}</Field>
              <Field label="Voyageurs">{r.adults ?? '—'} adulte{(r.adults ?? 0) > 1 ? 's' : ''}{r.children ? ` · ${r.children} enfant${r.children > 1 ? 's' : ''}` : ''}</Field>
              <Field label="Mode">{r.bookingMode === 'instant' ? 'Réservation instantanée' : 'Sur demande'}{r.unitScope === 'entire' ? ' · maison entière' : r.unitScope === 'room' ? ' · par chambre' : ''}</Field>
              {status === 'pending' && r.expiresAt && <Field label="Expire le">{fmtDateTime(r.expiresAt)}</Field>}
            </dl>
            {r.specialRequest && <p className="mt-2 rounded-lg bg-[#FBFAF8] p-3 text-[12.5px] text-[#4A4740]">« {r.specialRequest} »</p>}
          </section>

          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">Client</h3>
            <dl className="divide-y divide-[#F1EFEA]">
              <Field label="Nom">{guest}</Field>
              <Field label="E-mail">{r.customerEmail ? <a className="text-[#8A6514] hover:underline" href={`mailto:${r.customerEmail}`}>{r.customerEmail}</a> : '—'}</Field>
              <Field label="Téléphone">{r.customerPhone ? <a className="text-[#8A6514] hover:underline" href={`tel:${r.customerPhone}`}>{r.customerPhone}</a> : '—'}</Field>
            </dl>
          </section>

          <section>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">Prix</h3>
            <dl className="divide-y divide-[#F1EFEA]">
              {pb?.subtotal != null && <Field label="Nuitées">{fmtTND(pb.subtotal, true)}</Field>}
              {!!pb?.cleaningFee && <Field label="Frais de ménage">{fmtTND(pb.cleaningFee, true)}</Field>}
              {!!pb?.serviceFee && <Field label="Frais de service">{fmtTND(pb.serviceFee, true)}</Field>}
              {!!pb?.discount && <Field label="Remise">− {fmtTND(pb.discount, true)}</Field>}
              <Field label="Total">{fmtTND(r.totalPrice ?? pb?.total ?? 0, true)}</Field>
              <Field label="Paiement"><StatusBadge status={r.paymentStatus ?? 'unpaid'} map={PAYMENT_STATUS} /></Field>
            </dl>
            <p className="mt-1 text-[11px] text-[#8A867E]">Valeur réservée — n’indique pas un encaissement.</p>
          </section>

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">Historique</h3>
            <ol className="relative space-y-3 border-l border-[#E7E4DD] pl-4">
              <li className="text-[12.5px]">
                <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-[#C99628]" aria-hidden="true" />
                <p className="font-medium text-[#171717]">Réservation créée</p>
                <p className="text-[11.5px] text-[#8A867E]">{fmtDateTime(r.createdAt)}</p>
              </li>
              {(r.statusHistory ?? []).map((h, i) => (
                <li key={i} className="text-[12.5px]">
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-[#D6D2C8]" aria-hidden="true" />
                  <p className="font-medium text-[#171717]">
                    {h.from ? <><StatusBadge status={h.from} /> → </> : null}<StatusBadge status={h.to} />
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#8A867E]">
                    {fmtDateTime(h.at)} · {h.byUserId?.fullName ?? h.byRole?.toLowerCase() ?? 'système'}
                    {h.reason ? ` — ${h.reason}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">E-mails</h3>
            {r.emails?.length ? (
              <ul className="divide-y divide-[#F1EFEA] rounded-lg border border-[#E7E4DD]">
                {r.emails.map((e) => (
                  <li key={e._id} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                    <span className="min-w-0">
                      <span className="font-medium text-[#171717]">{EVENT_LABEL[e.event] ?? e.event}</span>
                      <span className="text-[#8A867E]"> · {ROLE_LABEL[e.recipientRole] ?? e.recipientRole}</span>
                      {e.status === 'failed' && e.lastError && <span className="block truncate text-[11px] text-red-700">{e.lastError}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={e.status === 'sent' ? 'text-emerald-700' : e.status === 'failed' ? 'text-red-700' : 'text-amber-700'}>
                        {e.status === 'sent' ? 'Envoyé' : e.status === 'failed' ? 'Échec' : 'En file'}
                      </span>
                      {e.status === 'failed' && (
                        <button type="button" className={button('outline', 'h-7 px-2')} disabled={retry.isPending} onClick={() => retry.mutate(e._id)} aria-label="Renvoyer l’e-mail">
                          <RotateCcw className="size-3.5" /> Renvoyer
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[12.5px] text-[#8A867E]">Aucun e-mail pour cette réservation.</p>}
          </section>

          <div className="flex flex-wrap gap-2">
            {venue?._id && <Link href={`/admin/guesthouses/${venue._id}`} className={button('outline')}>Ouvrir la maison</Link>}
            {venue?.slug && <a href={`/maison-d-hote/${venue.slug}`} target="_blank" rel="noopener noreferrer" className={button('ghost')}>Fiche publique <ExternalLink className="size-3.5" /></a>}
            {r.customerEmail && <a href={`mailto:${r.customerEmail}?subject=${encodeURIComponent(`Réservation ${r.reservationCode ?? ''}`)}`} className={button('ghost')}><Mail className="size-4" /> Écrire au client</a>}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
