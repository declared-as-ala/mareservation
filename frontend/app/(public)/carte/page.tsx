'use client';

/**
 * /carte — full-screen map of Tunisia's guesthouses.
 * No API key: Leaflet + OpenStreetMap tiles (attribution shown on the map).
 * Only real coordinates stored on each listing are plotted; nothing is geocoded or invented.
 */
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, X } from 'lucide-react';
import { GOVERNORATES, searchGuesthouses } from '@/lib/api/bookings';
import { formatMoney } from '@/lib/booking/dates';

const TunisiaMap = dynamic(() => import('@/components/map/TunisiaMap').then((m) => m.TunisiaMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-[#111112]" aria-hidden="true" />,
});

export default function MapPage() {
  const [governorate, setGovernorate] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['carte', governorate],
    queryFn: () => searchGuesthouses(new URLSearchParams(governorate ? { governorate } : {})),
  });
  const results = data?.results ?? [];
  const mapped = results.filter((r) => r.coordinates);
  const markers = useMemo(
    () => mapped.map((r) => ({ id: r.id, lat: r.coordinates!.lat, lng: r.coordinates!.lng, title: r.name, label: r.fromPrice != null ? formatMoney(r.fromPrice) : r.name.slice(0, 18) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );
  const sel = results.find((r) => r.id === selected);

  return (
    <div className="relative h-[calc(100dvh-4rem)] min-h-[520px] bg-[#0B0B0C] text-white">
      <TunisiaMap className="size-full" markers={markers} selectedId={selected} onSelect={setSelected} ariaLabel="Carte des maisons d’hôtes en Tunisie" />

      <div className="absolute left-3 right-3 top-3 z-[500] flex flex-wrap items-center gap-2 sm:left-4 sm:right-auto">
        <div className="rounded-2xl border border-white/10 bg-[#111112]/95 px-4 py-3 shadow-xl backdrop-blur">
          <h1 className="flex items-center gap-2 font-serif text-xl"><MapPin className="size-5 text-amber-400" aria-hidden="true" /> Carte des maisons d’hôtes</h1>
          <p className="text-xs text-neutral-400" aria-live="polite">
            {isLoading ? 'Chargement…' : `${mapped.length} sur la carte${results.length > mapped.length ? ` · ${results.length - mapped.length} sans position GPS vérifiée` : ''}`}
          </p>
        </div>
        <label className="sr-only" htmlFor="gov">Gouvernorat</label>
        <select id="gov" value={governorate} onChange={(e) => { setGovernorate(e.target.value); setSelected(null); }} className="h-12 rounded-2xl border border-white/10 bg-[#111112]/95 px-4 text-sm text-white shadow-xl [color-scheme:dark]">
          <option value="">Toute la Tunisie</option>
          {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <Link href="/maisons-d-hotes" className="inline-flex h-12 items-center rounded-2xl bg-amber-400 px-4 text-sm font-bold text-black shadow-xl">Liste + filtres</Link>
      </div>

      {sel && (
        <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[600] sm:left-4 sm:right-auto sm:w-96">
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#111112] shadow-2xl">
            <button type="button" aria-label="Fermer" onClick={() => setSelected(null)} className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/70"><X className="size-4" /></button>
            <Link href={`/maison-d-hote/${sel.slug}`} className="flex gap-3 p-3">
              {sel.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sel.coverImage} alt="" className="size-24 shrink-0 rounded-xl object-cover" />
              )}
              <span className="min-w-0">
                <span className="block truncate font-serif text-lg">{sel.name}</span>
                <span className="block text-xs text-neutral-400">{[sel.city, sel.governorate].filter(Boolean).join(', ')}{sel.isDemo ? ' · Démo' : ''}</span>
                {sel.fromPrice != null && <span className="mt-1 block text-sm font-semibold text-amber-300">Dès {formatMoney(sel.fromPrice)} / nuit</span>}
                <span className="mt-1 block text-xs text-amber-200 underline">Voir la maison{sel.hasVirtualTour ? ' et la visite 360°' : ''}</span>
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
