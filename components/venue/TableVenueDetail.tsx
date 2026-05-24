'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee,
  UtensilsCrossed,
  MapPin,
  Phone,
  Users,
  Clock,
  ArrowLeft,
  Minus,
  Plus,
  Sparkles,
  Video,
  Star,
  Armchair,
  ScanEye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { fetchVenueMenu } from '@/lib/api/menu';
import type { Venue } from '@/lib/api/types';
import { CinematicVenueHero } from '@/components/venue/CinematicVenueHero';
import { VenueMenuSection } from '@/components/venue/VenueMenuSection';
import { TableReservationDialog } from '@/components/venue/TableReservationDialog';
import { HotelAmenitiesGrid } from '@/components/hotel/HotelAmenities';
import { VenueMap } from '@/components/venue/VenueMap';
import { SimilarVenues } from '@/components/venue/SimilarVenues';

const ImmersiveTableReservation = dynamic(
  () => import('./ImmersiveTableReservation'),
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
  max = 20,
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

type TableCategory = 'CAFE' | 'RESTAURANT';

const CATEGORY_META: Record<TableCategory, { icon: typeof Coffee; label: string; aboutLabel: string }> = {
  CAFE: { icon: Coffee, label: 'Café & Lounge', aboutLabel: 'À propos du café' },
  RESTAURANT: { icon: UtensilsCrossed, label: 'Restaurant', aboutLabel: 'À propos du restaurant' },
};

/**
 * Shared detail page for table-based immersive venues (café & restaurant).
 * Mirrors the hotel page structure: cinematic hero, tabs, sticky widget —
 * with a prominent menu and a 360° virtual tour. Table selection funnels
 * into the proven immersive reservation flow at /lieu/[slug].
 */
export function TableVenueDetail({ category }: { category: TableCategory }) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const meta = CATEGORY_META[category];

  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'reserver' | 'infos'>('reserver');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('20:00');
  const [party, setParty] = useState(2);
  const [reservationOpen, setReservationOpen] = useState(false);

  const { data: venue, isLoading, error } = useQuery({
    queryKey: ['table-venue', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
  });

  const { data: menu = [] } = useQuery({
    queryKey: ['venue-menu', venue?._id],
    queryFn: () => fetchVenueMenu(venue!._id),
    enabled: !!venue?._id,
  });

  const allImages = useMemo(() => (venue ? getAllImages(venue) : []), [venue]);

  // Café & restaurant always offer table reservation; the immersive
  // component itself falls back gracefully when a venue has no 360° scenes.
  const hasVirtualTour = !!venue?.hasVirtualTour;

  function goToReserver() {
    setActiveTab('reserver');
    setTimeout(() => {
      document.getElementById('reserver-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const Icon = meta.icon;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808]">
        <div className="space-y-4 text-center">
          <Icon className="mx-auto size-14 text-neutral-700" />
          <h2 className="text-xl font-semibold text-neutral-300">Lieu introuvable</h2>
          <p className="text-neutral-600">Ce lieu n&apos;existe pas ou a été déplacé.</p>
          <Link href="/explorer" className="inline-flex items-center gap-2 text-amber-400 hover:underline">
            <ArrowLeft className="size-4" />
            Explorer les lieux
          </Link>
        </div>
      </div>
    );
  }

  const popularCount = menu.filter((m) => m.isPopular).length;

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
        hasVirtualTour={!!hasVirtualTour}
        categoryBadge={{ icon: meta.icon, label: meta.label }}
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
                { icon: UtensilsCrossed, value: menu.length, label: 'À la carte' },
                { icon: Star, value: popularCount, label: 'Spécialités' },
                { icon: ScanEye, value: hasVirtualTour ? '360°' : '—', label: 'Réservation 360°' },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center"
                >
                  <Icon className="mx-auto size-5 text-amber-400" />
                  <div className="mt-2 font-serif text-2xl font-bold text-white">{value}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-neutral-500">{label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.07] px-4">
              {(
                [
                  { id: 'overview', label: 'Aperçu' },
                  { id: 'menu', label: `Carte${menu.length ? ` (${menu.length})` : ''}` },
                  { id: 'reserver', label: 'Réserver une table' },
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
                      layoutId="table-venue-tab-underline"
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
                      <h2 className="mb-3 text-lg font-semibold text-neutral-200">{meta.aboutLabel}</h2>
                      <p className="whitespace-pre-wrap leading-relaxed text-neutral-400">{venue.description}</p>
                    </div>
                  )}

                  {/* Menu preview */}
                  {menu.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-neutral-200">Notre carte</h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('menu')}
                          className="text-sm font-medium text-amber-400/80 transition-colors hover:text-amber-400"
                        >
                          Voir tout →
                        </button>
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {menu
                          .filter((m) => m.isPopular)
                          .slice(0, 4)
                          .map((item) => (
                            <div
                              key={item._id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
                                  <span className="truncate text-sm font-medium text-neutral-200">{item.name}</span>
                                </div>
                              </div>
                              <span className="shrink-0 text-sm font-bold text-amber-400">
                                {item.price.toLocaleString('fr-TN')} TND
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-neutral-200">Équipements &amp; Ambiance</h2>
                    <HotelAmenitiesGrid
                      amenities={
                        venue.amenities && venue.amenities.length > 0
                          ? venue.amenities
                          : [
                              'Wi-Fi gratuit',
                              'Terrasse',
                              'Climatisation',
                              'Réservation de table',
                              'Paiement par carte',
                              'Accès PMR',
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

              {/* Carte / Menu */}
              {activeTab === 'menu' && (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <VenueMenuSection items={menu} />
                </motion.div>
              )}

              {/* Réserver une table */}
              {activeTab === 'reserver' && (
                <motion.div
                  id="reserver-section"
                  key="reserver"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="mb-1 text-lg font-semibold text-neutral-200">Sélection de table en 360°</h2>
                    <p className="text-sm text-neutral-500">
                      Explorez la salle virtuelle en 360°, vérifiez la disponibilité en temps réel, et réservez votre table préférée.
                    </p>
                  </div>
                  <ImmersiveTableReservation
                    venue={venue}
                    onClassicReserve={() => setReservationOpen(true)}
                    initialDate={date}
                    initialTime={time}
                  />
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
                        <Clock className="size-4 text-amber-400" /> Horaires
                      </dt>
                      <dd className="pl-6 text-neutral-500">
                        {venue.checkInPolicy ?? 'Tous les jours · 08h00 – 23h00'}
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

          {/* ── Right: reservation widget ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111111] to-[#0B0B0B] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-600">Réservation</span>
                    <div className="text-lg font-bold text-white">Réservez votre table</div>
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
                        Heure
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
                      <Users className="size-4" /> Convives
                    </span>
                    <Stepper value={party} onChange={setParty} min={1} max={20} />
                  </div>

                  <button
                    type="button"
                    onClick={goToReserver}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5 hover:shadow-amber-400/40"
                  >
                    <ScanEye className="size-4" />
                    Choisir ma table en 360°
                  </button>

                  <button
                    type="button"
                    onClick={() => setReservationOpen(true)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] text-sm font-semibold text-neutral-200 transition-all hover:border-amber-400/30 hover:bg-amber-400/[0.06] hover:text-amber-300"
                  >
                    <Video className="size-4" />
                    Réservation classique
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-600">
                    <ScanEye className="size-3.5 text-amber-500" />
                    Choisissez votre table dans la vue 360°
                  </div>
                </div>
              </div>

              {venue.phone && (
                <a
                  href={`tel:${venue.phone}`}
                  className="flex items-center justify-center gap-2 text-xs text-neutral-500 transition-colors hover:text-amber-400"
                >
                  <Phone className="size-3.5" />
                  Contacter le lieu
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar ── */}
      <div className="mx-auto mt-4 max-w-7xl border-t border-white/[0.05] px-4 py-8">
        <h2 className="mb-6 text-lg font-semibold text-neutral-200">Lieux similaires</h2>
        <SimilarVenues venueId={venue._id} type={venue.type} city={venue.city} />
      </div>

      {/* ── Reservation dialog ── */}
      <TableReservationDialog
        open={reservationOpen}
        onClose={() => setReservationOpen(false)}
        venue={venue}
        initialDate={date}
        initialTime={time}
        initialParty={party}
      />
    </div>
  );
}
