'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, KeyRound, Loader2, Mail, RefreshCw, Send, UserPlus, X } from 'lucide-react';
import { apiGetRaw, apiPatchRaw, apiPostRaw } from '@/lib/api/client';
import { BookingSettingsForm } from '@/components/booking/BookingSettingsForm';
import { cn } from '@/lib/utils';

type Kpis = {
  properties: { total: number; published: number; pendingApproval: number; listed: number };
  owners: { total: number; active: number };
  reservations: { total: number; pending: number; confirmed: number; cancelled: number; rejected: number; expired: number; completed: number; bookingValue: number; revenueMonth: number; occupancyRate: number | null };
  failedEmails: number;
  recentActivity: { id: string; action: string; at: string; actor: { name: string; role: string } | null; details: any }[];
};
type Property = { id: string; name: string; slug: string; type: string; city: string; governorate: string | null; isDemo: boolean; isPublished: boolean; publicListed: boolean; approvalStatus: string; bookingMode: string; rentalMode: string; hasCoordinates: boolean; hasVirtualTour: boolean; owner: { id: string; fullName: string; email: string } | null; roomsCount: number; inventoryConfigured: boolean; bookable: boolean; bookingState: string };
type Owner = { id: string; fullName: string; email: string; phone: string | null; isActive: boolean; lastLoginAt: string | null; properties: { id: string; name: string }[] };
type Outbox = { _id: string; event: string; to: string; recipientRole: string; subject: string; status: string; attempts: number; lastError?: string; sentAt?: string; createdAt: string; isDemo?: boolean };

const card = 'rounded-[1.5rem] border border-white/10 bg-[#111112] p-5 sm:p-6';
const field = 'h-11 w-full rounded-xl border border-white/10 bg-[#0B0B0C] px-3 text-sm text-white outline-none focus:border-amber-400/60';
const STATE: Record<string, [string, string]> = {
  OPEN: ['Réservable', 'bg-emerald-500/15 text-emerald-300'],
  DEMO_OPEN: ['Démo ouverte', 'bg-amber-400/20 text-amber-200'],
  DEMO_VENUE_NOT_BOOKABLE: ['Démo fermée', 'bg-white/10 text-neutral-300'],
  BOOKING_DISABLED: ['Fermée', 'bg-red-500/15 text-red-300'],
  NOT_PUBLISHED: ['Non publiée', 'bg-red-500/15 text-red-300'],
};
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Action impossible.');

