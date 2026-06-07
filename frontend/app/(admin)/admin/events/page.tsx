'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { fetchAdminEvents } from '@/lib/api/admin';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getEventAvailability } from '@/lib/events/availability';
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  MapPin,
  Search,
  Ticket,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  CircleDot,
} from 'lucide-react';

type TicketType = { name?: string; price?: number; capacity?: number; sold?: number; isActive?: boolean };
type AdminEventRow = {
  _id: string;
  title: string;
  type: string;
  startAt: string;
  endsAt?: string;
  coverImage?: string;
  afficheImageUrl?: string;
  isPublished?: boolean;
  ticketTypes?: TicketType[];
  venueId?: { name?: string; _id?: string } | string;
};

/* ── Type grouping (matches the sidebar's ?type= links) ── */
function typeGroup(raw: string): string {
  const t = (raw || '').toLowerCase();
  if (['sport', 'sports', 'match'].includes(t)) return 'SPORT';
  if (['concert', 'dj', 'chanteur'].includes(t)) return 'CONCERT';
  if (['festival'].includes(t)) return 'FESTIVAL';
  if (['soiree'].includes(t)) return 'SOIREE';
  if (['standup'].includes(t)) return 'STANDUP';
  if (['cinema', 'cinema_session'].includes(t)) return 'CINEMA';
  return 'AUTRE';
}

const GROUP_LABEL: Record<string, string> = {
  CONCERT: 'Concerts',
  FESTIVAL: 'Festivals',
  SPORT: 'Sport',
  SOIREE: 'Soirées',
  STANDUP: 'Stand-up',
  CINEMA: 'Cinéma',
  AUTRE: 'Autres',
};
const GROUP_ORDER = ['CONCERT', 'FESTIVAL', 'SPORT', 'SOIREE', 'STANDUP', 'CINEMA', 'AUTRE'];

