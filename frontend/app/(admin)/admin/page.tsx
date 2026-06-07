'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminStats, fetchAdminVenuesTotalByType } from '@/lib/api/admin';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  Hotel,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { DashboardCharts } from './DashboardCharts';

type StatTileProps = {
  title: string;
  value: number;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'amber' | 'emerald' | 'blue' | 'violet';
};

const toneStyles: Record<StatTileProps['tone'], string> = {
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  blue: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  violet: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
};

function StatTile({ title, value, subtitle, href, icon: Icon, tone }: StatTileProps) {
  return (
    <Link href={href} className="group block">
      <article className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900">
        <div className="mb-3 flex items-start justify-between">
          <div className={`flex size-10 items-center justify-center rounded-xl border ${toneStyles[tone]}`}>
            <Icon className="size-4" />
          </div>
          <ArrowUpRight className="size-4 text-zinc-600 transition-colors group-hover:text-zinc-300" />
        </div>
        <p className="text-3xl font-black leading-none tracking-tight text-zinc-100 tabular-nums">
          {value.toLocaleString('fr-FR')}
        </p>
        <p className="mt-2 text-sm font-semibold text-zinc-300">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      </article>
    </Link>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4">
      <div className="mb-3 size-10 rounded-xl bg-zinc-800 animate-pulse" />
      <div className="h-8 w-20 rounded bg-zinc-800 animate-pulse" />
      <div className="mt-3 h-4 w-28 rounded bg-zinc-800 animate-pulse" />
      <div className="mt-1 h-3 w-32 rounded bg-zinc-800 animate-pulse" />
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block rounded-xl border border-zinc-800 bg-zinc-900/55 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-200">{title}</p>
        <ArrowUpRight className="size-3.5 text-zinc-600 transition-colors group-hover:text-amber-300" />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{description}</p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
  });
  const { data: coworkingTotal = 0, isLoading: isCoworkingLoading } = useQuery({
    queryKey: ['admin', 'venues-total', 'COWORKING'],
    queryFn: () => fetchAdminVenuesTotalByType('COWORKING'),
  });

  const totalUsers = stats?.totalUsers ?? 0;
  const totalVenues = stats?.totalVenues ?? 0;
  const totalReservations = stats?.totalReservations ?? 0;
  const totalEvents = stats?.totalEvents ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">Tableau de bord</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Pilotage global de la plateforme: opérations, modération et croissance.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <Sparkles className="size-3.5" />
            Centre de commande admin
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading || isCoworkingLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatTile
              title="Utilisateurs"
              value={totalUsers}
              subtitle="Comptes enregistrés"
              href="/admin/users"
              icon={Users}
              tone="amber"
            />
            <StatTile
              title="Lieux"
              value={totalVenues}
              subtitle="Établissements suivis"
              href="/admin/venues"
              icon={MapPin}
              tone="emerald"
            />
            <StatTile
              title="Réservations"
              value={totalReservations}
              subtitle="Toutes catégories"
              href="/admin/reservations"
              icon={CalendarDays}
              tone="blue"
            />
            <StatTile
              title="Événements"
              value={totalEvents}
              subtitle="Programmation active"
              href="/admin/events"
              icon={FileText}
              tone="violet"
            />
            <StatTile
              title="Coworking"
              value={coworkingTotal}
              subtitle="Espaces coworking"
              href="/admin/venues?type=COWORKING"
              icon={BriefcaseBusiness}
              tone="emerald"
            />
          </>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Analyses</h2>
            <span className="text-xs text-zinc-500">30 derniers jours</span>
          </div>
          <DashboardCharts />
        </div>

        <div className="space-y-4">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">Actions prioritaires</h2>
            <div className="grid gap-2">
              <ActionCard
                title="Modération centrale"
                description="Traiter les avis signalés et contrôler la qualité du contenu public."
                href="/admin/moderation"
              />
              <ActionCard
                title="Approbation hôtels"
                description="Valider les nouveaux hôtels, documents et conformité des annonces."
                href="/admin/hotels-approval"
              />
              <ActionCard
                title="Propriétaires & domaines"
                description="Inviter un owner, affecter ses catégories et gérer ses accès."
                href="/admin/owners"
              />
            </div>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">Raccourcis opérationnels</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/payouts" className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs font-semibold text-zinc-300 hover:border-zinc-700">
                <div className="mb-1 flex items-center gap-1.5"><CircleDollarSign className="size-3.5 text-amber-300" /> Virements</div>
                <p className="text-[11px] font-normal text-zinc-500">Paiements et validation</p>
              </Link>
              <Link href="/admin/support" className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs font-semibold text-zinc-300 hover:border-zinc-700">
                <div className="mb-1 flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-amber-300" /> Support</div>
                <p className="text-[11px] font-normal text-zinc-500">Tickets et suivi client</p>
              </Link>
              <Link href="/admin/hotels" className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs font-semibold text-zinc-300 hover:border-zinc-700">
                <div className="mb-1 flex items-center gap-1.5"><Hotel className="size-3.5 text-amber-300" /> Hôtels</div>
                <p className="text-[11px] font-normal text-zinc-500">Inventaire et pages</p>
              </Link>
              <Link href="/admin/audit-logs" className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs font-semibold text-zinc-300 hover:border-zinc-700">
                <div className="mb-1 flex items-center gap-1.5"><Clock3 className="size-3.5 text-amber-300" /> Audit Logs</div>
                <p className="text-[11px] font-normal text-zinc-500">Traçabilité des actions</p>
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