export default function AdminPlatformPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'properties' | 'owners' | 'emails'>('overview');
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; link?: string } | null>(null);

  const kpis = useQuery({ queryKey: ['admin-kpis'], queryFn: async () => (await apiGetRaw<{ data: Kpis }>('/admin-bookings/kpis')).data, refetchInterval: 30_000 });
  const props = useQuery({ queryKey: ['admin-properties'], queryFn: async () => (await apiGetRaw<{ data: Property[] }>('/admin-bookings/properties')).data });
  const owners = useQuery({ queryKey: ['admin-owners'], queryFn: async () => (await apiGetRaw<{ data: Owner[] }>('/admin-bookings/owners')).data });
  const email = useQuery({ queryKey: ['admin-email-status'], queryFn: async () => (await apiGetRaw<{ data: any }>('/admin-bookings/email/status')).data, enabled: tab === 'emails' });
  const outbox = useQuery({ queryKey: ['admin-outbox'], queryFn: async () => (await apiGetRaw<{ data: Outbox[] }>('/admin-bookings/email/outbox?limit=100')).data, enabled: tab === 'emails', refetchInterval: 20_000 });

  const createOwner = useMutation({
    mutationFn: (b: object) => apiPostRaw<{ data: { setupLink: string } }>('/admin-bookings/owners', b),
    onSuccess: (r) => { setMsg({ ok: true, text: 'Propriétaire créé. Une invitation lui a été envoyée par e-mail. Lien de création de mot de passe (72 h, usage unique — à transmettre de façon privée si l’e-mail n’arrive pas) :', link: r.data.setupLink }); void qc.invalidateQueries({ queryKey: ['admin-owners'] }); void qc.invalidateQueries({ queryKey: ['admin-properties'] }); },
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiPatchRaw(`/admin-bookings/users/${id}/status`, { isActive }),
    onSuccess: () => { setMsg({ ok: true, text: 'Statut du compte mis à jour.' }); void qc.invalidateQueries({ queryKey: ['admin-owners'] }); },
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });
  const resetLink = useMutation({
    mutationFn: (id: string) => apiPostRaw<{ data: { setupLink: string } }>(`/admin-bookings/users/${id}/password-link`, {}),
    onSuccess: (r) => setMsg({ ok: true, text: 'Lien de (ré)initialisation envoyé par e-mail (24 h, usage unique). Le mot de passe actuel reste valide tant que le lien n’est pas utilisé :', link: r.data.setupLink }),
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });
  const testEmail = useMutation({
    mutationFn: (to: string) => apiPostRaw<{ data: { status: string; error: string | null; messageId: string | null } }>('/admin-bookings/email/test', { to }),
    onSuccess: (r) => { setMsg(r.data.status === 'sent' ? { ok: true, text: `E-mail de test accepté par le serveur SMTP (message ${r.data.messageId}). Vérifiez la boîte de réception.` } : { ok: false, text: `Échec de l’envoi : ${r.data.error ?? r.data.status}. Il sera retenté automatiquement.` }); void qc.invalidateQueries({ queryKey: ['admin-outbox'] }); void qc.invalidateQueries({ queryKey: ['admin-email-status'] }); },
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });
  const retry = useMutation({
    mutationFn: (id: string) => apiPostRaw(`/admin-bookings/email/outbox/${id}/retry`, {}),
    onSuccess: () => { setMsg({ ok: true, text: 'E-mail remis en file d’envoi.' }); void qc.invalidateQueries({ queryKey: ['admin-outbox'] }); },
    onError: (e) => setMsg({ ok: false, text: errText(e) }),
  });

  const k = kpis.data;
  const ownerList = (owners.data ?? []).map((o) => ({ id: o.id, fullName: o.fullName, email: o.email }));

  return (
    <div className="space-y-6 p-4 text-white sm:p-6">
      <header>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-black sm:text-3xl"><Building2 className="size-6 text-amber-400" aria-hidden="true" /> Plateforme maisons d’hôtes</h1>
        <p className="mt-1 text-sm text-neutral-400">Indicateurs, fiches, propriétaires et e-mails transactionnels.</p>
      </header>

      <div role="tablist" className="flex flex-wrap gap-2">
        {([['overview', 'Vue d’ensemble'], ['properties', 'Maisons'], ['owners', 'Propriétaires'], ['emails', 'E-mails']] as const).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => { setTab(t); setMsg(null); }} className={cn('h-10 rounded-full px-5 text-sm font-semibold', tab === t ? 'bg-amber-400 text-black' : 'border border-white/15 text-neutral-300 hover:text-white')}>{l}</button>
        ))}
      </div>

      {msg && (
        <div role="status" className={cn('rounded-xl border px-4 py-3 text-sm', msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-300')}>
          <div className="flex justify-between gap-3"><p>{msg.text}</p><button type="button" aria-label="Fermer" onClick={() => setMsg(null)}><X className="size-4" /></button></div>
          {msg.link && <input readOnly value={msg.link} onFocus={(e) => e.currentTarget.select()} className={cn(field, 'mt-2 font-mono text-xs')} aria-label="Lien à usage unique" />}
        </div>
      )}

      {tab === 'overview' && k && (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Maisons', k.properties.total], ['Publiées', k.properties.published], ['En attente d’approbation', k.properties.pendingApproval], ['Au catalogue', k.properties.listed],
              ['Propriétaires', `${k.owners.active}/${k.owners.total}`], ['E-mails en échec', k.failedEmails],
              ['Réservations', k.reservations.total], ['En attente', k.reservations.pending], ['Confirmées', k.reservations.confirmed], ['Annulées', k.reservations.cancelled],
              ['Valeur réservée (hors démo)', `${k.reservations.bookingValue.toLocaleString('fr-TN')} TND`], ['Occupation 30 j', k.reservations.occupancyRate == null ? '—' : `${k.reservations.occupancyRate} %`],
            ].map(([l, v]) => (
              <li key={l as string} className="rounded-2xl border border-white/10 bg-[#111112] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{l}</p>
                <p className="mt-1 font-serif text-2xl font-black text-amber-400">{v}</p>
              </li>
            ))}
          </ul>
          <section className={card}>
            <h2 className="font-serif text-xl font-bold">Activité récente</h2>
            <ul className="mt-3 divide-y divide-white/[0.06] text-sm">
              {k.recentActivity.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span><span className="font-mono text-xs text-amber-300">{a.action}</span> <span className="text-neutral-300">{a.actor ? `${a.actor.name} (${a.actor.role})` : 'Système / client'}</span>{a.details?.reference ? ` · ${a.details.reference}` : a.details?.venue ? ` · ${a.details.venue}` : ''}</span>
                  <span className="text-neutral-500">{new Date(a.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </li>
              ))}
              {!k.recentActivity.length && <li className="py-2 text-neutral-500">Aucune activité.</li>}
            </ul>
          </section>
        </>
      )}

      {tab === 'properties' && (
        <section className={card}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-neutral-500"><tr><th className="py-2">Maison</th><th>Propriétaire</th><th>Réservation</th><th>Catalogue</th><th>Inventaire</th><th /></tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {(props.data ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="py-3"><p className="font-semibold">{p.name}{p.isDemo && <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">DÉMO</span>}</p><p className="text-xs text-neutral-500">{[p.city, p.governorate].filter(Boolean).join(', ')} · {p.type === 'HOTEL' ? 'hôtel' : 'maison d’hôtes'}{!p.hasCoordinates ? ' · sans GPS' : ''}{p.hasVirtualTour ? ' · 360°' : ''}</p></td>
                    <td className="text-neutral-300">{p.owner ? p.owner.fullName : <span className="text-neutral-500">—</span>}</td>
                    <td><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STATE[p.bookingState]?.[1])}>{STATE[p.bookingState]?.[0] ?? p.bookingState}</span><p className="mt-1 text-xs text-neutral-500">{p.bookingMode === 'instant' ? 'instantanée' : 'sur demande'} · {p.rentalMode === 'entire' ? 'maison entière' : `${p.roomsCount} chambre(s)`}</p></td>
                    <td className="text-xs text-neutral-300">{p.publicListed ? 'Listée' : 'Non listée'} · {p.approvalStatus}</td>
                    <td className="text-xs">{p.inventoryConfigured ? <span className="text-emerald-300">Configuré</span> : <span className="text-orange-300">À configurer</span>}</td>
                    <td className="text-right"><button type="button" onClick={() => setEditing(p.id)} className="h-9 rounded-lg border border-white/15 px-3 text-xs font-bold hover:border-amber-400/50">Paramètres</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'owners' && (
        <>
          <section className={card}>
            <h2 className="flex items-center gap-2 font-serif text-xl font-bold"><UserPlus className="size-5 text-amber-400" aria-hidden="true" /> Inviter un propriétaire</h2>
            <form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              createOwner.mutate({ fullName: f.get('fullName'), email: f.get('email'), phone: f.get('phone') || undefined, venueIds: f.get('venueId') ? [f.get('venueId')] : undefined });
              e.currentTarget.reset();
            }}>
              <input name="fullName" required placeholder="Nom complet" className={field} />
              <input name="email" type="email" required placeholder="E-mail" className={field} />
              <input name="phone" placeholder="Téléphone (facultatif)" className={field} />
              <select name="venueId" className={field} defaultValue="">
                <option value="">Maison à assigner (facultatif)</option>
                {(props.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.owner ? ` (actuel : ${p.owner.fullName})` : ''}</option>)}
              </select>
              <button type="submit" disabled={createOwner.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black sm:col-span-4 sm:w-fit">{createOwner.isPending && <Loader2 className="size-4 animate-spin" />}Créer et envoyer l’invitation</button>
            </form>
            <p className="mt-2 text-xs text-neutral-500">Aucun mot de passe n’est choisi par l’administrateur : le propriétaire définit le sien via un lien personnel à usage unique.</p>
          </section>
          <section className={card}>
            <ul className="divide-y divide-white/[0.06]">
              {(owners.data ?? []).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{o.fullName} {!o.isActive && <span className="ml-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">suspendu</span>}</p>
                    <p className="text-neutral-400">{o.email}{o.phone ? ` · ${o.phone}` : ''}</p>
                    <p className="text-xs text-neutral-500">{o.properties.length ? o.properties.map((p) => p.name).join(', ') : 'Aucune maison'} · dernière connexion : {o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString('fr-FR') : 'jamais'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => resetLink.mutate(o.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-bold hover:border-amber-400/50"><KeyRound className="size-3.5" aria-hidden="true" />Lien mot de passe</button>
                    <button type="button" onClick={() => setStatus.mutate({ id: o.id, isActive: !o.isActive })} className={cn('h-9 rounded-lg border px-3 text-xs font-bold', o.isActive ? 'border-red-500/40 text-red-300' : 'border-emerald-500/40 text-emerald-300')}>{o.isActive ? 'Suspendre' : 'Réactiver'}</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {tab === 'emails' && (
        <>
          <section className={card}>
            <h2 className="flex items-center gap-2 font-serif text-xl font-bold"><Mail className="size-5 text-amber-400" aria-hidden="true" /> Configuration SMTP</h2>
            {email.data ? (
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {[
                  ['Configuré', email.data.configured ? 'Oui' : 'Non — variables SMTP_* manquantes'],
                  ['Serveur', email.data.host ? `${email.data.host}:${email.data.port} (${email.data.secure ? 'TLS implicite' : 'STARTTLS'})` : '—'],
                  ['Compte', email.data.user ?? '—'],
                  ['Expéditeur', email.data.from ?? '—'],
                  ['Expéditeur au nom d’Exploria360', email.data.senderDomainMatchesBrand ? 'Oui' : 'Non — adresse d’un autre domaine'],
                  ['Notifications admin', email.data.adminNotificationEmail ?? '—'],
                  ['File d’envoi', `${email.data.outbox.queued} en attente · ${email.data.outbox.failed} en échec · ${email.data.outbox.sent24h} envoyés (24 h)`],
                  ['Vérification', email.data.verified === undefined ? 'Non testée' : email.data.verified ? 'Connexion SMTP OK' : `Échec : ${email.data.verifyError}`],
                ].map(([a, b]) => <div key={a} className="flex justify-between gap-4 border-b border-white/[0.06] pb-2"><dt className="text-neutral-500">{a}</dt><dd className="text-right">{b}</dd></div>)}
              </dl>
            ) : <p className="mt-3 text-neutral-500">Chargement…</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={async () => { await qc.fetchQuery({ queryKey: ['admin-email-status'], queryFn: async () => (await apiGetRaw<{ data: any }>('/admin-bookings/email/status?verify=1')).data }); }} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold"><RefreshCw className="size-4" aria-hidden="true" />Vérifier la connexion</button>
              <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); testEmail.mutate(String(new FormData(e.currentTarget).get('to'))); }}>
                <input name="to" type="email" required placeholder="Destinataire du test" className={cn(field, 'w-64')} />
                <button type="submit" disabled={testEmail.isPending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-black text-black">{testEmail.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Envoyer un e-mail de test</button>
              </form>
            </div>
          </section>
          <section className={card}>
            <h2 className="font-serif text-xl font-bold">Historique d’envoi</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-neutral-500"><tr><th className="py-2">Date</th><th>Événement</th><th>Destinataire</th><th>Statut</th><th /></tr></thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {(outbox.data ?? []).map((r) => (
                    <tr key={r._id}>
                      <td className="py-2.5 text-neutral-400">{new Date(r.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>{r.event}{r.isDemo ? ' · démo' : ''}<p className="max-w-xs truncate text-xs text-neutral-500">{r.subject}</p></td>
                      <td className="text-neutral-300">{r.recipientRole} · {r.to}</td>
                      <td><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', r.status === 'sent' ? 'bg-emerald-500/15 text-emerald-300' : r.status === 'failed' ? 'bg-red-500/15 text-red-300' : 'bg-orange-500/15 text-orange-300')}>{r.status}</span>{r.lastError && r.status !== 'sent' && <p className="max-w-xs truncate text-xs text-red-300/80" title={r.lastError}>{r.attempts} essai(s) · {r.lastError}</p>}</td>
                      <td className="text-right">{r.status !== 'sent' && r.status !== 'sending' && <button type="button" onClick={() => retry.mutate(r._id)} className="h-8 rounded-lg border border-white/15 px-3 text-xs font-bold">Réessayer</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!outbox.data?.length && <p className="py-3 text-sm text-neutral-500">Aucun e-mail.</p>}
            </div>
          </section>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/70" onClick={() => setEditing(null)} />
          <div role="dialog" aria-modal="true" aria-label="Paramètres de la maison" className="relative h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#111112] p-5 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-2xl">{props.data?.find((p) => p.id === editing)?.name}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Fermer" className="grid size-10 place-items-center rounded-full border border-white/15"><X className="size-4" /></button>
            </div>
            <BookingSettingsForm venueId={editing} mode="admin" owners={ownerList} />
          </div>
        </div>
      )}
    </div>
  );
}
