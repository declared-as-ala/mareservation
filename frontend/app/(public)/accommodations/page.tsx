'use client';

/**
 * Maisons d'hôtes — discovery page: real search (backend), filters kept in the URL, cards synchronised
 * with an interactive map of Tunisia (only real coordinates), list / map toggle, mobile bottom-sheet filters.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BedDouble, Compass, List, Map as MapIcon, MapPin, Minus, Plus, Search, SlidersHorizontal, Users, X, Zap } from 'lucide-react';
import { FEATURES, GOVERNORATES, featureLabel, searchGuesthouses, type SearchResult } from '@/lib/api/bookings';
import { formatMoney } from '@/lib/booking/dates';
import { SearchBar } from '@/components/site/SearchBar';
import { CategoryRail } from '@/components/site/home/HomeSections';

const TunisiaMap = dynamic(() => import('@/components/map/TunisiaMap').then((m) => m.TunisiaMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-[#111112]" aria-hidden="true" />,
});

const SORTS = [
  { value: 'recommended', label: 'Recommandés' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'newest', label: 'Nouveautés' },
];

const FILTER_KEYS = ['q', 'where', 'governorate', 'checkIn', 'checkOut', 'adults', 'children', 'minPrice', 'maxPrice', 'bedrooms', 'features', 'instant', 'tour', 'bbox', 'sort'] as const;
type View = 'split' | 'list' | 'map';

const todayKey = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10); // Africa/Tunis ≈ UTC+1
const addDay = (k: string, n: number) => new Date(Date.parse(`${k}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-neutral-300">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Moins de ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-full border border-white/15 text-white disabled:opacity-30 hover:border-amber-400">
          <Minus className="size-4" />
        </button>
        <span className="w-5 text-center font-semibold tabular-nums text-white" aria-live="polite">{value}</span>
        <button type="button" aria-label={`Plus de ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-full border border-white/15 text-white disabled:opacity-30 hover:border-amber-400">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function PropertyCard({ r, nights, active, onHover }: { r: SearchResult; nights: number; active: boolean; onHover: (id: string | null) => void }) {
  const location = [r.city, r.governorate && r.governorate !== r.city ? r.governorate : null].filter(Boolean).join(', ');
  return (
    <li id={`card-${r.id}`} onMouseEnter={() => onHover(r.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(r.id)} onBlur={() => onHover(null)}>
      <Link
        href={`/accommodation/${r.slug}`}
        className={`group flex h-full flex-col overflow-hidden rounded-[1.35rem] border bg-[#111112] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${active ? 'border-amber-400/70' : 'border-white/10 hover:border-white/25'}`}
      >
        <div className="on-dark relative aspect-[4/3] overflow-hidden bg-[#1a1a1b]">
          {r.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.coverImage} alt={`Photo de ${r.name}`} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
          ) : (
            <div className="grid size-full place-items-center text-neutral-600"><Compass className="size-10" aria-hidden="true" /></div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {r.isDemo && <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-black">Démo</span>}
            {r.hasVirtualTour && <span className="rounded-full bg-black/70 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-amber-300 backdrop-blur">360°</span>}
            {r.instantBooking && <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white backdrop-blur"><Zap className="size-3 text-amber-300" aria-hidden="true" />Instantanée</span>}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {location && <p className="flex items-center gap-1.5 text-xs text-neutral-400"><MapPin className="size-3.5 text-amber-400" aria-hidden="true" />{location}</p>}
          <h3 className="mt-1.5 font-serif text-xl font-medium leading-tight text-white">{r.name}</h3>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
            {r.maxGuests != null && <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{r.maxGuests} voyageurs max.</span>}
            {r.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble className="size-3.5" aria-hidden="true" />{r.bedrooms} chambre{r.bedrooms > 1 ? 's' : ''}</span>}
          </p>
          {r.features.length > 0 && <p className="mt-2 line-clamp-1 text-xs text-neutral-500">{r.features.slice(0, 4).map(featureLabel).join(' · ')}</p>}
          {r.ratingCount > 0 && r.rating != null && <p className="mt-2 text-xs text-neutral-300">★ {r.rating.toFixed(1)} · {r.ratingCount} avis</p>}
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            {r.availability?.total != null ? (
              <p className="text-sm text-neutral-300"><span className="text-lg font-bold text-white">{formatMoney(r.availability.total)}</span> <span className="text-neutral-500">· {nights} nuit{nights > 1 ? 's' : ''}</span></p>
            ) : r.fromPrice != null ? (
              <p className="text-sm text-neutral-400">À partir de <span className="text-lg font-bold text-white">{formatMoney(r.fromPrice)}</span> / nuit</p>
            ) : (
              <p className="text-sm text-neutral-500">Tarifs sur demande</p>
            )}
            {r.availability && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-300">Disponible</span>}
          </div>
        </div>
      </Link>
    </li>
  );
}

function Discovery() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const get = (k: string) => sp.get(k) ?? '';

  const [view, setView] = useState<View>('split');
  const [mobileMap, setMobileMap] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingBbox, setPendingBbox] = useState<string | null>(null);

  // Draft search bar (applied on submit), filters apply immediately.
  const [draft, setDraft] = useState({ q: get('q'), governorate: get('governorate'), checkIn: get('checkIn'), checkOut: get('checkOut'), adults: Number(get('adults')) || 2, children: Number(get('children')) || 0 });
  useEffect(() => {
    setDraft({ q: get('q'), governorate: get('governorate'), checkIn: get('checkIn'), checkOut: get('checkOut'), adults: Number(get('adults')) || 2, children: Number(get('children')) || 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const setParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === '' || v === 0 && k !== 'children') next.delete(k);
        else next.set(k, String(v));
      }
      if (next.get('children') === '0') next.delete('children');
      router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
    },
    [sp, router, pathname]
  );

  const apiParams = useMemo(() => {
    const p = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = sp.get(k);
      if (v) p.set(k, v);
    }
    if ((p.get('checkIn') && !p.get('checkOut')) || (!p.get('checkIn') && p.get('checkOut'))) {
      p.delete('checkIn');
      p.delete('checkOut');
    }
    return p;
  }, [sp]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['guesthouse-search', apiParams.toString()],
    queryFn: () => searchGuesthouses(apiParams),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
  const results = data?.results ?? [];
  const nights = get('checkIn') && get('checkOut') ? Math.max(1, Math.round((Date.parse(get('checkOut')) - Date.parse(get('checkIn'))) / 86400000)) : 0;
  const mapped = results.filter((r) => r.coordinates);
  const markers = useMemo(
    () => mapped.map((r) => ({ id: r.id, lat: r.coordinates!.lat, lng: r.coordinates!.lng, title: r.name, label: r.availability?.total != null ? formatMoney(r.availability.total) : r.fromPrice != null ? formatMoney(r.fromPrice) : r.name.slice(0, 18) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );
  const selectedResult = results.find((r) => r.id === selected) ?? null;
  const features = (get('features') || '').split(',').filter(Boolean);
  const activeFilterCount = ['minPrice', 'maxPrice', 'bedrooms', 'instant', 'tour'].filter((k) => get(k)).length + features.length + (get('bbox') ? 1 : 0);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setParams({ q: draft.q.trim(), governorate: draft.governorate, checkIn: draft.checkIn && draft.checkOut ? draft.checkIn : null, checkOut: draft.checkIn && draft.checkOut ? draft.checkOut : null, adults: draft.adults !== 2 ? draft.adults : null, children: draft.children || null, bbox: null });
    setGuestsOpen(false);
  };
  const toggleFeature = (k: string) => setParams({ features: (features.includes(k) ? features.filter((f) => f !== k) : [...features, k]).join(',') || null });
  const clearAll = () => router.replace(pathname, { scroll: false });

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected) return;
    document.getElementById(`card-${selected}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selected]);

  const minDate = todayKey();
  const inputCls = 'h-12 w-full rounded-xl border border-white/12 bg-[#0B0B0C] px-3.5 text-sm text-white placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none [color-scheme:dark]';

  const filtersBody = (
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Prix par nuit (TND)</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-neutral-400">Minimum
            <input type="number" inputMode="numeric" min={0} defaultValue={get('minPrice')} onBlur={(e) => setParams({ minPrice: e.target.value || null })} className={`${inputCls} mt-1`} placeholder="0" />
          </label>
          <label className="text-xs text-neutral-400">Maximum
            <input type="number" inputMode="numeric" min={0} defaultValue={get('maxPrice')} onBlur={(e) => setParams({ maxPrice: e.target.value || null })} className={`${inputCls} mt-1`} placeholder="—" />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Chambres (minimum)</legend>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => {
            const on = (Number(get('bedrooms')) || 0) === n;
            return (
              <button key={n} type="button" aria-pressed={on} onClick={() => setParams({ bedrooms: n || null })} className={`h-10 min-w-12 rounded-full border px-4 text-sm font-semibold ${on ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/15 text-white hover:border-white/40'}`}>
                {n === 0 ? 'Tous' : `${n}+`}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Équipements</legend>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => {
            const on = features.includes(f.key);
            return (
              <button key={f.key} type="button" aria-pressed={on} onClick={() => toggleFeature(f.key)} className={`h-10 rounded-full border px-4 text-sm ${on ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/15 text-neutral-200 hover:border-white/40'}`}>
                {f.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Expérience</legend>
        {[
          { k: 'instant', label: 'Réservation instantanée', hint: 'Confirmée immédiatement, sans attendre l’hôte' },
          { k: 'tour', label: 'Visite virtuelle 360°', hint: 'Visitez avant de réserver' },
        ].map(({ k, label, hint }) => (
          <label key={k} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3.5 hover:border-white/25">
            <input type="checkbox" checked={!!get(k)} onChange={(e) => setParams({ [k]: e.target.checked ? '1' : null })} className="mt-0.5 size-5 accent-amber-400" />
            <span><span className="block text-sm font-medium text-white">{label}</span><span className="block text-xs text-neutral-500">{hint}</span></span>
          </label>
        ))}
      </fieldset>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      {/* Search summary + categories (HostMe structure) */}
      <header className="border-b border-white/10 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(251,191,36,0.08),transparent)] px-4 pb-2 pt-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-serif text-[clamp(1.8rem,3.4vw,2.6rem)] font-medium leading-[1.05]">
                {get('where') ? `Maisons d’hôtes · ${get('where')}` : 'Maisons d’hôtes en Tunisie'}
              </h1>
              <p className="mt-1 text-sm text-neutral-400">{isLoading ? 'Recherche…' : `${data?.total ?? 0} maison${(data?.total ?? 0) > 1 ? 's' : ''} d’hôtes${nights ? ` · ${nights} nuit${nights > 1 ? 's' : ''}` : ''}`}</p>
            </div>
            <SearchBar key={sp.toString()} variant="compact" initial={{ where: get('where') || get('governorate'), checkIn: get('checkIn'), checkOut: get('checkOut'), adults: Number(get('adults')) || 0, children: Number(get('children')) || 0 }} />
          </div>
          <CategoryRail className="mt-5" activeQuery={(() => { const k = ['features', 'maxPrice', 'tour', 'instant'].find((x) => get(x)); return k ? `${k}=${get(k)}` : undefined; })()} />
        </div>
      </header>

      {/* Toolbar (sticky) */}
      <div className="sticky top-[4.5rem] z-20 border-b border-white/10 bg-[#0B0B0C]/92 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2.5">
          <button type="button" onClick={() => setFiltersOpen(true)} className={`inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold hover:border-amber-400 ${view !== 'map' ? 'xl:hidden' : ''}`}>
            <SlidersHorizontal className="size-4" aria-hidden="true" /> Filtres{activeFilterCount ? <span className="grid size-5 place-items-center rounded-full bg-amber-400 text-[0.7rem] text-black">{activeFilterCount}</span> : null}
          </button>
          <div className="hidden gap-2 lg:flex">
            {FEATURES.slice(0, 5).map((f) => (
              <button key={f.key} type="button" aria-pressed={features.includes(f.key)} onClick={() => toggleFeature(f.key)} className={`h-10 rounded-full border px-4 text-sm ${features.includes(f.key) ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-white/15 text-neutral-300 hover:border-white/40'}`}>{f.label}</button>
            ))}
          </div>
          <p className="ml-auto text-sm text-neutral-400" aria-live="polite">
            {isLoading ? 'Recherche…' : `${data?.total ?? 0} maison${(data?.total ?? 0) > 1 ? 's' : ''}`}
          </p>
          <label className="sr-only" htmlFor="sort">Trier</label>
          <select id="sort" value={get('sort') || 'recommended'} onChange={(e) => setParams({ sort: e.target.value === 'recommended' ? null : e.target.value })} className="h-10 rounded-full border border-white/15 bg-[#0B0B0C] px-4 text-sm text-white [color-scheme:dark]">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div role="group" aria-label="Affichage" className="hidden rounded-full border border-white/15 p-1 lg:flex">
            {([['list', 'Liste', List], ['split', 'Liste + carte', Compass], ['map', 'Carte', MapIcon]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${view === v ? 'bg-white text-black' : 'text-neutral-300 hover:text-white'}`}>
                <Icon className="size-3.5" aria-hidden="true" />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results + map */}
      <main className={`mx-auto max-w-[1600px] ${view === 'split' ? 'md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1.1fr)_minmax(0,1fr)]' : view === 'list' ? 'xl:grid xl:grid-cols-[17rem_minmax(0,1fr)]' : ''}`}>
        {view !== 'map' && (
          <aside aria-label="Filtres" className="hidden border-e border-white/10 px-6 py-6 xl:block">
            <div className="sticky top-[9rem] max-h-[calc(100dvh-10rem)] overflow-y-auto pe-1 [scrollbar-width:thin]">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-serif text-xl">Filtres</h2>
                {activeFilterCount > 0 && <button type="button" onClick={() => setParams({ minPrice: null, maxPrice: null, bedrooms: null, features: null, instant: null, tour: null, bbox: null })} className="text-xs text-amber-300 underline">Effacer</button>}
              </div>
              {filtersBody}
            </div>
          </aside>
        )}
        <section ref={listRef} aria-label="Résultats" className={`px-4 py-6 sm:px-6 lg:px-10 ${view === 'map' ? 'md:hidden' : ''} ${mobileMap ? 'hidden md:block' : ''}`}>
          {isError && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">{(error as Error)?.message || 'La recherche a échoué.'}</p>}
          {!isLoading && !isError && results.length === 0 && (
            <div className="rounded-[1.5rem] border border-white/10 bg-[#111112] p-10 text-center">
              <p className="font-serif text-2xl">Aucune maison ne correspond.</p>
              <p className="mt-2 text-sm text-neutral-400">Élargissez les dates, la zone ou retirez un filtre.</p>
              <button type="button" onClick={clearAll} className="mt-6 h-11 rounded-full border border-white/20 px-6 text-sm font-semibold hover:border-amber-400">Réinitialiser la recherche</button>
            </div>
          )}
          {get('where') && (
            <button type="button" onClick={() => setParams({ where: null })} className="mb-4 me-2 inline-flex h-9 items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 text-xs font-semibold text-amber-200">
              {get('where')} <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          {get('bbox') && (
            <button type="button" onClick={() => setParams({ bbox: null })} className="mb-4 inline-flex h-9 items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 text-xs font-semibold text-amber-200">
              Zone de la carte <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <ul className={`grid gap-5 ${view === 'list' ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'sm:grid-cols-2'}`}>
            {isLoading && !data && Array.from({ length: 4 }, (_, i) => <li key={i} className="h-[22rem] animate-pulse rounded-[1.35rem] bg-[#111112]" />)}
            {results.map((r) => (
              <PropertyCard key={r.id} r={r} nights={nights} active={hovered === r.id || selected === r.id} onHover={setHovered} />
            ))}
          </ul>
          {results.length > 0 && mapped.length < results.length && (
            <p className="mt-6 text-xs text-neutral-500">{results.length - mapped.length} maison{results.length - mapped.length > 1 ? 's' : ''} sans position GPS vérifiée n’apparai{results.length - mapped.length > 1 ? 'ssent' : 't'} pas sur la carte.</p>
          )}
        </section>

        <section aria-label="Carte des maisons d’hôtes" className={`${view === 'list' ? 'md:hidden' : ''} ${mobileMap ? 'block' : 'hidden md:block'}`}>
          <div className={`relative ${view === 'map' ? 'h-[calc(100dvh-12.5rem)]' : 'h-[calc(100dvh-8.5rem)] md:sticky md:top-[8.4rem]'}`}>
            <TunisiaMap
              className="size-full"
              markers={markers}
              highlightedId={hovered}
              selectedId={selected}
              onSelect={setSelected}
              onBoundsChange={(bbox) => setPendingBbox(bbox)}
            />
            {pendingBbox && pendingBbox !== get('bbox') && (
              <button type="button" onClick={() => { setParams({ bbox: pendingBbox }); setPendingBbox(null); }} className="absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-xl">
                Rechercher dans cette zone
              </button>
            )}
            {!isLoading && markers.length === 0 && (
              <p className="pointer-events-none absolute inset-x-4 bottom-6 z-[500] rounded-2xl bg-black/75 p-4 text-center text-sm text-neutral-300">Aucune maison de cette sélection n’a encore de position GPS vérifiée.</p>
            )}
            {selectedResult && (
              <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[600] md:bottom-4 md:left-4 md:right-auto md:w-80">
                <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#111112] shadow-2xl">
                  <button type="button" aria-label="Fermer l’aperçu" onClick={() => setSelected(null)} className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/70 text-white"><X className="size-4" /></button>
                  <Link href={`/accommodation/${selectedResult.slug}`} className="flex gap-3 p-3">
                    {selectedResult.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedResult.coverImage} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-lg text-white">{selectedResult.name}</span>
                      <span className="block text-xs text-neutral-400">{[selectedResult.city, selectedResult.governorate].filter(Boolean).join(', ')}</span>
                      <span className="mt-1 block text-sm font-semibold text-amber-300">{selectedResult.availability?.total != null ? `${formatMoney(selectedResult.availability.total)} · ${nights} nuit(s)` : selectedResult.fromPrice != null ? `Dès ${formatMoney(selectedResult.fromPrice)} / nuit` : 'Voir la maison'}</span>
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Mobile floating list/map switch */}
      <button
        type="button"
        onClick={() => { setMobileMap((m) => !m); setSelected(null); }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] left-1/2 z-40 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black shadow-2xl md:hidden"
      >
        {mobileMap ? <><List className="size-4" aria-hidden="true" /> Liste</> : <><MapIcon className="size-4" aria-hidden="true" /> Carte</>}
      </button>

      {/* Filters: right panel on desktop, bottom sheet on mobile */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="filters-title">
          <button type="button" aria-label="Fermer les filtres" className="absolute inset-0 bg-black/70" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[1.6rem] border border-white/10 bg-[#111112] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[26rem] md:rounded-none md:rounded-l-[1.6rem] md:p-7">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 md:hidden" aria-hidden="true" />
            <div className="mb-6 flex items-center justify-between">
              <h2 id="filters-title" className="font-serif text-2xl">Filtres</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fermer" className="grid size-10 place-items-center rounded-full border border-white/15"><X className="size-4" /></button>
            </div>
            {filtersBody}
            <div className="sticky bottom-0 mt-8 flex gap-3 bg-[#111112] pt-3">
              <button type="button" onClick={() => { setParams({ minPrice: null, maxPrice: null, bedrooms: null, features: null, instant: null, tour: null, bbox: null }); }} className="h-12 flex-1 rounded-xl border border-white/15 text-sm font-semibold">Effacer</button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="h-12 flex-[2] rounded-xl bg-amber-400 text-sm font-bold text-black">Voir {data?.total ?? 0} résultat{(data?.total ?? 0) > 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccommodationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0B0C]" />}>
      <Discovery />
    </Suspense>
  );
}
