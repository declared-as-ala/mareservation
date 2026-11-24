'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, Inbox, Mail, Phone, X } from 'lucide-react';
import { approveApplication, fetchApplications, rejectApplication, updateApplication, type ApplicationRow } from '@/lib/api/admin-console';
import { GOVERNORATES } from '@/lib/api/bookings';
import { Card, Drawer, EmptyState, ErrorBox, Field, PageHeader, Skeleton, Spinner, StatusBadge, button, fmtDateTime, fmtDay, inputCls, labelCls, selectCls } from '@/components/admin/console/ui';
import { cn } from '@/lib/utils';

const APP_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Nouvelle', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  in_review: { label: 'En examen', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  contacted: { label: 'Infos demandées', cls: 'bg-violet-50 text-violet-800 ring-violet-200' },
  approved: { label: 'Acceptée', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  rejected: { label: 'Refusée', cls: 'bg-red-50 text-red-700 ring-red-200' },
  closed: { label: 'Clôturée', cls: 'bg-[#F1EFEA] text-[#4A4740] ring-[#E7E4DD]' },
};
const statusOf = (a: ApplicationRow) => a.decision ?? a.status;
const FILTERS = [['open', 'À traiter'], ['', 'Toutes'], ['closed', 'Traitées']] as const;

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<string>('open');
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-applications', filter], queryFn: () => fetchApplications(filter || undefined) });
  const open = data?.rows.find((a) => a.id === openId) ?? null;
  const c = data?.counts ?? {};
  return (
    <div className="space-y-4">
      <PageHeader title="Demandes d’adhésion" subtitle="Propriétaires de maisons d’hôtes souhaitant rejoindre Exploria360 (formulaire « Devenir hôte »)" />
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtre" className="inline-flex rounded-lg border border-[#E7E4DD] bg-white p-0.5">
          {FILTERS.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)} className={cn('h-8 rounded-md px-3 text-[12.5px] font-semibold', filter === v ? 'bg-[#171717] text-[#FFFFFF]' : 'text-[#4A4740] hover:bg-[#F4F2EE]')}>{l}</button>
          ))}
        </div>
        <span className="text-[12px] text-[#6B6760]">{c.new ?? 0} nouvelle{(c.new ?? 0) > 1 ? 's' : ''} · {c.in_review ?? 0} en examen · {c.contacted ?? 0} en attente d’infos</span>
      </div>
      {error && <ErrorBox error={error} onRetry={() => refetch()} />}
      <Card bodyClassName="p-0 sm:p-0">
        {isLoading ? <div className="p-4"><Skeleton className="h-48" /></div> : !data?.rows.length ? <EmptyState icon={Inbox} title={filter === 'open' ? 'Aucune demande à traiter' : 'Aucune demande'} /> : (
          <ul className="divide-y divide-[#F1EFEA]">
            {data.rows.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setOpenId(a.id)} className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-[#FBFAF8] sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-[#171717]">{a.establishmentName}</span>
                    <span className="block truncate text-[12px] text-[#6B6760]">{a.contactName} · {a.city} · {a.email}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3"><span className="text-[12px] text-[#8A867E]">{fmtDay(a.createdAt)}</span><StatusBadge status={statusOf(a)} map={APP_STATUS} /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ApplicationDrawer app={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ApplicationDrawer({ app, onClose }: { app: ApplicationRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [notes, setNotes] = useState('');
  const [f, setF] = useState({ ownerFullName: '', ownerEmail: '', ownerPhone: '', venueName: '', city: '', governorate: '', sendInvite: true, note: '' });
  const [rejectNote, setRejectNote] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  useEffect(() => {
    if (!app) return;
    setMode('view'); setLink(null); setCreated(null); setRejectNote(''); setNotes(app.adminNotes ?? '');
    setF({ ownerFullName: app.contactName, ownerEmail: app.email, ownerPhone: app.phone, venueName: app.establishmentName, city: app.city, governorate: '', sendInvite: true, note: '' });
  }, [app?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-applications'] }); qc.invalidateQueries({ queryKey: ['admin-nav'] }); };
  const m = useMutation({ mutationFn: async (fn: () => Promise<unknown>) => fn(), onError: (e) => toast.error(e instanceof Error ? e.message : 'Action impossible.') });
  if (!app) return <Drawer open={false} onOpenChange={() => undefined} title=""><span /></Drawer>;
  const decided = !!app.decision;

  return (
    <Drawer open={!!app} onOpenChange={(o) => !o && onClose()} title={app.establishmentName} description={`Reçue le ${fmtDateTime(app.createdAt)}`}
      footer={!decided && !created && mode === 'view' && (
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={button('danger')} onClick={() => setMode('reject')}><X className="size-4" /> Refuser</button>
          <button type="button" className={button('success')} onClick={() => setMode('approve')}><Check className="size-4" /> Accepter</button>
        </div>
      )}>
      {created ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-900">Demande acceptée. Un brouillon <strong>non publié</strong> a été créé et lié au propriétaire. Complétez la fiche puis publiez-la.</p>
          {link && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
              <p className="font-semibold">Lien d’activation à usage unique (72 h)</p>
              <p>Affiché une seule fois — à transmettre uniquement au propriétaire si l’e-mail n’arrive pas.</p>
              <div className="mt-2 flex gap-2">
                <input readOnly value={link} aria-label="Lien d’activation" className={cn(inputCls, 'font-mono text-[11.5px]')} onFocus={(e) => e.target.select()} />
                <button type="button" className={button('outline')} onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success('Lien copié.'); } catch { toast.error('Copie impossible.'); } }}><Copy className="size-4" /></button>
              </div>
            </div>
          )}
          <Link href={`/admin/guesthouses/${created}`} className={button('primary')}>Ouvrir le brouillon</Link>
        </div>
      ) : mode === 'approve' ? (
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          m.mutate(async () => {
            const r = await approveApplication(app.id, { ...f, ownerPhone: f.ownerPhone || undefined, governorate: f.governorate || undefined, note: f.note || undefined });
            toast.success('Demande acceptée.'); setLink(r.setupLink); setCreated(r.venueId); refresh();
          });
        }}>
          <p className="rounded-lg bg-[#FBFAF8] p-3 text-[12.5px] text-[#4A4740]">Crée (ou réutilise) le compte propriétaire, l’invite à choisir son mot de passe et crée une fiche <strong>brouillon</strong>. Rien n’est publié automatiquement.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label htmlFor="a-on" className={labelCls}>Nom du propriétaire</label><input id="a-on" className={inputCls} value={f.ownerFullName} onChange={(e) => setF({ ...f, ownerFullName: e.target.value })} required /></div>
            <div><label htmlFor="a-oe" className={labelCls}>E-mail</label><input id="a-oe" type="email" className={inputCls} value={f.ownerEmail} onChange={(e) => setF({ ...f, ownerEmail: e.target.value })} required /></div>
            <div><label htmlFor="a-op" className={labelCls}>Téléphone</label><input id="a-op" className={inputCls} value={f.ownerPhone} onChange={(e) => setF({ ...f, ownerPhone: e.target.value })} /></div>
            <div><label htmlFor="a-vn" className={labelCls}>Nom de la maison</label><input id="a-vn" className={inputCls} value={f.venueName} onChange={(e) => setF({ ...f, venueName: e.target.value })} required /></div>
            <div><label htmlFor="a-c" className={labelCls}>Ville</label><input id="a-c" className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
            <div><label htmlFor="a-g" className={labelCls}>Gouvernorat</label><select id="a-g" className={selectCls} value={f.governorate} onChange={(e) => setF({ ...f, governorate: e.target.value })}><option value="">—</option>{GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
          </div>
          <div><label htmlFor="a-n" className={labelCls}>Note interne (facultatif)</label><input id="a-n" className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={1000} /></div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" className="size-4 accent-[#C99628]" checked={f.sendInvite} onChange={(e) => setF({ ...f, sendInvite: e.target.checked })} /> Envoyer l’invitation par e-mail</label>
          <div className="flex justify-end gap-2"><button type="button" className={button('ghost')} onClick={() => setMode('view')}>Retour</button><button type="submit" className={button('success')} disabled={m.isPending}>{m.isPending && <Spinner />} Accepter et créer le brouillon</button></div>
        </form>
      ) : mode === 'reject' ? (
        <div className="space-y-3">
          <label htmlFor="r-note" className={labelCls}>Motif du refus (interne)</label>
          <textarea id="r-note" className={cn(inputCls, 'h-28 py-2')} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} maxLength={1000} />
          <p className="text-[12px] text-[#6B6760]">Aucun e-mail n’est envoyé automatiquement : contactez le demandeur si nécessaire.</p>
          <div className="flex justify-end gap-2"><button type="button" className={button('ghost')} onClick={() => setMode('view')}>Retour</button>
            <button type="button" className={button('danger')} disabled={m.isPending} onClick={() => m.mutate(async () => { await rejectApplication(app.id, rejectNote.trim() || undefined); toast.success('Demande refusée.'); refresh(); onClose(); })}>{m.isPending && <Spinner />} Confirmer le refus</button></div>
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="divide-y divide-[#F1EFEA]">
            <Field label="Statut"><StatusBadge status={statusOf(app)} map={APP_STATUS} /></Field>
            <Field label="Contact">{app.contactName}</Field>
            <Field label="E-mail"><a href={`mailto:${app.email}`} className="inline-flex items-center gap-1 text-[#8A6514] hover:underline"><Mail className="size-3.5" />{app.email}</a></Field>
            <Field label="Téléphone"><a href={`tel:${app.phone}`} className="inline-flex items-center gap-1 text-[#8A6514] hover:underline"><Phone className="size-3.5" />{app.phone}</a></Field>
            <Field label="Ville">{app.city}</Field>
            {app.decidedAt && <Field label="Décision">{app.decision === 'approved' ? 'Acceptée' : 'Refusée'} le {fmtDateTime(app.decidedAt)}{app.decidedBy ? ` par ${app.decidedBy.name}` : ''}</Field>}
            {app.decisionNote && <Field label="Note">{app.decisionNote}</Field>}
            {app.venue && <Field label="Fiche créée"><Link href={`/admin/guesthouses/${app.venue.id}`} className="text-[#8A6514] hover:underline">{app.venue.name}</Link></Field>}
            {app.owner && <Field label="Propriétaire"><Link href={`/admin/owners?owner=${app.owner.id}`} className="text-[#8A6514] hover:underline">{app.owner.name}</Link></Field>}
          </dl>
          {app.message && <section><h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">Message</h3><p className="whitespace-pre-line rounded-lg bg-[#FBFAF8] p-3 text-[13px] text-[#171717]">{app.message}</p></section>}
          {!decided && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A867E]">Suivi</h3>
              <div className="flex flex-wrap gap-2">
                {(['in_review', 'contacted'] as const).map((st) => (
                  <button key={st} type="button" className={button(app.status === st ? 'dark' : 'outline', 'h-8')} disabled={m.isPending || app.status === st}
                    onClick={() => m.mutate(async () => { await updateApplication(app.id, { status: st }); toast.success('Statut mis à jour.'); refresh(); })}>
                    {st === 'in_review' ? 'Marquer en examen' : 'Informations demandées'}
                  </button>
                ))}
              </div>
              <label htmlFor="ap-notes" className={labelCls}>Notes internes</label>
              <textarea id="ap-notes" className={cn(inputCls, 'h-24 py-2')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
              <button type="button" className={button('outline', 'h-8')} disabled={m.isPending || notes === (app.adminNotes ?? '')}
                onClick={() => m.mutate(async () => { await updateApplication(app.id, { adminNotes: notes }); toast.success('Notes enregistrées.'); refresh(); })}>Enregistrer les notes</button>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
