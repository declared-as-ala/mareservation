'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, KeyRound, Mail, Plus, Search, ShieldOff, ShieldCheck, UserCheck, X } from 'lucide-react';
import {
  createOwner, fetchGuesthouses, fetchOwnersConsole, fetchReservations, savePropertySettings, sendPasswordLink, setUserActive, type OwnerConsoleRow,
} from '@/lib/api/admin-console';
import {
  Card, Drawer, EmptyState, ErrorBox, Field, PageHeader, Skeleton, Spinner, StatusBadge, button, fmtDateTime, fmtDay, fmtStayDay, fmtTND, inputCls, labelCls, selectCls, td, th,
} from '@/components/admin/console/ui';
import { ReservationDrawer } from '@/components/admin/console/ReservationDrawer';
import { cn } from '@/lib/utils';

const ONBOARDING: Record<string, { label: string; cls: string }> = {
  invited: { label: 'Invité', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  no_property: { label: 'Sans maison', cls: 'bg-[#F1EFEA] text-[#4A4740] ring-[#E7E4DD]' },
  setup: { label: 'Fiche en préparation', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  active: { label: 'En ligne', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
};

function OwnersInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(sp.get('owner'));
  const [createOpen, setCreateOpen] = useState(sp.get('new') === '1');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-owners-console'], queryFn: fetchOwnersConsole });
  useEffect(() => { if (sp.get('owner')) setOpenId(sp.get('owner')); }, [sp]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((o) =>
      (!s || [o.fullName, o.email, o.phone, ...o.properties.map((p) => p.name)].some((x) => x?.toLowerCase().includes(s))) &&
      (!status || (status === 'suspended' ? !o.isActive : status === 'active' ? o.isActive : o.onboarding === status))
    );
  }, [data, q, status]);
  const open = data?.find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader title="Propriétaires" subtitle={data ? `${data.length} compte${data.length > 1 ? 's' : ''} propriétaire · ${data.filter((o) => o.isActive).length} actif${data.filter((o) => o.isActive).length > 1 ? 's' : ''}` : undefined}
        actions={<button type="button" className={button('primary')} onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Inviter un propriétaire</button>} />

      <Card bodyClassName="p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_14rem]">
          <div className="relative">
            <label htmlFor="o-q" className="sr-only">Recherche</label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9A968D]" aria-hidden="true" />
            <input id="o-q" type="search" className={cn(inputCls, 'pl-8')} placeholder="Nom, e-mail, téléphone, maison" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select aria-label="Statut" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option><option value="active">Comptes actifs</option><option value="suspended">Suspendus</option>
            <option value="invited">Invités (jamais connectés)</option><option value="no_property">Sans maison</option><option value="setup">Fiche en préparation</option>
          </select>
        </div>
      </Card>

      {error && <ErrorBox error={error} onRetry={() => refetch()} />}
      <Card bodyClassName="p-0 sm:p-0">
        {isLoading ? <div className="p-4"><Skeleton className="h-64" /></div> : !rows.length ? (
          <EmptyState icon={UserCheck} title={data?.length ? 'Aucun résultat' : 'Aucun propriétaire'} action={!data?.length && <button type="button" className={button('primary')} onClick={() => setCreateOpen(true)}>Inviter le premier</button>} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-[#FBFAF8]"><tr>
                  <th className={th}>Propriétaire</th><th className={th}>Téléphone</th><th className={th}>Maisons</th><th className={cn(th, 'text-right')}>Réserv. actives</th>
                  <th className={th}>Compte</th><th className={th}>Onboarding</th><th className={th}>Inscrit</th><th className={th}>Dernière connexion</th>
                </tr></thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className="cursor-pointer border-t border-[#F1EFEA] hover:bg-[#FBFAF8]" onClick={() => setOpenId(o.id)}>
                      <td className={td}><span className="block font-semibold">{o.fullName}</span><span className="block text-[11.5px] text-[#8A867E]">{o.email}</span></td>
                      <td className={cn(td, 'text-[#4A4740]')}>{o.phone ?? '—'}</td>
                      <td className={cn(td, 'max-w-[14rem] truncate')}>{o.properties.length ? o.properties.map((p) => p.name).join(', ') : <span className="text-[#9A968D]">Aucune</span>}</td>
                      <td className={cn(td, 'text-right tabular-nums')}>{o.reservations.active}{o.reservations.pending > 0 && <span className="ml-1 rounded bg-amber-50 px-1 text-[11px] font-semibold text-amber-800">{o.reservations.pending} att.</span>}</td>
                      <td className={td}>{o.isActive ? <span className="text-[12px] font-medium text-emerald-700">Actif</span> : <span className="text-[12px] font-medium text-red-700">Suspendu</span>}</td>
                      <td className={td}><StatusBadge status={o.onboarding} map={ONBOARDING} /></td>
                      <td className={cn(td, 'text-[#6B6760]')}>{fmtDay(o.createdAt)}</td>
                      <td className={cn(td, 'text-[#6B6760]')}>{o.lastLoginAt ? fmtDateTime(o.lastLoginAt) : 'Jamais'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-[#F1EFEA] md:hidden">
              {rows.map((o) => (
                <li key={o.id}><button type="button" className="w-full px-4 py-3 text-left hover:bg-[#FBFAF8]" onClick={() => setOpenId(o.id)}>
                  <span className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{o.fullName}</span><StatusBadge status={o.onboarding} map={ONBOARDING} /></span>
                  <span className="block truncate text-[12px] text-[#6B6760]">{o.email}</span>
                  <span className="mt-1 block text-[12px] text-[#4A4740]">{o.properties.length} maison{o.properties.length > 1 ? 's' : ''} · {o.reservations.active} réservation{o.reservations.active > 1 ? 's' : ''} active{o.reservations.active > 1 ? 's' : ''}{!o.isActive && ' · suspendu'}</span>
                </button></li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <OwnerDrawer owner={open} onClose={() => { setOpenId(null); if (sp.get('owner')) router.replace('/admin/owners'); }} />
      <InviteDrawer open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o && sp.get('new')) router.replace('/admin/owners'); }} />
    </div>
  );
}

function OneTimeLink({ url, onDone }: { url: string; onDone: () => void }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
      <p className="font-semibold">Lien à usage unique</p>
      <p className="mt-0.5">Affiché une seule fois. Transmettez-le uniquement au propriétaire, par un canal sûr, si l’e-mail n’arrive pas.</p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={url} aria-label="Lien de définition du mot de passe" className={cn(inputCls, 'font-mono text-[11.5px]')} onFocus={(e) => e.target.select()} />
        <button type="button" className={button('outline')} onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success('Lien copié.'); } catch { toast.error('Copie impossible — sélectionnez le lien.'); } }}><Copy className="size-4" /> Copier</button>
      </div>
      <button type="button" className={button('ghost', 'mt-2 h-7 px-2')} onClick={onDone}>J’ai transmis le lien</button>
    </div>
  );
}

