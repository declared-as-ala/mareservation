'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Building2, CalendarCheck, CalendarClock, CheckCircle2,
  BedDouble, BriefcaseBusiness, UtensilsCrossed, BookOpen, ScanEye,
  Tag, Loader2, ArrowUpRight, ImagePlus, type LucideIcon,
} from 'lucide-react';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import { PageHeader, StatCard, Card, SectionTitle, EmptyState, StatusBadge } from '@/components/dashboard/primitives';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

/** Category-aware quick actions — only what this owner's venues need. */
function quickActionsFor(types: Set<string>): QuickAction[] {
  const out: QuickAction[] = [
    { label: 'Photos & description', description: 'Couverture, galerie, 360°, tarifs', href: '/owner/my-establishment', icon: ImagePlus },
  ];
  if (types.has('HOTEL')) {
    out.push({ label: 'Chambres & suites', description: 'Ajouter et tarifer vos chambres', href: '/owner/rooms', icon: BedDouble });
  }
  if (types.has('COWORKING')) {
    out.push({ label: 'Espaces & 360°', description: 'Postes, bureaux, salles — prix & vues', href: '/owner/coworking-operations', icon: BriefcaseBusiness });
  }
  if (types.has('CAFE') || types.has('CAFE_LOUNGE') || types.has('RESTAURANT')) {
    out.push({ label: 'Tables & service', description: 'Plan de tables, réservations du jour', href: '/owner/table-operations', icon: UtensilsCrossed });
    out.push({ label: 'Carte & menu', description: 'Plats, prix, disponibilités', href: '/owner/menu-du-jour', icon: BookOpen });
  }
  if (types.has('EVENT_SPACE') || types.has('CINEMA')) {
    out.push({ label: 'Événements', description: 'Créer et publier vos événements', href: '/owner/events', icon: ScanEye });
  }
  out.push({ label: 'Tarifs & promos', description: 'Règles de prix et codes promo', href: '/owner/pricing', icon: Tag });
  return out;
}

export default function OwnerDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: fetchOwnerDashboard,
  });

  const venues = data?.venues ?? [];
  const types = useMemo(
    () => new Set(venues.map((v) => String(v.type ?? '').toUpperCase())),
    [venues]
  );
  const actions = useMemo(() => quickActionsFor(types), [types]);
  const stats = data?.stats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d’ensemble de vos établissements et réservations."
        icon={LayoutDashboard}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Établissements" value={stats?.totalVenues ?? venues.length} icon={Building2} />
        <StatCard label="Réservations" value={stats?.totalReservations ?? 0} icon={CalendarCheck} />
        <StatCard label="À venir" value={stats?.upcomingReservations ?? 0} icon={CalendarClock} accent />
        <StatCard label="Confirmées" value={stats?.confirmedReservations ?? 0} icon={CheckCircle2} />
      </div>

      {venues.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun établissement pour le moment"
          description="Votre établissement apparaîtra ici. Complétez-le pour commencer à recevoir des réservations."
          action={
            <Link
              href="/owner/my-establishment"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black"
            >
              Configurer mon établissement
            </Link>
          }
        />
      ) : (
        <>
          {/* Category-aware quick actions */}
          <Card>
            <SectionTitle title="Gérer mon activité" subtitle="Les outils adaptés à votre type d’établissement" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.href + a.label}
                    href={a.href}
                    className="group flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all hover:-translate-y-0.5 hover:border-amber-400/25 hover:bg-amber-400/[0.04]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10 text-amber-400">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-sm font-semibold text-neutral-100">
                        {a.label}
                        <ArrowUpRight className="size-3.5 text-neutral-600 transition-colors group-hover:text-amber-400" />
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-neutral-500">{a.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Establishments */}
          <Card>
            <SectionTitle
              title="Mes établissements"
              action={
                <Link href="/owner/my-establishment" className="text-xs font-medium text-amber-400/80 hover:text-amber-400">
                  Gérer →
                </Link>
              }
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v) => (
                <Link
                  key={v._id}
                  href="/owner/my-establishment"
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-amber-400/25"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400/80">
                      {String(v.type).replace('_', ' ')}
                    </span>
                    {v.isPublished ? (
                      <StatusBadge status="active" label="Publié" />
                    ) : (
                      <StatusBadge status="draft" label="Brouillon" />
                    )}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-neutral-100">{v.name}</div>
                  <div className="text-xs text-neutral-500">{v.city || 'Ville à définir'}</div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Recent reservations */}
          <Card>
            <SectionTitle
              title="Réservations récentes"
              action={
                <Link href="/owner/reservations" className="text-xs font-medium text-amber-400/80 hover:text-amber-400">
                  Tout voir →
                </Link>
              }
            />
            {(data?.recentReservations ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-600">Aucune réservation récente.</p>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {(data?.recentReservations ?? []).slice(0, 6).map((r) => {
                  const rr = r as unknown as Record<string, unknown>;
                  const guest =
                    [rr.guestFirstName, rr.guestLastName].filter(Boolean).join(' ') || 'Client';
                  const when = rr.startAt
                    ? new Date(String(rr.startAt)).toLocaleDateString('fr-FR')
                    : '—';
                  return (
                    <div key={String(rr._id)} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-neutral-200">{guest}</div>
                        <div className="text-xs text-neutral-600">{when}</div>
                      </div>
                      <StatusBadge status={String(rr.status ?? 'pending')} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
