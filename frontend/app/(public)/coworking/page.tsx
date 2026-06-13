'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Armchair, BriefcaseBusiness, ChevronDown, Clock3, Compass,
  DoorClosed, MapPin, Presentation, Search, ShieldCheck, Sparkles, Video, Wifi, X,
} from 'lucide-react';
import { fetchVenues } from '@/lib/api/venues';
import { VenueCard } from '@/components/cards/VenueCard';
import { cn } from '@/lib/utils';

const WORKSPACE_TYPES = [
  { value: 'all', label: 'Tous les espaces', Icon: BriefcaseBusiness, keywords: [] },
  { value: 'desk', label: 'Open space', Icon: Armchair, keywords: ['open space', 'coworking', 'hot desk', 'bureau partagé'] },
  { value: 'office', label: 'Bureau privé', Icon: DoorClosed, keywords: ['bureau privé', 'private office', 'bureau fermé'] },
  { value: 'meeting', label: 'Salle de réunion', Icon: Presentation, keywords: ['réunion', 'meeting', 'conférence', 'formation'] },
];

const BENEFITS = [
  { Icon: Clock3, title: 'Flexible', text: 'À l’heure, demi-journée ou journée' },
  { Icon: Wifi, title: 'Prêt à travailler', text: 'Wi-Fi, confort et services inclus' },
  { Icon: ShieldCheck, title: 'Réservation simple', text: 'Choisissez votre espace en quelques clics' },
];

export default function CoworkingPage() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');
  const [workspaceType, setWorkspaceType] = useState('all');
  const [only360, setOnly360] = useState(false);

  const { data: venues = [], isLoading, error, refetch } = useQuery({
    queryKey: ['business-coworking'],
    queryFn: () => fetchVenues({ type: 'COWORKING' }),
    staleTime: 5 * 60 * 1000,
  });

  const cities = useMemo(
    () => Array.from(new Set(venues.map((venue) => venue.city).filter(Boolean))).sort(),
    [venues]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selected = WORKSPACE_TYPES.find((item) => item.value === workspaceType);
    return venues.filter((venue) => {
      const haystack = [
        venue.name, venue.city, venue.governorate, venue.address,
        venue.description, venue.shortDescription, ...(venue.amenities ?? []),
      ].filter(Boolean).join(' ').toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (city !== 'all' && venue.city !== city) return false;
      if (only360 && !venue.hasVirtualTour) return false;
      if (selected && selected.keywords.length > 0 && !selected.keywords.some((keyword) => haystack.includes(keyword))) return false;
      return true;
    });
  }, [venues, search, city, workspaceType, only360]);

  const hasFilters = search.trim() !== '' || city !== 'all' || workspaceType !== 'all' || only360;

  function clearFilters() {
    setSearch('');
    setCity('all');
    setWorkspaceType('all');
    setOnly360(false);
  }

  return (
    <div className="min-h-screen bg-[#090909] pb-12 text-white">
      <section className="relative overflow-hidden border-b border-white/[0.06] bg-[#0d0d0e] px-4 pb-9 pt-6 sm:px-6 sm:pb-12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 size-[420px] rounded-full bg-amber-500/[0.10] blur-[130px]" />
        <div aria-hidden className="pointer-events-none absolute -left-36 bottom-0 size-80 rounded-full bg-blue-500/[0.05] blur-[120px]" />
        <div className="relative mx-auto max-w-7xl">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/70 transition hover:border-amber-400/40 hover:text-amber-300">
            <ArrowLeft className="size-4" /> Retour
          </Link>

          <div className="mt-8 grid gap-7 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                <BriefcaseBusiness className="size-3.5" /> Business & Coworking
              </span>
              <h1 className="mt-4 max-w-3xl font-serif text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Le bon espace pour <span className="text-amber-400">faire avancer vos idées.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
                Réservez un poste flexible, un bureau privé ou une salle de réunion adaptée à votre journée de travail.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BENEFITS.map(({ Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <Icon className="size-4 text-amber-400" />
                  <p className="mt-2 text-xs font-bold text-white">{title}</p>
                  <p className="mt-1 hidden text-[10px] leading-snug text-white/40 sm:block">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/[0.08] bg-black/30 p-2 backdrop-blur-xl">
            <div className="grid gap-2 md:grid-cols-[1fr_230px_auto]">
              <div className="flex h-12 items-center gap-3 rounded-2xl bg-white/[0.04] px-4">
                <Search className="size-4 text-white/35" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, quartier ou besoin professionnel..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Effacer"><X className="size-4 text-white/40" /></button>}
              </div>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                <select value={city} onChange={(event) => setCity(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border-0 bg-white/[0.04] pl-11 pr-10 text-sm text-white outline-none [color-scheme:dark]">
                  <option value="all">Toutes les villes</option>
                  {cities.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              </div>
              <button type="button" onClick={() => setOnly360((value) => !value)} className={cn('flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold transition-all', only360 ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white')}>
                <Video className="size-4" /> Visite 360°
              </button>
            </div>
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {WORKSPACE_TYPES.map(({ value, label, Icon }) => (
              <button key={value} type="button" onClick={() => setWorkspaceType(value)} className={cn('flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all', workspaceType === value ? 'border-amber-400/60 bg-amber-400/[0.12] text-amber-300' : 'border-white/[0.08] bg-[#131313] text-white/50 hover:text-white')}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Espaces disponibles</p>
            <h2 className="mt-1 font-serif text-2xl font-bold">Travaillez à votre façon</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/40">{filtered.length} espace{filtered.length !== 1 ? 's' : ''}</span>
            {hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-semibold text-amber-400 hover:underline">Réinitialiser</button>}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-3xl bg-white/[0.04]" />)}</div>
        ) : error ? (
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] py-16 text-center">
            <p className="text-white/50">Impossible de charger les espaces business.</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-bold text-amber-400">Réessayer</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/[0.10] py-16 text-center">
            <Compass className="size-11 text-white/20" />
            <h3 className="mt-4 font-semibold text-white/70">Aucun espace ne correspond</h3>
            <p className="mt-1 text-sm text-white/35">Essayez une autre ville ou un autre type d’espace.</p>
            <button type="button" onClick={clearFilters} className="mt-4 text-sm font-bold text-amber-400">Voir tous les espaces</button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((venue) => <VenueCard key={venue._id} venue={venue} />)}
          </div>
        )}

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-3xl border border-amber-400/20 bg-gradient-to-r from-amber-400/[0.10] to-transparent p-6 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-amber-300"><Sparkles className="size-4" /> Besoin d’un espace sur mesure ?</p>
            <p className="mt-1 text-sm text-white/45">Réunion client, atelier d’équipe ou journée de travail complète.</p>
          </div>
          <Link href="/sos-conseil" className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300">Demander conseil</Link>
        </div>
      </section>
    </div>
  );
}
