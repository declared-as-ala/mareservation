'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BriefcaseBusiness,
  MapPin,
  Phone,
  Users,
  Clock,
  Info,
  ShoppingCart,
  Wifi,
  ArrowLeft,
  Minus,
  Plus,
  Sparkles,
  CalendarClock,
  Armchair,
  DoorClosed,
  Presentation,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  fetchVenueByIdOrSlug,
  fetchVenueReservableUnits,
  fetchVenueCoworkingAddons,
  type PublicReservableUnit,
} from '@/lib/api/venues';
import type { Venue } from '@/lib/api/types';
import { CinematicVenueHero } from '@/components/venue/CinematicVenueHero';
import { HotelAmenitiesGrid } from '@/components/hotel/HotelAmenities';
import { VenueMap } from '@/components/venue/VenueMap';
import { VenueGallery } from '@/components/venue/VenueGallery';
import { SimilarVenues } from '@/components/venue/SimilarVenues';
import { useCartStore } from '@/stores/cart';

const PanoramaEngine = dynamic(() => import('@/components/immersive/PanoramaEngine'), { ssr: false });
const MatterportClientViewer = dynamic(
  () => import('@/components/immersive/MatterportClientViewer'),
  { ssr: false }
);

// ── Helpers ────────────────────────────────────────────────────────────────

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

const UNIT_META: Record<string, { label: string; icon: typeof Armchair; desc: string }> = {
  coworking_desk: { label: 'Bureau partagé', icon: Armchair, desc: 'Hot desk en open space' },
  coworking_office: { label: 'Bureau privé', icon: DoorClosed, desc: 'Espace fermé et privatif' },
  coworking_meeting_room: { label: 'Salle de réunion', icon: Presentation, desc: 'Salle équipée pour réunions' },
};

const DURATIONS = [
  { value: 'hourly', label: 'À l’heure' },
  { value: 'half_day', label: 'Demi-journée' },
  { value: 'full_day', label: 'Journée' },
] as const;

type DurationType = (typeof DURATIONS)[number]['value'];

// ── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
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

// ── Page ────────────────────────────────────────────────────────────────────

