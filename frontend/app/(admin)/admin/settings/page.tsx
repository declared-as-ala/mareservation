'use client';

/**
 * Paramètres — only what the guesthouse business needs. Legacy restaurant/event/ticket settings are gone from the UI
 * (the AppSettings document keeps them untouched). SMTP credentials are server-side environment variables: shown as
 * status only, never returned to the browser.
 */
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Mail, RefreshCw, RotateCcw, Send, ShieldCheck, XCircle } from 'lucide-react';
import {
  fetchBookingConfig, fetchEmailStatus, fetchOutbox, fetchSiteSettings, retryEmail, saveSiteSettings, sendTestEmail, type SiteSettings,
} from '@/lib/api/admin-console';
import { changePassword, updateMyProfile } from '@/lib/api/auth';
import { CANCELLATION_LABEL } from '@/lib/api/bookings';
import { useAuthStore } from '@/stores/auth';
import { Card, ErrorBox, Field, PageHeader, Skeleton, Spinner, button, fmtDateTime, inputCls, labelCls, selectCls, td, th } from '@/components/admin/console/ui';
import { cn } from '@/lib/utils';

const TABS = [['general', 'Général'], ['reservations', 'Réservations'], ['emails', 'Notifications & SMTP'], ['security', 'Sécurité']] as const;
type Tab = (typeof TABS)[number][0];

function SettingsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS.find(([k]) => k === sp.get('tab'))?.[0] ?? 'general') as Tab;
  return (
    <div className="space-y-4">
      <PageHeader title="Paramètres" subtitle="Configuration essentielle d’Exploria360" />
      <div role="tablist" aria-label="Paramètres" className="flex gap-1 overflow-x-auto border-b border-[#E7E4DD]">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => router.replace(`${pathname}?tab=${k}`, { scroll: false })}
            className={cn('-mb-px h-10 shrink-0 border-b-2 px-3 text-[13px] font-medium', tab === k ? 'border-[#C99628] text-[#171717]' : 'border-transparent text-[#6B6760] hover:text-[#171717]')}>{l}</button>
        ))}
      </div>
      {tab === 'general' && <GeneralSettings />}
      {tab === 'reservations' && <ReservationSettings />}
      {tab === 'emails' && <EmailSettings />}
      {tab === 'security' && <SecuritySettings />}
    </div>
  );
}

