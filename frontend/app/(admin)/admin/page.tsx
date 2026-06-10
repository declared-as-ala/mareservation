'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  ShieldCheck,
  Hotel,
  Clock3,
  CircleDollarSign,
  Users,
  CalendarDays,
  Sparkles,
  Building2,
  LifeBuoy,
  Settings2,
  Flag,
} from 'lucide-react';
import { DashboardCharts } from './DashboardCharts';

const QUICK_ACTIONS: { title: string; description: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { title: 'Modération', description: 'Avis signalés & qualité du contenu', href: '/admin/moderation', icon: Flag },
  { title: 'Approbation hôtels', description: 'Valider les nouvelles annonces', href: '/admin/hotels-approval', icon: Hotel },
  { title: 'Propriétaires', description: 'Inviter & gérer les owners', href: '/admin/owners', icon: Building2 },
  { title: 'Virements', description: 'Paiements & validation', href: '/admin/payouts', icon: CircleDollarSign },
  { title: 'Utilisateurs', description: 'Comptes & rôles', href: '/admin/users', icon: Users },
  { title: 'Événements', description: 'Programmation & billetterie', href: '/admin/events', icon: CalendarDays },
  { title: 'Support', description: 'Tickets & suivi client', href: '/admin/support', icon: LifeBuoy },
  { title: 'Audit logs', description: 'Traçabilité des actions', href: '/admin/audit-logs', icon: Clock3 },
  { title: 'Paramètres', description: 'Configuration de la plateforme', href: '/admin/settings', icon: Settings2 },
  { title: 'Sécurité', description: 'Accès & conformité', href: '/admin/audit-logs', icon: ShieldCheck },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950 p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
              <Sparkles className="size-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Tableau de bord</h1>
              <p className="mt-1 text-sm text-zinc-400">Vue d&apos;ensemble en temps réel — revenus, réservations, croissance et opérations.</p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Données en direct
          </span>
        </div>
      </section>

      {/* Stats + charts */}
      <DashboardCharts />

      {/* Quick actions */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-bold text-white">Actions & raccourcis</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTIONS.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title + href}
              href={href}
              className="group rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 transition-all hover:-translate-y-0.5 hover:border-amber-400/30 hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-800/60 text-amber-300">
                  <Icon className="size-4" />
                </span>
                <ArrowUpRight className="size-3.5 text-zinc-600 transition-colors group-hover:text-amber-300" />
              </div>
              <p className="mt-2.5 text-[13px] font-semibold text-zinc-200">{title}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