export default function CoworkingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const { addItem, openDrawer } = useCartStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'spaces' | 'visite' | 'infos'>('overview');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [durationType, setDurationType] = useState<DurationType>('hourly');
  const [hours, setHours] = useState(2);
  const [partySize, setPartySize] = useState(1);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});

  const { data: venue, isLoading, error } = useQuery({
    queryKey: ['coworking', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['coworking-units', venue?._id],
    queryFn: () => fetchVenueReservableUnits(venue!._id),
    enabled: !!venue?._id,
  });

  const { data: addons = [] } = useQuery({
    queryKey: ['coworking-addons', venue?._id],
    queryFn: () => fetchVenueCoworkingAddons(venue!._id),
    enabled: !!venue?._id,
  });

  const hasVirtualTour =
    venue?.immersiveType &&
    venue.immersiveType !== 'none' &&
    ((venue.immersiveSourceType === 'url' && venue.immersiveUrl) ||
      (venue.immersiveSourceType === 'upload' && venue.immersiveFile));

  // Automatically default to the 360° view ('visite') tab when virtual tour data is loaded and available
  useEffect(() => {
    if (venue && hasVirtualTour) {
      setActiveTab('visite');
    }
  }, [venue, hasVirtualTour]);

  const allImages = useMemo(() => (venue ? getAllImages(venue) : []), [venue]);

  const coworkingUnits = useMemo(
    () =>
      units.filter(
        (u) => u.unitType.startsWith('coworking_') && u.isReservable && u.status === 'active'
      ),
    [units]
  );

  const startAt = useMemo(
    () => new Date(`${date}T${time}:00`).toISOString(),
    [date, time]
  );
  const effectiveHours =
    durationType === 'half_day' ? 4 : durationType === 'full_day' ? 8 : Math.max(1, hours);
  const endAt = useMemo(
    () => new Date(new Date(startAt).getTime() + effectiveHours * 60 * 60 * 1000).toISOString(),
    [startAt, effectiveHours]
  );

  const addonsSelected = useMemo(
    () =>
      addons
        .filter((a) => (addonQty[a.key] ?? 0) > 0)
        .map((a) => ({ key: a.key, name: a.name, quantity: addonQty[a.key], unitPrice: a.unitPrice })),
    [addons, addonQty]
  );
  const addonsTotal = addonsSelected.reduce((s, a) => s + a.quantity * a.unitPrice, 0);



  function handleAddToCart(unit: PublicReservableUnit) {
    if (!venue) return;
    const total = Number(unit.basePrice || 0) * effectiveHours + addonsTotal;
    addItem({
      id: `venue-${venue._id}-coworking-${unit._id}-${Date.now()}`,
      type: 'venue_coworking',
      title: venue.name,
      imageUrl: allImages[0],
      unitLabel: unit.label,
      unitType: venue.type,
      dateTime: startAt,
      endAt,
      price: total,
      quantity: partySize,
      venueId: venue._id,
      reservableUnitId: unit._id,
      slug: venue.slug,
      coworkingDurationType: durationType,
      coworkingHours: effectiveHours,
      coworkingAddons: addonsSelected,
      coworkingAddonsTotal: addonsTotal,
    });
    toast.success(`${unit.label} ajouté au panier`);
    openDrawer();
  }

  function goToSpaces() {
    setActiveTab('spaces');
    setTimeout(() => {
      document.getElementById('spaces-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  // ── Loading ──
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
          <BriefcaseBusiness className="mx-auto size-14 text-neutral-700" />
          <h2 className="text-xl font-semibold text-neutral-300">Espace introuvable</h2>
          <p className="text-neutral-600">Cet espace coworking n&apos;existe pas ou a été déplacé.</p>
          <Link href="/coworking" className="inline-flex items-center gap-2 text-amber-400 hover:underline">
            <ArrowLeft className="size-4" />
            Voir tous les espaces
          </Link>
        </div>
      </div>
    );
  }

  const desks = coworkingUnits.filter((u) => u.unitType === 'coworking_desk');
  const offices = coworkingUnits.filter((u) => u.unitType === 'coworking_office');
  const meetingRooms = coworkingUnits.filter((u) => u.unitType === 'coworking_meeting_room');
  const cheapest = coworkingUnits.reduce<number | null>(
    (min, u) => (min === null || u.basePrice < min ? u.basePrice : min),
    null
  );

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
        categoryBadge={{ icon: BriefcaseBusiness, label: 'Espace Coworking' }}
        isCompact={activeTab === 'visite'}
        onBack={() => router.back()}
      />

      {/* ── Two-column layout ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:py-10">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">

          {/* ── Left: content ── */}
          <div className="space-y-8 lg:col-span-2">

            {/* Quick stats — only render categories that actually exist */}
            {(() => {
              const stats = [
                { icon: Armchair, value: desks.length, label: 'Bureaux partagés' },
                { icon: DoorClosed, value: offices.length, label: 'Bureaux privés' },
                { icon: Presentation, value: meetingRooms.length, label: 'Salles de réunion' },
              ].filter((s) => s.value > 0);
              if (stats.length === 0) return null;
              return (
                <div
                  className={cn(
                    'grid gap-2.5 sm:gap-3',
                    stats.length === 1 ? 'grid-cols-1' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                  )}
                >
                  {stats.map(({ icon: Icon, value, label }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-center sm:p-4"
                    >
                      <Icon className="mx-auto size-5 text-amber-400" />
                      <div className="mt-2 font-serif text-xl font-bold text-white sm:text-2xl">{value}</div>
                      <div className="mt-0.5 text-[11px] leading-tight text-neutral-500">{label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Tabs */}
            <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.07] px-4">
              {(
                [
                  { id: 'overview', label: 'Aperçu' },
                  { id: 'spaces', label: `Espaces${coworkingUnits.length ? ` (${coworkingUnits.length})` : ''}` },
                  ...(hasVirtualTour ? [{ id: 'visite', label: 'Visite 360°' }] : []),
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
                      layoutId="coworking-tab-underline"
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
                      <h2 className="mb-3 text-lg font-semibold text-neutral-200">À propos de l&apos;espace</h2>
                      <p className="whitespace-pre-wrap leading-relaxed text-neutral-400">{venue.description}</p>
                    </div>
                  )}

                  <VenueGallery images={allImages} venueName={venue.name} />

                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-neutral-200">Équipements &amp; Services</h2>
                    <HotelAmenitiesGrid
                      amenities={
                        venue.amenities && venue.amenities.length > 0
                          ? venue.amenities
                          : [
                              'Wi-Fi très haut débit',
                              'Café & thé illimités',
                              'Salles de réunion',
                              'Climatisation',
                              'Imprimante & scanner',
                              'Casiers sécurisés',
                              'Espace détente',
                              'Réception',
                            ]
                      }
                    />
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                      <Info className="size-4 text-amber-400" />
                      Bon à savoir
                    </h2>
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-neutral-600">
                          <Clock className="size-3.5" /> Horaires
                        </span>
                        <span className="text-neutral-300">{venue.checkInPolicy ?? 'Lun–Ven, 08h00 – 20h00'}</span>
                      </div>
                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-neutral-600">
                          <Wifi className="size-3.5" /> Connexion
                        </span>
                        <span className="text-neutral-300">Fibre dédiée, jusqu&apos;à 1 Gbps</span>
                      </div>
                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-neutral-600">
                          <CalendarClock className="size-3.5" /> Réservation
                        </span>
                        <span className="text-neutral-300">À l&apos;heure, demi-journée ou journée</span>
                      </div>
                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-neutral-600">
                          <Users className="size-3.5" /> Accès
                        </span>
                        <span className="text-neutral-300">Indépendants, équipes &amp; entreprises</span>
                      </div>
                    </div>
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

              {/* Espaces */}
              {activeTab === 'spaces' && (
                <motion.div
                  id="spaces-section"
                  key="spaces"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
                    <CalendarClock className="size-4 shrink-0" />
                    <span>
                      {new Date(startAt).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })} ·{' '}
                      {time} · {effectiveHours}h · {partySize} pers.
                    </span>
                  </div>

                  {coworkingUnits.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-14 text-center">
                      <BriefcaseBusiness className="size-12 text-neutral-700" />
                      <h3 className="text-base font-semibold text-neutral-400">Aucun espace configuré</h3>
                      <p className="max-w-xs text-sm text-neutral-600">
                        Les espaces de ce coworking ne sont pas encore disponibles à la réservation.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {coworkingUnits.map((unit) => {
                        const meta = UNIT_META[unit.unitType] ?? UNIT_META.coworking_desk;
                        const Icon = meta.icon;
                        const total = Number(unit.basePrice || 0) * effectiveHours + addonsTotal;
                        return (
                          <div
                            key={unit._id}
                            className="group flex flex-col rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5 transition-all hover:-translate-y-0.5 hover:border-amber-400/25 hover:shadow-xl hover:shadow-amber-400/[0.06]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10 text-amber-400">
                                <Icon className="size-5" />
                              </div>
                              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                {meta.label}
                              </span>
                            </div>

                            <h3 className="mt-3 font-semibold text-neutral-100">{unit.label}</h3>
                            <p className="mt-0.5 text-xs text-neutral-500">{meta.desc}</p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                              {(unit.capacityMax ?? unit.capacityMin) && (
                                <span className="flex items-center gap-1">
                                  <Users className="size-3.5 text-neutral-600" />
                                  {unit.capacityMin && unit.capacityMax
                                    ? `${unit.capacityMin}–${unit.capacityMax} pers.`
                                    : `${unit.capacityMax ?? unit.capacityMin} pers.`}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="size-3.5 text-neutral-600" />
                                {unit.basePrice.toLocaleString('fr-TN')} TND / h
                              </span>
                            </div>

                            <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/[0.06] pt-4">
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-neutral-600">
                                  Total ({effectiveHours}h)
                                </div>
                                <div className="text-lg font-bold text-amber-400">
                                  {total.toLocaleString('fr-TN')} TND
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(unit)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 text-xs font-bold text-black shadow-lg shadow-amber-400/20 transition-all hover:bg-amber-300 hover:shadow-amber-400/40"
                              >
                                <ShoppingCart className="size-3.5" />
                                Ajouter
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Visite 360° */}
              {activeTab === 'visite' && hasVirtualTour && (
                <motion.div
                  key="visite"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="mb-1 text-lg font-semibold text-neutral-200">Visite virtuelle 360°</h2>
                    <p className="text-sm text-neutral-500">
                      Explorez les espaces de travail en immersion complète.
                    </p>
                  </div>
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
                    {venue.immersiveProvider === 'matterport' && venue.immersiveUrl ? (
                      <MatterportClientViewer
                        embedUrl={venue.immersiveUrl}
                        placements={[]}
                        onTableSelect={() => undefined}
                      />
                    ) : venue.immersiveSourceType === 'upload' && venue.immersiveFile ? (
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
                    ) : venue.immersiveUrl ? (
                      <iframe src={venue.immersiveUrl} title="Visite virtuelle" className="h-full w-full" allowFullScreen />
                    ) : null}
                  </div>
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

          {/* ── Right: sticky booking widget ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111111] to-[#0B0B0B] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div>
                    {cheapest !== null ? (
                      <>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-600">À partir de</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-amber-400">
                            {cheapest.toLocaleString('fr-TN')} TND
                          </span>
                          <span className="text-sm text-neutral-600">/ heure</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-neutral-300">Réservez votre espace</span>
                    )}
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10">
                    <Sparkles className="size-4 text-amber-400" />
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {/* Date + time */}
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

                  {/* Duration type */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                      Durée
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {DURATIONS.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setDurationType(d.value)}
                          className={cn(
                            'rounded-xl border px-2 py-2 text-[11px] font-semibold transition-all',
                            durationType === d.value
                              ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
                              : 'border-white/[0.08] bg-white/[0.02] text-neutral-500 hover:border-white/20 hover:text-neutral-300'
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hours (hourly only) */}
                  {durationType === 'hourly' && (
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
                      <span className="flex items-center gap-2 text-sm text-neutral-400">
                        <Clock className="size-4" /> Heures
                      </span>
                      <Stepper value={hours} onChange={setHours} min={1} max={12} />
                    </div>
                  )}

                  {/* Party size */}
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-neutral-400">
                      <Users className="size-4" /> Personnes
                    </span>
                    <Stepper value={partySize} onChange={setPartySize} min={1} max={20} />
                  </div>

                  {/* Add-ons */}
                  {addons.length > 0 && (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                        Options
                      </div>
                      <div className="space-y-2">
                        {addons.map((addon) => (
                          <div key={addon.key} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium text-neutral-300">{addon.name}</div>
                              <div className="text-[10px] text-neutral-600">
                                {addon.unitPrice.toLocaleString('fr-TN')} TND
                              </div>
                            </div>
                            <Stepper
                              value={addonQty[addon.key] ?? 0}
                              onChange={(v) => setAddonQty((p) => ({ ...p, [addon.key]: v }))}
                              min={0}
                              max={addon.maxQty ?? 20}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 text-xs">
                    <span className="text-neutral-500">Durée · Options</span>
                    <span className="font-semibold text-neutral-200">
                      {effectiveHours}h · {addonsTotal.toLocaleString('fr-TN')} TND
                    </span>
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={goToSpaces}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5 hover:shadow-amber-400/40"
                  >
                    <BriefcaseBusiness className="size-4" />
                    Choisir un espace
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-600">
                    <Check className="size-3.5 text-emerald-500" />
                    Confirmation immédiate · sans engagement
                  </div>
                </div>
              </div>

              {venue.phone && (
                <a
                  href={`tel:${venue.phone}`}
                  className="flex items-center justify-center gap-2 text-xs text-neutral-500 transition-colors hover:text-amber-400"
                >
                  <Phone className="size-3.5" />
                  Contacter l&apos;espace
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar ── */}
      <div className="mx-auto mt-4 max-w-7xl border-t border-white/[0.05] px-4 py-8">
        <h2 className="mb-6 text-lg font-semibold text-neutral-200">Espaces similaires</h2>
        <SimilarVenues venueId={venue._id} type={venue.type} city={venue.city} />
      </div>
    </div>
  );
}