function GeneralSettings() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-site-settings'], queryFn: fetchSiteSettings });
  const [f, setF] = useState<SiteSettings>({});
  useEffect(() => { if (data) setF({ siteName: data.siteName ?? 'Exploria360', supportEmail: data.supportEmail ?? '', supportPhone: data.supportPhone ?? '', defaultLanguage: data.defaultLanguage ?? 'fr', logoUrlLight: data.logoUrlLight ?? '', logoUrlDark: data.logoUrlDark ?? '', isMaintenanceMode: !!data.isMaintenanceMode, maintenanceMessageFr: data.maintenanceMessageFr ?? '' }); }, [data]);
  const m = useMutation({
    mutationFn: () => saveSiteSettings({ ...f, supportEmail: f.supportEmail?.trim(), supportPhone: f.supportPhone?.trim() }),
    onSuccess: () => { toast.success('Paramètres enregistrés.'); qc.invalidateQueries({ queryKey: ['admin-site-settings'] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Enregistrement impossible.'),
  });
  if (isLoading) return <Skeleton className="h-80" />;
  if (error) return <ErrorBox error={error} onRetry={() => refetch()} />;
  const emailOk = !f.supportEmail || /\S+@\S+\.\S+/.test(f.supportEmail);
  return (
    <Card title="Informations publiques">
      <form className="grid grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (emailOk) m.mutate(); }}>
        <div><label htmlFor="s-name" className={labelCls}>Nom du site</label><input id="s-name" className={inputCls} value={f.siteName ?? ''} onChange={(e) => setF({ ...f, siteName: e.target.value })} maxLength={80} /></div>
        <div>
          <label htmlFor="s-lang" className={labelCls}>Langue par défaut</label>
          <select id="s-lang" className={selectCls} value={f.defaultLanguage} onChange={(e) => setF({ ...f, defaultLanguage: e.target.value })}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select>
        </div>
        <div><label htmlFor="s-email" className={labelCls}>E-mail de contact public</label><input id="s-email" type="email" className={inputCls} value={f.supportEmail ?? ''} onChange={(e) => setF({ ...f, supportEmail: e.target.value })} />{!emailOk && <p className="mt-1 text-[12px] text-red-700">Adresse invalide.</p>}</div>
        <div><label htmlFor="s-phone" className={labelCls}>Téléphone d’assistance</label><input id="s-phone" type="tel" className={inputCls} value={f.supportPhone ?? ''} onChange={(e) => setF({ ...f, supportPhone: e.target.value })} maxLength={30} /></div>
        <div><label htmlFor="s-logo-l" className={labelCls}>Logo (fond clair) — URL</label><input id="s-logo-l" className={inputCls} value={f.logoUrlLight ?? ''} onChange={(e) => setF({ ...f, logoUrlLight: e.target.value })} placeholder="https://…" /></div>
        <div><label htmlFor="s-logo-d" className={labelCls}>Logo (fond sombre) — URL</label><input id="s-logo-d" className={inputCls} value={f.logoUrlDark ?? ''} onChange={(e) => setF({ ...f, logoUrlDark: e.target.value })} placeholder="https://…" /></div>
        <div className="rounded-xl border border-[#E7E4DD] p-3 lg:col-span-2">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span><span className="block text-[13px] font-semibold">Mode maintenance</span><span className="text-[12px] text-[#6B6760]">Affiche un message de maintenance aux visiteurs.</span></span>
            <input type="checkbox" className="size-5 accent-[#C99628]" checked={!!f.isMaintenanceMode} onChange={(e) => setF({ ...f, isMaintenanceMode: e.target.checked })} />
          </label>
          {f.isMaintenanceMode && <input aria-label="Message de maintenance" className={cn(inputCls, 'mt-3')} value={f.maintenanceMessageFr ?? ''} onChange={(e) => setF({ ...f, maintenanceMessageFr: e.target.value })} placeholder="Nous revenons très vite…" />}
        </div>
        <div className="flex justify-end lg:col-span-2"><button type="submit" className={button('primary')} disabled={m.isPending || !emailOk}>{m.isPending && <Spinner />} Enregistrer</button></div>
      </form>
    </Card>
  );
}

function ReservationSettings() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-booking-config'], queryFn: fetchBookingConfig });
  if (isLoading) return <Skeleton className="h-60" />;
  if (error || !data) return <ErrorBox error={error} />;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Règles de réservation" subtitle="Valeurs appliquées par le moteur de réservation">
        <dl className="divide-y divide-[#F1EFEA]">
          <Field label="Expiration des demandes">{data.requestTtlHours} h {data.requestTtlSource === 'env' ? '(BOOKING_REQUEST_TTL_HOURS)' : '(valeur par défaut)'}</Field>
          <Field label="Mode par défaut (nouvelle maison)">Validation par le propriétaire</Field>
          <Field label="Fuseau horaire">{data.timezone}</Field>
          <Field label="Format des références"><span className="font-mono text-[12px]">{data.referenceExample}</span></Field>
          <Field label="Références de démonstration"><span className="font-mono text-[12px]">{data.demoReferenceExample}</span></Field>
        </dl>
        <p className="mt-3 text-[12px] text-[#6B6760]">L’expiration se règle côté serveur (variable d’environnement) pour éviter les changements accidentels en production. Les références sont séquentielles par année et jamais réutilisées.</p>
      </Card>
      <Card title="Annulation" subtitle="Définie par maison (onglet Général de chaque fiche)">
        <dl className="divide-y divide-[#F1EFEA]">
          {(['flexible', 'moderate', 'strict'] as const).map((k) => <Field key={k} label={CANCELLATION_LABEL[k].title}>{CANCELLATION_LABEL[k].text}</Field>)}
        </dl>
        <p className="mt-3 text-[12px] text-[#6B6760]">Aucun paiement n’est encaissé en ligne : les montants affichés dans l’administration sont des valeurs réservées.</p>
      </Card>
    </div>
  );
}