/* ── Per-type badge styling ── */
const TYPE_META: Record<string, { label: string; chip: string; dot: string; glow: string }> = {
  CONCERT: { label: 'Concert', chip: 'border-purple-500/25 bg-purple-500/10 text-purple-300', dot: 'bg-purple-400', glow: 'from-purple-500/25' },
  FESTIVAL: { label: 'Festival', chip: 'border-amber-500/25 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400', glow: 'from-amber-500/25' },
  SPORT: { label: 'Sport', chip: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400', glow: 'from-emerald-500/25' },
  SOIREE: { label: 'Soirée', chip: 'border-pink-500/25 bg-pink-500/10 text-pink-300', dot: 'bg-pink-400', glow: 'from-pink-500/25' },
  STANDUP: { label: 'Stand-up', chip: 'border-orange-500/25 bg-orange-500/10 text-orange-300', dot: 'bg-orange-400', glow: 'from-orange-500/25' },
  CINEMA: { label: 'Cinéma', chip: 'border-blue-500/25 bg-blue-500/10 text-blue-300', dot: 'bg-blue-400', glow: 'from-blue-500/25' },
  AUTRE: { label: 'Événement', chip: 'border-zinc-600/40 bg-zinc-700/20 text-zinc-300', dot: 'bg-zinc-400', glow: 'from-zinc-500/20' },
};

/* ── Date helpers ── */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function relativeLabel(startAt: string): { text: string; tone: 'soon' | 'upcoming' | 'past' } {
  const now = new Date();
  const date = new Date(startAt);
  const diffDays = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (diffDays < 0) return { text: 'Passé', tone: 'past' };
  if (diffDays === 0) return { text: "Aujourd'hui", tone: 'soon' };
  if (diffDays === 1) return { text: 'Demain', tone: 'soon' };
  if (diffDays <= 7) return { text: `Dans ${diffDays} jours`, tone: 'soon' };
  return { text: `Dans ${diffDays} jours`, tone: 'upcoming' };
}
function formatDate(startAt: string) {
  return new Date(startAt).toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function venueName(v: AdminEventRow['venueId']): string | null {
  if (v && typeof v === 'object') return v.name ?? null;
  return null;
}
function minTicketPrice(tickets?: TicketType[]): number | null {
  const prices = (tickets ?? []).map((t) => t.price ?? 0).filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
}

/* ── Stat tile ── */
function StatTile({ icon: Icon, label, value, accent }: { icon: typeof Calendar; label: string; value: number; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className={cn('absolute -right-6 -top-6 size-20 rounded-full blur-2xl', accent)} />
      <div className="relative flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800/60">
          <Icon className="size-4 text-zinc-300" />
        </div>
        <div>
          <div className="text-xl font-bold leading-none text-white">{value}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Event card ── */
function EventCard({ e, index }: { e: AdminEventRow; index: number }) {
  const group = typeGroup(e.type);
  const meta = TYPE_META[group] ?? TYPE_META.AUTRE;
  const rel = relativeLabel(e.startAt);
  const cover = e.afficheImageUrl || e.coverImage || null;
  const vName = venueName(e.venueId);
  const price = minTicketPrice(e.ticketTypes);
  const avail = getEventAvailability(e.ticketTypes);
  const published = e.isPublished !== false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/admin/events/${e._id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition-all duration-300 hover:border-amber-400/30 hover:shadow-xl hover:shadow-amber-400/5"
      >
        {/* Cover */}
        <div className="relative h-36 w-full overflow-hidden bg-zinc-950">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={e.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br to-transparent', meta.glow)}>
              <Calendar className="size-10 text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

          {/* Type badge */}
          <span className={cn('absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} />
            {meta.label}
          </span>

          {/* Relative date */}
          <span
            className={cn(
              'absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md',
              rel.tone === 'soon'
                ? 'border-emerald-500/30 bg-emerald-950/70 text-emerald-300'
                : rel.tone === 'past'
                ? 'border-zinc-700/60 bg-zinc-900/70 text-zinc-500'
                : 'border-zinc-600/40 bg-zinc-900/70 text-zinc-300'
            )}
          >
            <CalendarClock className="size-3" />
            {rel.text}
          </span>

          {/* Title over cover */}
          <h3 className="absolute inset-x-3 bottom-2.5 line-clamp-2 text-[15px] font-bold leading-tight text-white drop-shadow">
            {e.title}
          </h3>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div className="flex items-center gap-1.5 text-[13px] text-zinc-400">
            <CalendarDays className="size-3.5 shrink-0 text-zinc-600" />
            <span className="truncate capitalize">{formatDate(e.startAt)}</span>
          </div>
          {vName && (
            <div className="flex items-center gap-1.5 text-[13px] text-zinc-400">
              <MapPin className="size-3.5 shrink-0 text-zinc-600" />
              <span className="truncate">{vName}</span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {avail.isSoldOut ? (
                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-red-400">
                  SOLD OUT
                </span>
              ) : price !== null ? (
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-amber-300">
                  <Ticket className="size-3.5" />
                  {price} DT
                </span>
              ) : (
                <span className="text-[12px] text-zinc-600">Entrée libre</span>
              )}
              {!avail.isSoldOut && avail.remaining > 0 && avail.remaining <= 20 && (
                <span className="text-[10px] text-zinc-500">{avail.remaining} restants</span>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700/30 text-zinc-500'
                )}
              >
                <CircleDot className="size-2.5" />
                {published ? 'Publié' : 'Brouillon'}
              </span>
            </div>
            <span className="inline-flex size-7 items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-800/40 text-zinc-400 transition-all group-hover:border-amber-400/40 group-hover:bg-amber-400/10 group-hover:text-amber-300">
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function AdminEventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = searchParams.get('type'); // canonical group e.g. SPORT
  const [search, setSearch] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: fetchAdminEvents,
  });
  const all = events as AdminEventRow[];

  // Distinct groups present in the data → drives the filter pills.
  const presentGroups = useMemo(() => {
    const set = new Set(all.map((e) => typeGroup(e.type)));
    return GROUP_ORDER.filter((g) => set.has(g));
  }, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((e) => (activeType ? typeGroup(e.type) === activeType.toUpperCase() : true))
      .filter((e) => {
        if (!q) return true;
        const vn = venueName(e.venueId) ?? '';
        return e.title.toLowerCase().includes(q) || vn.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [all, activeType, search]);

  // Stats (across all events, not filtered).
  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    return {
      total: all.length,
      upcoming: all.filter((e) => new Date(e.startAt) >= now).length,
      thisMonth: all.filter((e) => {
        const d = new Date(e.startAt);
        return `${d.getFullYear()}-${d.getMonth()}` === monthKey;
      }).length,
      published: all.filter((e) => e.isPublished !== false).length,
    };
  }, [all]);

  function setType(group: string | null) {
    router.push(group ? `/admin/events?type=${group}` : '/admin/events');
  }

  const activeLabel = activeType ? GROUP_LABEL[activeType.toUpperCase()] ?? activeType : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950 p-6 sm:p-7">
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
              <Sparkles className="size-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Événements</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {activeLabel ? (
                  <>
                    Filtré sur <span className="font-semibold text-amber-300">{activeLabel}</span> ·{' '}
                    {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>Gérez concerts, festivals, sport et soirées</>
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/venues"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-800"
          >
            <MapPin className="size-4" />
            Voir les lieux
          </Link>
        </div>

        {/* Stats */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={Calendar} label="Total" value={stats.total} accent="bg-zinc-500/20" />
          <StatTile icon={TrendingUp} label="À venir" value={stats.upcoming} accent="bg-emerald-500/20" />
          <StatTile icon={CalendarDays} label="Ce mois-ci" value={stats.thisMonth} accent="bg-amber-500/20" />
          <StatTile icon={CircleDot} label="Publiés" value={stats.published} accent="bg-purple-500/20" />
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Type pills */}
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setType(null)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all',
              !activeType
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            )}
          >
            Tous
            <span className="rounded-full bg-zinc-800/80 px-1.5 text-[10px] font-bold text-zinc-400">{all.length}</span>
          </button>
          {presentGroups.map((g) => {
            const count = all.filter((e) => typeGroup(e.type) === g).length;
            const isActive = activeType?.toUpperCase() === g;
            const meta = TYPE_META[g] ?? TYPE_META.AUTRE;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setType(g)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all',
                  isActive
                    ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                )}
              >
                <span className={cn('size-1.5 rounded-full', meta.dot)} />
                {GROUP_LABEL[g]}
                <span className="rounded-full bg-zinc-800/80 px-1.5 text-[10px] font-bold text-zinc-400">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative shrink-0 sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Rechercher un événement…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-amber-400/40"
          />
        </div>
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <Skeleton className="h-36 w-full bg-zinc-800" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                <Skeleton className="h-3 w-1/2 bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <Calendar className="size-8 text-zinc-600" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-300">
            {search || activeType ? 'Aucun événement ne correspond' : 'Aucun événement'}
          </p>
          <p className="mt-1 max-w-xs text-xs text-zinc-500">
            {search || activeType
              ? 'Essayez de modifier votre recherche ou de réinitialiser le filtre.'
              : 'Les événements créés apparaîtront ici.'}
          </p>
          {(search || activeType) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setType(null);
              }}
              className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Réinitialiser
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((e, i) => (
            <EventCard key={e._id} e={e} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