function OwnerDrawer({ owner, onClose }: { owner: OwnerConsoleRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'profile' | 'properties' | 'reservations' | 'account'>('profile');
  const [link, setLink] = useState<string | null>(null);
  const [assignId, setAssignId] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [resId, setResId] = useState<string | null>(null);
  useEffect(() => { setTab('profile'); setLink(null); setConfirm(null); setAssignId(''); }, [owner?.id]);
  const houses = useQuery({ queryKey: ['admin-guesthouses'], queryFn: fetchGuesthouses, enabled: !!owner && tab === 'properties' });
  const res = useQuery({ queryKey: ['admin-reservations', 'owner', owner?.id], queryFn: () => fetchReservations({ ownerId: owner!.id, limit: 20, demo: true, sort: 'checkin_desc' }), enabled: !!owner && tab === 'reservations' });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-owners-console'] }); qc.invalidateQueries({ queryKey: ['admin-owners'] }); qc.invalidateQueries({ queryKey: ['admin-guesthouses'] }); };
  const m = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.'),
  });
  if (!owner) return <Drawer open={false} onOpenChange={() => undefined} title=""><span /></Drawer>;
  const available = (houses.data ?? []).filter((h) => h.owner?.id !== owner.id);

  return (
    <Drawer open={!!owner} onOpenChange={(o) => !o && onClose()} title={owner.fullName} description={owner.email}>
      <div role="tablist" className="-mx-5 -mt-4 mb-4 flex gap-1 overflow-x-auto border-b border-[#E7E4DD] px-5">
        {([['profile', 'Profil'], ['properties', `Maisons (${owner.properties.length})`], ['reservations', 'Réservations'], ['account', 'Compte & sécurité']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={cn('h-10 shrink-0 border-b-2 px-2 text-[12.5px] font-medium', tab === k ? 'border-[#C99628] text-[#171717]' : 'border-transparent text-[#6B6760]')}>{l}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <dl className="divide-y divide-[#F1EFEA]">
          <Field label="Nom">{owner.fullName}</Field>
          <Field label="E-mail"><a className="text-[#8A6514] hover:underline" href={`mailto:${owner.email}`}>{owner.email}</a></Field>
          <Field label="Téléphone">{owner.phone ? <a className="text-[#8A6514] hover:underline" href={`tel:${owner.phone}`}>{owner.phone}</a> : '—'}</Field>
          <Field label="Onboarding"><StatusBadge status={owner.onboarding} map={ONBOARDING} /></Field>
          <Field label="Compte">{owner.isActive ? 'Actif' : 'Suspendu'}</Field>
          <Field label="Inscrit le">{fmtDay(owner.createdAt)}</Field>
          <Field label="Dernière connexion">{owner.lastLoginAt ? fmtDateTime(owner.lastLoginAt) : 'Jamais connecté'}</Field>
          <Field label="Réservations">{owner.reservations.total} au total · {owner.reservations.active} active{owner.reservations.active > 1 ? 's' : ''} · {owner.reservations.pending} à confirmer</Field>
        </dl>
      )}

      {tab === 'properties' && (
        <div className="space-y-4">
          {!owner.properties.length ? <EmptyState compact title="Aucune maison assignée" /> : (
            <ul className="divide-y divide-[#F1EFEA] rounded-xl border border-[#E7E4DD]">
              {owner.properties.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-[13px]">
                  <Link href={`/admin/guesthouses/${p.id}`} className="min-w-0 truncate font-medium hover:text-[#8A6514]">{p.name}{p.isDemo && ' (démo)'}</Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={p.published ? 'text-[12px] text-emerald-700' : 'text-[12px] text-[#8A867E]'}>{p.published ? 'Publiée' : 'Non publiée'}</span>
                    {confirm === p.id ? (
                      <><button type="button" className={button('danger', 'h-7 px-2')} disabled={m.isPending}
                        onClick={() => m.mutate(async () => { await savePropertySettings(p.id, { ownerId: null }); toast.success('Maison retirée du propriétaire.'); setConfirm(null); refresh(); })}>Confirmer</button>
                        <button type="button" className={button('ghost', 'h-7 w-7 px-0')} onClick={() => setConfirm(null)} aria-label="Annuler"><X className="size-3.5" /></button></>
                    ) : <button type="button" className={button('ghost', 'h-7 px-2 text-red-700')} onClick={() => setConfirm(p.id)}>Retirer</button>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {confirm && <p className="text-[12px] text-amber-800">Le propriétaire perdra l’accès à cette maison et à ses réservations.</p>}
          <div>
            <label htmlFor="assign" className={labelCls}>Assigner une maison</label>
            <div className="flex gap-2">
              <select id="assign" className={selectCls} value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                <option value="">Choisir…</option>
                {available.map((h) => <option key={h.id} value={h.id}>{h.name}{h.owner ? ` (actuellement : ${h.owner.name})` : ''}</option>)}
              </select>
              <button type="button" className={button('primary')} disabled={!assignId || m.isPending}
                onClick={() => m.mutate(async () => { await savePropertySettings(assignId, { ownerId: owner.id }); toast.success('Maison assignée.'); setAssignId(''); refresh(); })}>
                {m.isPending && <Spinner />} Assigner
              </button>
            </div>
            {available.find((h) => h.id === assignId)?.owner && <p className="mt-1 text-[12px] text-amber-800">Cette maison sera retirée de son propriétaire actuel.</p>}
          </div>
        </div>
      )}

      {tab === 'reservations' && (
        res.isLoading ? <Skeleton className="h-40" /> : !res.data?.rows.length ? <EmptyState compact title="Aucune réservation" /> : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FBFAF8]"><tr><th className={th}>Client</th><th className={th}>Maison</th><th className={th}>Arrivée</th><th className={cn(th, 'text-right')}>Total</th><th className={th}>Statut</th></tr></thead>
              <tbody>{res.data.rows.map((r) => (
                <tr key={r.id} className="cursor-pointer border-t border-[#F1EFEA] hover:bg-[#FBFAF8]" onClick={() => setResId(r.id)}>
                  <td className={td}>{r.guest.name ?? '—'}</td><td className={cn(td, 'max-w-[9rem] truncate')}>{r.property?.name}</td><td className={td}>{fmtStayDay(r.checkIn, { day: 'numeric', month: 'short' })}</td>
                  <td className={cn(td, 'text-right tabular-nums')}>{fmtTND(r.total)}</td><td className={td}><StatusBadge status={r.status} /></td>
                </tr>
              ))}</tbody>
            </table>
            <ReservationDrawer id={resId} open={!!resId} onOpenChange={(o) => !o && setResId(null)} />
          </div>
        )
      )}

      {tab === 'account' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E7E4DD] p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold"><KeyRound className="size-4 text-[#8A6514]" /> Mot de passe</p>
            <p className="mt-1 text-[12.5px] text-[#6B6760]">Envoie un lien à usage unique (24 h). Le mot de passe actuel reste valide tant que le lien n’est pas utilisé. Aucun mot de passe n’est jamais affiché.</p>
            {link ? <div className="mt-3"><OneTimeLink url={link} onDone={() => setLink(null)} /></div> : (
              <button type="button" className={button('outline', 'mt-3')} disabled={m.isPending}
                onClick={() => m.mutate(async () => { const r = await sendPasswordLink(owner.id, true); setLink(r.setupLink); toast.success('Lien envoyé par e-mail.'); })}>
                {m.isPending ? <Spinner /> : <Mail className="size-4" />} Envoyer un lien de réinitialisation
              </button>
            )}
          </div>
          <div className={cn('rounded-xl border p-4', owner.isActive ? 'border-red-200' : 'border-emerald-200')}>
            <p className="flex items-center gap-2 text-[13.5px] font-semibold">{owner.isActive ? <ShieldOff className="size-4 text-red-700" /> : <ShieldCheck className="size-4 text-emerald-700" />} {owner.isActive ? 'Suspendre le compte' : 'Réactiver le compte'}</p>
            <p className="mt-1 text-[12.5px] text-[#6B6760]">{owner.isActive ? 'Déconnecte immédiatement le propriétaire et bloque son accès. Ses maisons et réservations restent intactes.' : 'Le propriétaire pourra de nouveau se connecter.'}</p>
            {confirm === 'status' ? (
              <div className="mt-3 flex gap-2">
                <button type="button" className={button(owner.isActive ? 'danger' : 'success')} disabled={m.isPending}
                  onClick={() => m.mutate(async () => { await setUserActive(owner.id, !owner.isActive); toast.success(owner.isActive ? 'Compte suspendu.' : 'Compte réactivé.'); setConfirm(null); refresh(); })}>
                  {m.isPending && <Spinner />} Confirmer
                </button>
                <button type="button" className={button('ghost')} onClick={() => setConfirm(null)}>Annuler</button>
              </div>
            ) : <button type="button" className={button(owner.isActive ? 'danger' : 'outline', 'mt-3')} onClick={() => setConfirm('status')}>{owner.isActive ? 'Suspendre' : 'Réactiver'}</button>}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function InviteDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const houses = useQuery({ queryKey: ['admin-guesthouses'], queryFn: fetchGuesthouses, enabled: open });
  const [f, setF] = useState({ fullName: '', email: '', phone: '', venueIds: [] as string[], sendInvite: true });
  const [link, setLink] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => createOwner({ fullName: f.fullName.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, venueIds: f.venueIds, sendInvite: f.sendInvite }),
    onSuccess: (d) => {
      toast.success(f.sendInvite ? 'Propriétaire créé — invitation envoyée.' : 'Propriétaire créé.');
      setLink(d.setupLink);
      qc.invalidateQueries({ queryKey: ['admin-owners-console'] }); qc.invalidateQueries({ queryKey: ['admin-owners'] }); qc.invalidateQueries({ queryKey: ['admin-guesthouses'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Création impossible.'),
  });
  const close = () => { onOpenChange(false); setLink(null); setF({ fullName: '', email: '', phone: '', venueIds: [], sendInvite: true }); };
  const valid = f.fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.email);
  return (
    <Drawer open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} title="Inviter un propriétaire" description="Le compte est créé sans mot de passe utilisable : le propriétaire choisit le sien via un lien sécurisé (72 h)."
      footer={!link && <div className="flex justify-end gap-2"><button type="button" className={button('ghost')} onClick={close}>Annuler</button><button type="submit" form="invite" className={button('primary')} disabled={!valid || m.isPending}>{m.isPending && <Spinner />} Créer le compte</button></div>}>
      {link ? <OneTimeLink url={link} onDone={close} /> : (
        <form id="invite" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) m.mutate(); }}>
          <div><label htmlFor="i-name" className={labelCls}>Nom complet *</label><input id="i-name" className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required maxLength={120} /></div>
          <div><label htmlFor="i-email" className={labelCls}>E-mail *</label><input id="i-email" type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
          <div><label htmlFor="i-phone" className={labelCls}>Téléphone</label><input id="i-phone" type="tel" className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={30} /></div>
          <fieldset>
            <legend className={labelCls}>Maisons à assigner</legend>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[#E7E4DD] p-2">
              {(houses.data ?? []).map((h) => (
                <label key={h.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12.5px] hover:bg-[#FBFAF8]">
                  <input type="checkbox" className="size-4 accent-[#C99628]" checked={f.venueIds.includes(h.id)} onChange={(e) => setF({ ...f, venueIds: e.target.checked ? [...f.venueIds, h.id] : f.venueIds.filter((x) => x !== h.id) })} />
                  <span className="truncate">{h.name}</span>{h.owner && <span className="shrink-0 text-[11px] text-amber-800">déjà : {h.owner.name}</span>}
                </label>
              ))}
              {!houses.data?.length && <p className="px-1.5 py-1 text-[12px] text-[#8A867E]">Aucune maison.</p>}
            </div>
          </fieldset>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" className="size-4 accent-[#C99628]" checked={f.sendInvite} onChange={(e) => setF({ ...f, sendInvite: e.target.checked })} /> Envoyer l’invitation par e-mail</label>
        </form>
      )}
    </Drawer>
  );
}

export default function OwnersPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><OwnersInner /></Suspense>;
}