function EmailSettings() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['admin-email-status'], queryFn: () => fetchEmailStatus(false) });
  const [outboxFilter, setOutboxFilter] = useState('');
  const outbox = useQuery({ queryKey: ['admin-outbox', outboxFilter], queryFn: () => fetchOutbox(outboxFilter || undefined) });
  const [to, setTo] = useState('');
  const verify = useMutation({ mutationFn: () => fetchEmailStatus(true), onSuccess: (d) => qc.setQueryData(['admin-email-status'], d) });
  const test = useMutation({
    mutationFn: () => sendTestEmail(to.trim()),
    onSuccess: (d) => { d.status === 'sent' ? toast.success('E-mail de test envoyé.') : toast.error(`Échec : ${d.error ?? d.status}`); qc.invalidateQueries({ queryKey: ['admin-outbox'] }); qc.invalidateQueries({ queryKey: ['admin-email-status'] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Envoi impossible.'),
  });
  const retry = useMutation({ mutationFn: retryEmail, onSuccess: () => { toast.success('Remis en file.'); qc.invalidateQueries({ queryKey: ['admin-outbox'] }); }, onError: (e) => toast.error(e instanceof Error ? e.message : 'Relance impossible.') });
  const s = (verify.data ?? status.data) as Record<string, any> | undefined;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Serveur SMTP" subtitle="Configuré par variables d’environnement serveur — les secrets ne sont jamais affichés"
          action={<button type="button" className={button('outline', 'h-8')} onClick={() => verify.mutate()} disabled={verify.isPending}>{verify.isPending ? <Spinner /> : <RefreshCw className="size-3.5" />} Tester la connexion</button>}>
          {status.isLoading ? <Skeleton className="h-40" /> : status.error ? <ErrorBox error={status.error} /> : s && (
            <dl className="divide-y divide-[#F1EFEA]">
              <Field label="État">{s.configured ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-4" /> Configuré</span> : <span className="inline-flex items-center gap-1 text-red-700"><XCircle className="size-4" /> Non configuré</span>}</Field>
              {s.verified != null && <Field label="Connexion">{s.verified ? <span className="text-emerald-700">Vérifiée</span> : <span className="text-red-700">Échec{s.error ? ` — ${s.error}` : ''}</span>}</Field>}
              <Field label="Hôte">{s.host ?? '—'}{s.port ? `:${s.port}` : ''}</Field>
              <Field label="Connexion sécurisée">{s.secure ? 'Oui (TLS)' : 'STARTTLS / non'}</Field>
              <Field label="Identifiant">{s.user ?? '—'}</Field>
              <Field label="Expéditeur">{s.from ?? '—'}</Field>
              <Field label="Notifications admin">{s.adminNotificationEmail ?? '—'}</Field>
              {s.senderDomainMatchesBrand === false && <p className="pt-2 text-[12px] text-amber-800">L’expéditeur n’utilise pas le domaine exploria360.com — risque de délivrabilité.</p>}
            </dl>
          )}
        </Card>
        <Card title="Envoyer un e-mail de test" subtitle="Passe par la vraie file d’envoi (outbox)">
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (/\S+@\S+\.\S+/.test(to)) test.mutate(); }}>
            <label htmlFor="t-to" className="sr-only">Destinataire</label>
            <input id="t-to" type="email" required className={inputCls} placeholder="vous@exemple.com" value={to} onChange={(e) => setTo(e.target.value)} />
            <button type="submit" className={button('primary')} disabled={test.isPending}>{test.isPending ? <Spinner /> : <Send className="size-4" />} Envoyer</button>
          </form>
          {test.data && <p className={cn('mt-3 text-[12.5px]', test.data.status === 'sent' ? 'text-emerald-700' : 'text-red-700')}>{test.data.status === 'sent' ? `Envoyé ${test.data.sentAt ? fmtDateTime(test.data.sentAt) : ''}` : `Statut : ${test.data.status}${test.data.error ? ` — ${test.data.error}` : ''}`}</p>}
          {s?.outbox && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[['En file', s.outbox.queued], ['Envoyés 24 h', s.outbox.sent24h], ['En échec', s.outbox.failed]].map(([l, v]) => (
                <div key={l as string} className={cn('rounded-lg px-2 py-2', l === 'En échec' && (v as number) > 0 ? 'bg-red-50' : 'bg-[#FBFAF8]')}>
                  <p className="text-[11px] text-[#8A867E]">{l}</p><p className="text-[16px] font-semibold tabular-nums">{v as number}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Card title="Historique d’envoi" action={
        <select aria-label="Filtrer" className={cn(selectCls, 'h-8 w-36')} value={outboxFilter} onChange={(e) => setOutboxFilter(e.target.value)}>
          <option value="">Tous</option><option value="failed">En échec</option><option value="queued">En file</option><option value="sent">Envoyés</option>
        </select>
      } bodyClassName="px-0 sm:px-0 pb-0">
        {outbox.isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : !outbox.data?.length ? <p className="px-5 pb-5 text-[13px] text-[#8A867E]">Aucun e-mail.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FBFAF8]"><tr><th className={th}>Date</th><th className={th}>Événement</th><th className={th}>Destinataire</th><th className={th}>Statut</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {outbox.data.map((e) => (
                  <tr key={e._id} className="border-t border-[#F1EFEA]">
                    <td className={cn(td, 'text-[#6B6760]')}>{fmtDateTime(e.createdAt)}</td>
                    <td className={td}><span className="block max-w-[18rem] truncate">{e.subject}</span><span className="text-[11.5px] text-[#8A867E]">{e.event} · {e.recipientRole}</span></td>
                    <td className={cn(td, 'max-w-[14rem] truncate')}>{e.to}</td>
                    <td className={td}>
                      <span className={e.status === 'sent' ? 'text-emerald-700' : e.status === 'failed' ? 'text-red-700' : 'text-amber-700'}>{e.status === 'sent' ? 'Envoyé' : e.status === 'failed' ? 'Échec' : 'En file'}</span>
                      {e.lastError && <span className="block max-w-[16rem] truncate text-[11px] text-red-700" title={e.lastError}>{e.lastError}</span>}
                    </td>
                    <td className={cn(td, 'text-right')}>{e.status === 'failed' && <button type="button" className={button('outline', 'h-7 px-2')} disabled={retry.isPending} onClick={() => retry.mutate(e._id)}><RotateCcw className="size-3.5" /> Renvoyer</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SecuritySettings() {
  const { user, setAuth } = useAuthStore();
  const [p, setP] = useState({ fullName: user?.fullName ?? '', phone: user?.phone ?? '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const profile = useMutation({
    mutationFn: () => updateMyProfile({ fullName: p.fullName.trim(), phone: p.phone.trim() || undefined }),
    onSuccess: (u) => { if (user) setAuth({ ...user, fullName: u.fullName, phone: u.phone }); toast.success('Profil mis à jour.'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec.'),
  });
  const password = useMutation({
    mutationFn: () => changePassword(pw.current, pw.next),
    onSuccess: () => { setPw({ current: '', next: '', confirm: '' }); toast.success('Mot de passe modifié.'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec.'),
  });
  const pwError = pw.confirm && pw.next !== pw.confirm ? 'Les mots de passe ne correspondent pas.' : '';
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Profil administrateur">
        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); profile.mutate(); }}>
          <div><label htmlFor="a-name" className={labelCls}>Nom</label><input id="a-name" className={inputCls} value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} minLength={2} required /></div>
          <div><label htmlFor="a-email" className={labelCls}>E-mail</label><input id="a-email" className={inputCls} value={user?.email ?? ''} disabled /></div>
          <div><label htmlFor="a-phone" className={labelCls}>Téléphone</label><input id="a-phone" type="tel" className={inputCls} value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
          <div className="flex justify-end"><button type="submit" className={button('primary')} disabled={profile.isPending}>{profile.isPending && <Spinner />} Enregistrer</button></div>
        </form>
      </Card>
      <Card title="Mot de passe" subtitle="La politique de robustesse du serveur s’applique">
        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!pwError && pw.current && pw.next) password.mutate(); }}>
          <div><label htmlFor="pw-c" className={labelCls}>Mot de passe actuel</label><input id="pw-c" type="password" autoComplete="current-password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></div>
          <div><label htmlFor="pw-n" className={labelCls}>Nouveau mot de passe</label><input id="pw-n" type="password" autoComplete="new-password" className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></div>
          <div><label htmlFor="pw-r" className={labelCls}>Confirmer</label><input id="pw-r" type="password" autoComplete="new-password" className={inputCls} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></div>
          {pwError && <p className="text-[12px] text-red-700">{pwError}</p>}
          <div className="flex justify-end"><button type="submit" className={button('primary')} disabled={password.isPending || !!pwError || !pw.current || !pw.next}>{password.isPending && <Spinner />} Modifier</button></div>
        </form>
      </Card>
      <Card title="Sessions" className="lg:col-span-2">
        <p className="flex items-start gap-2 text-[12.5px] text-[#4A4740]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8A6514]" />
          Suspendre un compte (propriétaire ou client) révoque immédiatement toutes ses sessions. La liste des sessions actives par appareil n’est pas encore disponible.</p>
        <p className="mt-2 flex items-center gap-2 text-[12px] text-[#8A867E]"><Mail className="size-3.5" /> Le journal d’audit des actions sensibles reste enregistré côté serveur.</p>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><SettingsInner /></Suspense>;
}
