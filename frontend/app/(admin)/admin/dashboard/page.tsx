'use client';

/**
 * Tableau de bord — every number comes from /admin-console/analytics (see backend services/adminAnalytics.ts
 * for the metric definitions). All widgets share the selected period.
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, BedDouble, CalendarCheck2, CalendarClock, Coins, Home, Inbox, LogIn, LogOut, MailWarning,
  Percent, RefreshCw, UserCheck,
} from 'lucide-react';
import { fetchAnalytics, fetchReservations, type Analytics } from '@/lib/api/admin-console';
import {
  Card, Change, EmptyState, ErrorBox, KpiCard, PageHeader, PeriodSelector, RES_STATUS, Skeleton, StatusBadge, button, fmtCompactTND,
  fmtDateTime, fmtInt, fmtStayDay, fmtTND, periodFromPreset, td, th, type PeriodValue,
} from '@/components/admin/console/ui';
import { ReservationDrawer } from '@/components/admin/console/ReservationDrawer';
import { cn } from '@/lib/utils';

const GOLD = '#C99628';
const GOLD_SOFT = '#E9D3A0';
const INK = '#171717';
const MUTED = '#8A867E';
const GRID = '#EFEDE8';

const axisDate = (group: string) => (d: string) => {
  const date = new Date(`${d}T00:00:00Z`);
  return group === 'month'
    ? date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
};
const tooltipDate = (group: string) => (d: string) => {
  const date = new Date(`${d}T00:00:00Z`);
  if (group === 'month') return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return group === 'week' ? `Semaine du ${label}` : label;
};
const tooltipStyle = { borderRadius: 10, border: '1px solid #E7E4DD', boxShadow: '0 8px 24px rgba(23,23,23,0.08)', fontSize: 12, padding: '8px 10px' };

function periodLabel(a?: Analytics) {
  if (!a) return '';
  const f = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return a.period.from === a.period.to ? f(a.period.from) : `${f(a.period.from)} – ${f(a.period.to)}`;
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>(() => periodFromPreset('30d'));
  const [demo, setDemo] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin-analytics', period.from, period.to, demo],
    queryFn: () => fetchAnalytics({ from: period.from, to: period.to, demo }),
    staleTime: 60_000,
  });
  const latest = useQuery({
    queryKey: ['admin-reservations', 'latest', demo],
    queryFn: () => fetchReservations({ limit: 8, sort: 'created_desc', demo }),
    staleTime: 30_000,
  });
  const a = q.data;
  const k = a?.kpis;
  const loading = q.isLoading;
  const pl = periodLabel(a);
  const refresh = () => { q.refetch(); latest.refetch(); };

  const statusTotal = useMemo(() => a?.statusBreakdown.reduce((s, x) => s + x.count, 0) ?? 0, [a]);
  const hasSeries = !!a?.series.some((s) => s.confirmed || s.pending || s.cancelled);
  const hasValue = !!a?.series.some((s) => s.value || s.previousValue);
  const maxGov = Math.max(1, ...(a?.governorates.map((g) => g.bookings) ?? [1]));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d’ensemble de l’activité Exploria360"
        actions={
          <>
            <PeriodSelector value={period} onChange={setPeriod} />
            <button type="button" onClick={refresh} className={button('outline', 'h-9 w-9 px-0')} aria-label="Actualiser" title="Actualiser">
              <RefreshCw className={cn('size-4', (q.isFetching || latest.isFetching) && 'animate-spin')} />
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6B6760]">
        <span>
          {a ? <>Période : <strong className="font-semibold text-[#171717]">{pl}</strong> · heure de Tunis · actualisé {fmtDateTime(a.generatedAt)}</> : 'Chargement…'}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="size-4 accent-[#C99628]" />
          Inclure les données de démonstration
          {!demo && !!a?.excludedDemoReservations && <span className="rounded bg-[#F1EFEA] px-1.5 py-0.5 text-[11px]">{a.excludedDemoReservations} exclue{a.excludedDemoReservations > 1 ? 's' : ''}</span>}
        </label>
      </div>

      {q.error && <ErrorBox error={q.error} onRetry={() => q.refetch()} />}

      {/* Operations — alerts first, Protein-style */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <OpsCard href="/admin/reservations?status=pending" icon={CalendarClock} tone={a?.operations.overdue ? 'danger' : a?.operations.pending ? 'warning' : 'neutral'} value={a?.operations.pending} loading={loading}
          label="réservations à confirmer" sub={a?.operations.overdue ? `${a.operations.overdue} expire${a.operations.overdue > 1 ? 'nt' : ''} sous ${k?.pendingReservations.overdueWindowHours} h` : 'aucune urgence'} />
        <OpsCard href="/admin/reservations?dateField=checkIn&status=confirmed&today=1" icon={LogIn} tone="neutral" value={a?.operations.arrivalsToday} loading={loading} label="arrivées aujourd’hui" sub="séjours confirmés" />
        <OpsCard href="/admin/reservations?dateField=checkOut&status=confirmed&today=1" icon={LogOut} tone="neutral" value={a?.operations.departuresToday} loading={loading} label="départs aujourd’hui" sub="séjours confirmés" />
        <OpsCard href="/admin/applications" icon={Inbox} tone={a?.operations.newApplications ? 'warning' : 'neutral'} value={a?.operations.newApplications} loading={loading} label="demandes propriétaires" sub="à examiner" />
        <OpsCard href="#problemes" icon={AlertTriangle} tone={(a?.operations.failedEmails || a?.operations.notReady.length) ? 'danger' : 'neutral'}
          value={a ? a.operations.failedEmails + a.operations.notReady.length : undefined} loading={loading} label="problèmes opérationnels"
          sub={a ? `${a.operations.failedEmails} e-mail${a.operations.failedEmails > 1 ? 's' : ''} en échec · ${a.operations.notReady.length} fiche${a.operations.notReady.length > 1 ? 's' : ''} incomplète${a.operations.notReady.length > 1 ? 's' : ''}` : ''} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Réservations confirmées" icon={CalendarCheck2} loading={loading} href={`/admin/reservations?status=live&from=${period.from}&to=${period.to}`}
          value={fmtInt(k?.confirmedReservations.value)}
          footer={k && <><Change pct={k.confirmedReservations.changePct} /> <span>vs {fmtInt(k.confirmedReservations.previous)} période précédente</span></>}
          tooltip="Réservations créées sur la période dont le statut actuel est confirmée, en séjour ou terminée." />
        <KpiCard label="Réservations à confirmer" icon={CalendarClock} loading={loading} tone={k?.pendingReservations.overdue ? 'warning' : 'default'} href="/admin/reservations?status=pending"
          value={fmtInt(k?.pendingReservations.value)}
          footer={k && (k.pendingReservations.overdue ? <span className="font-semibold text-amber-800">{k.pendingReservations.overdue} à traiter sous {k.pendingReservations.overdueWindowHours} h</span> : <span>Aucune demande proche de l’expiration</span>)}
          tooltip="Demandes en attente de réponse, toutes dates confondues. « À traiter » = expiration de la demande dans les 12 prochaines heures." />
        <KpiCard label="Valeur des réservations" icon={Coins} loading={loading} href={`/admin/reservations?status=live&from=${period.from}&to=${period.to}`}
          value={k ? fmtTND(k.bookingValue.value) : '—'}
          footer={k && <><Change pct={k.bookingValue.changePct} /> <span>vs {fmtTND(k.bookingValue.previous)}</span></>}
          tooltip="Somme des montants des réservations confirmées créées sur la période. Valeur réservée — ce n’est pas un montant encaissé." />
        <KpiCard label="Maisons d’hôtes actives" icon={Home} loading={loading} href="/admin/guesthouses?filter=bookable"
          value={fmtInt(k?.activeGuesthouses.value)}
          footer={k && <span>sur {fmtInt(k.activeGuesthouses.total)} fiche{k.activeGuesthouses.total > 1 ? 's' : ''} · publiées et réservables</span>}
          tooltip="Maisons publiées, approuvées, réservations ouvertes et tarifs/capacité configurés." />
        <KpiCard label="Propriétaires actifs" icon={UserCheck} loading={loading} href="/admin/owners"
          value={fmtInt(k?.activeOwners.value)} footer={<span>comptes actifs avec au moins une maison</span>} />
        <KpiCard label="Taux d’occupation" icon={Percent} loading={loading} href="/admin/reservations/calendar"
          value={k?.occupancy.rate == null ? '—' : `${k.occupancy.rate.toLocaleString('fr-FR')} %`}
          footer={k && <>{k.occupancy.changePts != null && <Change pts={k.occupancy.changePts} />}<span>{fmtInt(k.occupancy.bookedNights)} / {fmtInt(k.occupancy.bookableNights)} nuits</span></>}
          tooltip="Nuits réservées ÷ nuits disponibles sur les dates de la période. Maison entière = 1 unité, sinon 1 unité par chambre active. Les nuits bloquées sont retirées de l’inventaire." />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Réservations par jour" subtitle={a ? `Par date de création · regroupement ${a.period.group === 'day' ? 'quotidien' : a.period.group === 'week' ? 'hebdomadaire' : 'mensuel'}` : undefined}>
          {loading ? <Skeleton className="h-[260px]" /> : !hasSeries ? (
            <EmptyState compact icon={CalendarCheck2} title="Aucune réservation sur la période" text="Les réservations apparaîtront ici dès leur création." />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a!.series} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="date" tickFormatter={axisDate(a!.period.group)} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={tooltipDate(a!.period.group)} cursor={{ fill: '#F7F1E3' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                  <Bar dataKey="confirmed" name="Confirmées" stackId="r" fill={GOLD} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" name="À confirmer" stackId="r" fill={GOLD_SOFT} />
                  <Bar dataKey="cancelled" name="Annulées / refusées" stackId="r" fill="#D6D2C8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Statuts des réservations" subtitle={a ? `${fmtInt(statusTotal)} réservation${statusTotal > 1 ? 's' : ''} créée${statusTotal > 1 ? 's' : ''} sur la période` : undefined}>
          {loading ? <Skeleton className="h-[260px]" /> : !statusTotal ? (
            <EmptyState compact icon={CalendarClock} title="Aucune donnée" text="Aucune réservation créée sur cette période." />
          ) : (
            <ul className="space-y-3 pt-1">
              {['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'expired', 'no_show'].map((s) => {
                const n = a!.statusBreakdown.find((x) => x.status === s)?.count ?? 0;
                if (!n && !['pending', 'confirmed', 'cancelled'].includes(s)) return null;
                const share = statusTotal ? (n / statusTotal) * 100 : 0;
                return (
                  <li key={s}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="text-[#4A4740]">{RES_STATUS[s]?.label ?? s}</span>
                      <span className="tabular-nums text-[#171717]"><strong className="font-semibold">{n}</strong> <span className="text-[#8A867E]">· {Math.round(share)} %</span></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F1EFEA]" role="presentation">
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${share}%`, background: RES_STATUS[s]?.color ?? MUTED }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Valeur des réservations" subtitle="Réservations confirmées (TND) · pointillés : période précédente · valeur réservée, non encaissée">
          {loading ? <Skeleton className="h-[240px]" /> : !hasValue ? (
            <EmptyState compact icon={Coins} title="Aucune valeur réservée" text="Aucune réservation confirmée sur cette période ni la précédente." />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={a!.series} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="date" tickFormatter={axisDate(a!.period.group)} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis tickFormatter={fmtCompactTND} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={tooltipDate(a!.period.group)} formatter={(v: number, n: string) => [fmtTND(v), n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                  <Area type="monotone" dataKey="value" name="Période" stroke={GOLD} strokeWidth={2} fill="url(#valueFill)" />
                  <Line type="monotone" dataKey="previousValue" name="Période précédente" stroke={MUTED} strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Taux d’occupation" subtitle="Nuits réservées / nuits disponibles">
          {loading ? <Skeleton className="h-[240px]" /> : !k?.occupancy.bookableNights ? (
            <EmptyState compact icon={BedDouble} title="Pas d’inventaire" text="Aucune maison publiée avec chambres ou capacité configurées." />
          ) : (
            <div className="flex h-[240px] flex-col justify-center">
              <div className="flex items-end gap-2">
                <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#171717]">{k.occupancy.rate?.toLocaleString('fr-FR')} %</span>
                {k.occupancy.changePts != null && <Change pts={k.occupancy.changePts} />}
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#F1EFEA]" role="img" aria-label={`Occupation ${k.occupancy.rate} %`}>
                <div className="h-full rounded-full bg-[#C99628] transition-[width] duration-700" style={{ width: `${Math.min(100, k.occupancy.rate ?? 0)}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Réservées', k.occupancy.bookedNights],
                  ['Disponibles', k.occupancy.bookableNights],
                  ['Bloquées', k.occupancy.blockedNights],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-lg bg-[#FBFAF8] px-2 py-2">
                    <dt className="text-[11px] text-[#8A867E]">{l}</dt>
                    <dd className="text-[15px] font-semibold tabular-nums text-[#171717]">{fmtInt(v as number)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-[11px] text-[#8A867E]">Nuits bloquées retirées des nuits disponibles.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: top maisons + governorates */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card title="Top maisons d’hôtes" subtitle="Classées par valeur confirmée sur la période" action={<Link href="/admin/guesthouses" className="text-[12px] font-semibold text-[#8A6514] hover:underline">Toutes</Link>}>
          {loading ? <Skeleton className="h-48" /> : !a?.topProperties.length ? (
            <EmptyState compact icon={Home} title="Aucune réservation confirmée" text="Le classement s’affichera dès la première réservation confirmée." />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:-mx-5">
              <table className="w-full">
                <thead><tr className="border-b border-[#F1EFEA]"><th className={th}>Maison</th><th className={cn(th, 'text-right')}>Réserv.</th><th className={cn(th, 'text-right')}>Valeur</th><th className={cn(th, 'text-right')}>Occupation</th></tr></thead>
                <tbody>
                  {a.topProperties.map((p, i) => (
                    <tr key={p.id} className="border-b border-[#F7F5F1] last:border-0 hover:bg-[#FBFAF8]">
                      <td className={td}>
                        <Link href={`/admin/guesthouses/${p.id}`} className="flex items-center gap-2 font-medium hover:text-[#8A6514]">
                          <span className="grid size-5 shrink-0 place-items-center rounded bg-[#F7F1E3] text-[10.5px] font-bold text-[#8A6514]">{i + 1}</span>
                          <span className="max-w-[16rem] truncate">{p.name}</span>
                          {p.city && <span className="hidden text-[12px] font-normal text-[#8A867E] sm:inline">{p.city}</span>}
                        </Link>
                      </td>
                      <td className={cn(td, 'text-right tabular-nums')}>{p.bookings}</td>
                      <td className={cn(td, 'text-right font-semibold tabular-nums')}>{fmtTND(p.value)}</td>
                      <td className={cn(td, 'text-right tabular-nums text-[#4A4740]')}>{p.occupancy == null ? '—' : `${p.occupancy.toLocaleString('fr-FR')} %`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Réservations par gouvernorat" subtitle="Réservations confirmées sur la période, selon la localisation des maisons">
          {loading ? <Skeleton className="h-48" /> : !a?.governorates.length ? (
            <EmptyState compact title="Aucune maison localisée" text="Renseignez le gouvernorat des maisons pour alimenter ce graphique." />
          ) : (
            <>
              <ul className="space-y-2.5">
                {a.governorates.slice(0, 10).map((g) => (
                  <li key={g.name} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-[12.5px]">
                    <span className="truncate text-[#4A4740]">{g.name}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-[#F1EFEA]">
                      <span className="block h-full rounded-full bg-[#C99628]" style={{ width: `${(g.bookings / maxGov) * 100}%` }} />
                    </span>
                    <span className="w-28 text-right tabular-nums text-[#171717]">
                      <strong className="font-semibold">{g.bookings}</strong>
                      <span className="text-[#8A867E]"> · {g.properties} maison{g.properties > 1 ? 's' : ''}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {a.withoutGovernorate > 0 && <p className="mt-3 text-[11.5px] text-[#8A867E]">{a.withoutGovernorate} maison{a.withoutGovernorate > 1 ? 's' : ''} sans gouvernorat renseigné (non comptée{a.withoutGovernorate > 1 ? 's' : ''}).</p>}
            </>
          )}
        </Card>
      </div>

      {/* Insights */}
      {a && (a.insights.averageBookingValue != null || a.insights.cancellationRate != null) && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Valeur moyenne', a.insights.averageBookingValue == null ? '—' : fmtTND(a.insights.averageBookingValue)],
            ['Durée moyenne', a.insights.averageStayNights == null ? '—' : `${a.insights.averageStayNights.toLocaleString('fr-FR')} nuit${a.insights.averageStayNights >= 2 ? 's' : ''}`],
            ['Taux d’annulation', a.insights.cancellationRate == null ? '—' : `${a.insights.cancellationRate.toLocaleString('fr-FR')} %`],
            ['Délai de réservation', a.insights.averageLeadDays == null ? '—' : `${a.insights.averageLeadDays} j avant l’arrivée`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-[#E7E4DD] bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B6760]">{l}</p>
              <p className="mt-1 text-[17px] font-semibold tabular-nums text-[#171717]">{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Latest reservations */}
      <Card title="Dernières réservations" action={<Link href="/admin/reservations" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#8A6514] hover:underline">Toutes <ArrowRight className="size-3.5" /></Link>} bodyClassName="px-0 sm:px-0 pb-0">
        {latest.isLoading ? <div className="px-4 pb-4"><Skeleton className="h-40" /></div> : !latest.data?.rows.length ? (
          <EmptyState compact icon={CalendarCheck2} title="Aucune réservation" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FBFAF8]"><tr>
                <th className={th}>Référence</th><th className={th}>Client</th><th className={th}>Maison</th><th className={th}>Arrivée</th><th className={th}>Départ</th>
                <th className={cn(th, 'text-right')}>Total</th><th className={th}>Statut</th><th className={cn(th, 'text-right')}><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody>
                {latest.data.rows.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-t border-[#F1EFEA] hover:bg-[#FBFAF8]">
                    <td className={cn(td, 'font-mono text-[12px]')}>{r.reference}</td>
                    <td className={td}>{r.guest.name ?? '—'}</td>
                    <td className={cn(td, 'max-w-[14rem] truncate')}>{r.property?.name ?? '—'}</td>
                    <td className={td}>{fmtStayDay(r.checkIn)}</td>
                    <td className={td}>{fmtStayDay(r.checkOut)}</td>
                    <td className={cn(td, 'text-right font-semibold tabular-nums')}>{fmtTND(r.total)}</td>
                    <td className={td}><StatusBadge status={r.status} /></td>
                    <td className={cn(td, 'text-right')}>
                      <button type="button" className={button('ghost', 'h-7 px-2')} onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>Détails</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Operational problems detail */}
      {a && (a.operations.failedEmails > 0 || a.operations.notReady.length > 0) && (
        <Card title="Problèmes opérationnels" subtitle="Seuls les problèmes réellement détectés sont listés" className="scroll-mt-20" >
          <div id="problemes" className="space-y-2">
            {a.operations.failedEmails > 0 && (
              <Link href="/admin/settings?tab=emails" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5 text-[13px] hover:bg-red-50">
                <span className="flex items-center gap-2 text-red-800"><MailWarning className="size-4" /> {a.operations.failedEmails} e-mail{a.operations.failedEmails > 1 ? 's' : ''} de réservation en échec</span>
                <ArrowRight className="size-4 text-red-700" />
              </Link>
            )}
            {a.operations.notReady.map((n) => (
              <Link key={n.id} href={`/admin/guesthouses/${n.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#E7E4DD] px-3 py-2.5 text-[13px] hover:bg-[#FBFAF8]">
                <span className="min-w-0"><span className="font-medium text-[#171717]">{n.name}</span> <span className="text-[#8A867E]">— manque : {n.missing.join(', ')}</span></span>
                <ArrowRight className="size-4 shrink-0 text-[#8A6514]" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <ReservationDrawer id={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}

function OpsCard({ href, icon: Icon, value, label, sub, tone, loading }: {
  href: string; icon: React.ComponentType<{ className?: string }>; value?: number; label: string; sub?: string; tone: 'neutral' | 'warning' | 'danger'; loading?: boolean;
}) {
  const active = (value ?? 0) > 0;
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-w-0 flex-col rounded-xl border px-3.5 py-3 transition-colors',
        !active ? 'border-[#E7E4DD] bg-white hover:border-[#D6D2C8]'
          : tone === 'danger' ? 'border-red-200 bg-red-50/70 hover:bg-red-50'
          : tone === 'warning' ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-50'
          : 'border-[#E7E4DD] bg-white hover:border-[#C99628]/40'
      )}
    >
      <span className="flex items-center justify-between">
        <span className={cn('text-[22px] font-semibold tabular-nums leading-none', !active ? 'text-[#171717]' : tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-amber-800' : 'text-[#171717]')}>
          {loading ? <span className="inline-block h-5 w-8 animate-pulse rounded bg-[#F1EFEA]" /> : fmtInt(value ?? 0)}
        </span>
        <Icon className={cn('size-4', !active ? 'text-[#9A968D]' : tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-700' : 'text-[#8A6514]')} aria-hidden="true" />
      </span>
      <span className="mt-1.5 text-[12px] font-medium text-[#171717]">{label}</span>
      {sub && <span className="mt-0.5 truncate text-[11px] text-[#8A867E]">{sub}</span>}
    </Link>
  );
}
