'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  MapPin,
  Phone,
  Users,
  Clock,
  Info,
  ArrowLeft,
  Minus,
  Plus,
  Sparkles,
  Popcorn,
  Armchair,
  ScanEye,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { CinematicVenueHero } from '@/components/venue/CinematicVenueHero';
import { HotelAmenitiesGrid } from '@/components/hotel/HotelAmenities';
import { VenueMap } from '@/components/venue/VenueMap';
import { SimilarVenues } from '@/components/venue/SimilarVenues';

const PanoramaEngine = dynamic(() => import('@/components/immersive/PanoramaEngine'), { ssr: false });
const MatterportClientViewer = dynamic(
  () => import('@/components/immersive/MatterportClientViewer'),
  { ssr: false }
);

function getAllImages(venue: Venue): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (u?: string | null) => {
    if (u && !seen.has(u)) { seen.add(u); out.push(u); }
  };
  add(venue.coverImage);
  venue.gallery?.forEach(add);
  venue.media?.filter((m) => m.kind !== 'HERO_IMAGE').forEach((m) => add(m.url));
  return out;
}

function Stepper({
  value,
  onChange,
  min = 1,
  max = 12,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Réduire"
        className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-neutral-100">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Augmenter"
        className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export default function CinemaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'salle' | 'infos'>('overview');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('20:00');
  const [seats, setSeats] = useState(2);

  const { data: venue, isLoading, error } = useQuery({
    queryKey: ['cinema', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
  });

  const allImages = useMemo(() => (venue ? getAllImages(venue) : []), [venue]);

  const hasImmersive =
    venue?.immersiveType &&
    venue.immersiveType !== 'none' &&
    ((venue.immersiveSourceType === 'url' && venue.immersiveUrl) ||
      (venue.immersiveSourceType === 'upload' && venue.immersiveFile));

  function goToSalle() {
    setActiveTab('salle');
    setTimeout(() => {
      document.getElementById('salle-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808]">
        <div className="h-[68vh] min-h-[460px] animate-pulse bg-white/[0.04]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="h-8 w-2/3 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-32 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808]">
        <div className="space-y-4 text-center">
          <Film className="mx-auto size-14 text-neutral-700" />
          <h2 className="text-xl font-semibold text-neutral-300">Salle introuvable</h2>
          <p className="text-neutral-600">Cette salle de cinéma n&apos;existe pas ou a été déplacée.</p>
          <Link href="/cinema" className="inline-flex items-center gap-2 text-amber-400 hover:underline">
            <ArrowLeft className="size-4" />
            Voir toutes les salles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">

      {/* ── Cinematic hero ── */}
      <CinematicVenueHero
        name={venue.name}
        images={allImages}
        venueId={venue._id}
        city={venue.city}
        address={venue.address}
        isVedette={venue.isVedette}
        hasVirtualTour={!!hasImmersive}
        categoryBadge={{ icon: Film, label: 'Salle de Cinéma' }}
        onBack={() => router.back()}
      />

      {/* ── Two-column layout ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:py-10">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">

          {/* ── Left ── */}
          <div className="space-y-8 lg:col-span-2">

            {/* Highlights */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: ScanEye, label: 'Sélection de siège en 360°' },
                { icon: Armchair, label: 'Fauteuils premium' },
                { icon: Popcorn, label: 'Snacks & boissons' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center"
                >
                  <Icon className="size-5 text-amber-400" />
                  <div className="text-[11px] leading-tight text-neutral-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.07] px-4">
              {(
                [
                  { id: 'overview', label: 'Aperçu' },
                  { id: 'salle', label: 'La salle' },
                  { id: 'infos', label: 'Infos pratiques' },
                ] as { id: string; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'relative whitespace-nowrap px-3 pb-3 pt-1 text-sm font-medium transition-all',
                    activeTab === tab.id ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.span
                      layoutId="cinema-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-amber-400"
                    />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Aperçu */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-7"
                >
                  {venue.description && (
                    <div>
                      <h2 className="mb-3 text-lg font-semibold text-neutral-200">À propos de la salle</h2>
                      <p className="whitespace-pre-wrap leading-relaxed text-neutral-400">{venue.description}</p>
                    </div>
                  )}

                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-neutral-200">Équipements &amp; Services</h2>
                    <HotelAmenitiesGrid
                      amenities={
                        venue.amenities && venue.amenities.length > 0
                          ? venue.amenities
                          : [
                              'Écran grand format',
                              'Son Dolby Atmos',
                              'Fauteuils inclinables',
                              'Climatisation',
                              'Snacks & boissons',
                              'Accès PMR',
                              'Parking',
                              'Réservation en ligne',
                            ]
                      }
                    />
                  </div>

                  {(venue.address || venue.city) && (
                    <div>
                      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-200">
                        <MapPin className="size-4 text-amber-400" />
                        Localisation
                      </h2>
                      <VenueMap
                        address={venue.address ?? ''}
                        city={venue.city ?? ''}
                        coordinates={venue.coordinates}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {/* La salle — immersive */}
              {activeTab === 'salle' && (
                <motion.div
                  id="salle-section"
                  key="salle"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="mb-1 text-lg font-semibold text-neutral-200">Découvrez la salle</h2>
                    <p className="text-sm text-neutral-500">
                      {hasImmersive
                        ? 'Explorez la salle en 360° et repérez les meilleures places avant de réserver.'
                        : 'Visualisez la salle et choisissez vos places.'}
                    </p>
                  </div>

                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
                    {hasImmersive && venue.immersiveProvider === 'matterport' && venue.immersiveUrl ? (
                      <MatterportClientViewer
                        embedUrl={venue.immersiveUrl}
                        placements={[]}
                        onTableSelect={() => undefined}
                      />
                    ) : hasImmersive && venue.immersiveSourceType === 'upload' && venue.immersiveFile ? (
                      <PanoramaEngine
                        imageUrl={venue.immersiveFile}
                        markers={[]}
                        selectedMarkerId={null}
                        mode="navigate"
                        scenes={[]}
                        activeSceneId={null}
                        onSceneChange={() => undefined}
                        onMarkerClick={() => undefined}
                      />
                    ) : hasImmersive && venue.immersiveUrl ? (
                      <iframe src={venue.immersiveUrl} title="Visite de la salle" className="h-full w-full" allowFullScreen />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <Video className="size-10 text-neutral-700" />
                        <p className="max-w-xs text-sm text-neutral-500">
                          La visite immersive de cette salle sera bientôt disponible.
                        </p>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/cinema/${venue.slug || venue._id}`}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5 hover:shadow-amber-400/40"
                  >
                    <ScanEye className="size-4" />
                    Choisir mes places dans la salle
                  </Link>
                </motion.div>
              )}

              {/* Infos */}
              {activeTab === 'infos' && (
                <motion.div
                  key="infos"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <dl className="space-y-4 text-sm">
                    {venue.address && (
                      <div>
                        <dt className="mb-1 flex items-center gap-2 font-medium text-neutral-300">
                          <MapPin className="size-4 text-amber-400" /> Adresse
                        </dt>
                        <dd className="pl-6 text-neutral-500">{venue.address}, {venue.city}</dd>
                      </div>
                    )}
                    {venue.phone && (
                      <div>
                        <dt className="mb-1 flex items-center gap-2 font-medium text-neutral-300">
                          <Phone className="size-4 text-amber-400" /> Téléphone
                        </dt>
                        <dd className="pl-6">
                          <a href={`tel:${venue.phone}`} className="text-amber-400 hover:underline">
                            {venue.phone}
                          </a>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="mb-1 flex items-center gap-2 font-medium text-neutral-300">
                        <Clock className="size-4 text-amber-400" /> Séances
                      </dt>
                      <dd className="pl-6 text-neutral-500">
                        {venue.checkInPolicy ?? 'Séances en continu de 11h00 à 23h30'}
                      </dd>
                    </div>
                  </dl>
                  {(venue.address || venue.city) && (
                    <VenueMap
                      address={venue.address ?? ''}
                      city={venue.city ?? ''}
                      coordinates={venue.coordinates}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: séance widget ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111111] to-[#0B0B0B] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div>
                    {venue.startingPrice || venue.priceRangeMin ? (
                      <>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-600">À partir de</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-amber-400">
                            {(venue.startingPrice ?? venue.priceRangeMin)!.toLocaleString('fr-TN')} TND
                          </span>
                          <span className="text-sm text-neutral-600">/ place</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-neutral-300">Planifiez votre séance</span>
                    )}
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10">
                    <Sparkles className="size-4 text-amber-400" />
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                        Date
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                        Séance
                      </label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-neutral-400">
                      <Users className="size-4" /> Places
                    </span>
                    <Stepper value={seats} onChange={setSeats} min={1} max={12} />
                  </div>

                  <button
                    type="button"
                    onClick={goToSalle}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5 hover:shadow-amber-400/40"
                  >
                    <ScanEye className="size-4" />
                    Choisir mes places
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-600">
                    <Popcorn className="size-3.5 text-amber-500" />
                    Sélection de siège immersive en 360°
                  </div>
                </div>
              </div>

              {venue.phone && (
                <a
                  href={`tel:${venue.phone}`}
                  className="flex items-center justify-center gap-2 text-xs text-neutral-500 transition-colors hover:text-amber-400"
                >
                  <Phone className="size-3.5" />
                  Contacter la salle
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar ── */}
      <div className="mx-auto mt-4 max-w-7xl border-t border-white/[0.05] px-4 py-8">
        <h2 className="mb-6 text-lg font-semibold text-neutral-200">Salles similaires</h2>
        <SimilarVenues venueId={venue._id} type={venue.type} city={venue.city} />
      </div>
    </div>
  );
}
