'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, MapPin, Globe2, ArrowUpRight, CheckCircle2, Clock,
  Building2, SlidersHorizontal, Plus, User,
} from 'lucide-react';
import { fetchAdminVenues } from '@/lib/api/admin';
import { getAdminVenueHref } from '@/lib/venueHref';
import { VENUE_CATEGORY_CONFIG, type VenueCategoryKey } from '@/lib/admin/venueCategories';
import { cn } from '@/lib/utils';

type Row = {
  _id: string; name: string; type: string; city?: string; governorate?: string;
  coverImage?: string; isPublished?: boolean; isVedette?: boolean; isFeatured?: boolean;
  hasVirtualTour?: boolean; ownerId?: { fullName?: string; email?: string } | string;
};

function ownerName(o: Row['ownerId']): string | null {
  if (!o) return null;
  if (typeof o === 'object') return o.fullName || o.email || null;
  return null;
}

function VenueCard({ v, accentBg, accentText, CatIcon }: { v: Row; accentBg: string; accentText: string; CatIcon: any }) {
  const owner = ownerName(v.ownerId);
  return (
    <Link href={getAdminVenueHref(v)} className="group block">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-xl hover:shadow-black/40">
        <div className="relative h-40 w-full overflow-hidden bg-zinc-950">
          {v.coverImage ? (
            <Image src={v.coverImage} alt={v.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width:640px) 100vw, 360px" />
          ) : (
            <div className="flex h-full items-center justify-center"><Building2 className="size-9 text-zinc-700" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

          <span className={cn('absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md', accentBg, accentText)}>
            <CatIcon className="size-3" />
          </span>
          <span className={cn('absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md',
            v.isPublished ? 'border border-emerald-500/30 bg-emerald-950/70 text-emerald-300' : 'border border-zinc-600/50 bg-zinc-900/70 text-zinc-400')}>
            {v.isPublished ? <><CheckCircle2 className="size-2.5" /> Publié</> : <><Clock className="size-2.5" /> Brouillon</>}
          </span>
          {v.hasVirtualTour && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-purple-400/40 bg-purple-500/25 px-2 py-0.5 text-[10px] font-bold text-purple-200 backdrop-blur-md"><Globe2 className="size-2.5" /> 360°</span>
          )}
          <h3 className="absolute inset-x-3 bottom-2.5 line-clamp-1 text-[15px] font-bold text-white drop-shadow">{v.name}</h3>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div className="flex items-center gap-1.5 text-[13px] text-zinc-400">
            <MapPin className="size-3.5 shrink-0 text-zinc-600" />
            <span className="truncate">{[v.city, v.governorate].filter(Boolean).join(', ') || '—'}</span>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            {owner ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-amber-200/80"><User className="size-3 shrink-0" /><span className="truncate">{owner}</span></span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">Non assigné</span>
            )}
            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-amber-400 transition-transform group-hover:translate-x-0.5">
              Modifier <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function AdminCategoryVenuesList({ category }: { category: VenueCategoryKey }) {
  const config = VENUE_CATEGORY_CONFIG[category];
  const CatIcon = config.Icon;
  const [search, setSearch] = useState('');

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['admin-venues', category],
    queryFn: () => fetchAdminVenues({ type: category, limit: 200 }),
  });

  const list = (venues as Row[]).filter((v) => {
    // CAFE category also covers lounge variants.
    if (category === 'CAFE') return v.type === 'CAFE' || v.type === 'CAFE_LOUNGE';
    return v.type === category;
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) => [v.name, v.city, v.governorate].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)));
  }, [list, search]);

  const published = list.filter((v) => v.isPublished).length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950 p-5 sm:p-6">
        <div aria-hidden className={cn('pointer-events-none absolute -right-10 -top-10 size-48 rounded-full blur-3xl', config.accentBg)} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10', config.accentBg)}>
              <CatIcon className={cn('size-6', config.accentText)} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">{config.labelPlural}</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {isLoading ? 'Chargement…' : <>{list.length} établissement{list.length !== 1 ? 's' : ''} · {published} publié{published !== 1 ? 's' : ''}</>}
              </p>
            </div>
          </div>
          <Link href="/admin/venues" className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-800">
            <SlidersHorizontal className="size-4" /> Tous les lieux & création
          </Link>
        </div>

        {/* Search */}
        <div className="relative mt-5 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Rechercher un ${config.label.toLowerCase()}…`}
            className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 pl-10 pr-9 text-sm text-zinc-100 outline-none transition focus:border-amber-400/40" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Effacer" className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-zinc-500 hover:bg-white/10 hover:text-white"><X className="size-3.5" /></button>}
        </div>
      </section>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <div className="h-40 animate-pulse bg-zinc-800" />
              <div className="space-y-2 p-4"><div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" /><div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 py-20 text-center">
          <div className={cn('flex size-16 items-center justify-center rounded-2xl border border-white/10', config.accentBg)}><CatIcon className={cn('size-8', config.accentText)} /></div>
          <p className="text-sm font-semibold text-zinc-300">{search ? 'Aucun résultat' : `Aucun ${config.label.toLowerCase()} pour le moment`}</p>
          {!search && (
            <Link href="/admin/venues" className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#c9a227]">
              <Plus className="size-4" /> Créer un établissement
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => <VenueCard key={v._id} v={v} accentBg={config.accentBg} accentText={config.accentText} CatIcon={CatIcon} />)}
        </div>
      )}
    </div>
  );
}
