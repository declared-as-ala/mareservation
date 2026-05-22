'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Star,
  BedDouble,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  Video,
  Shield,
  Clock,
  Info,
  Search,
  X,
  Minus,
  Plus,
  Images,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { fetchVenueRooms, getRoomNights } from '@/lib/api/rooms';
import type { Venue, HotelRoom } from '@/lib/api/types';
import { RoomCard } from '@/components/hotel/RoomCard';
import { RoomBookingModal } from '@/components/hotel/RoomBookingModal';
import { HotelAmenitiesGrid } from '@/components/hotel/HotelAmenities';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { ShareButton } from '@/components/venue/ShareButton';
import { SimilarVenues } from '@/components/venue/SimilarVenues';
import { VenueMap } from '@/components/venue/VenueMap';

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

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

function fmt(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Star display ────────────────────────────────────────────────────────────

function StarRow({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < count ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-white/20'
          )}
        />
      ))}
    </div>
  );
}

// ── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({
  images,
  index,
  name,
  onClose,
  onNavigate,
}: {
  images: string[];
  index: number | null;
  name: string;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  return (
    <AnimatePresence>
      {index !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(Math.max(0, index - 1)); }}
            className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            aria-label="Précédent"
          >
            <ChevronLeft className="size-6" />
          </button>

          <div
            className="relative mx-auto aspect-video w-full max-w-5xl px-20"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[index]}
              alt={`${name} — photo ${index + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(Math.min(images.length - 1, index + 1)); }}
            className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            aria-label="Suivant"
          >
            <ChevronRight className="size-6" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/60">
            {index + 1} / {images.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Cinematic hotel hero ────────────────────────────────────────────────────

function HotelHero({
  venue,
  images,
  onBack,
  onOpenGallery,
}: {
  venue: Venue;
  images: string[];
  onBack: () => void;
  onOpenGallery: (index: number) => void;
}) {
  const cover = images[0];
  const thumbs = images.slice(1, 5);

  return (
    <section className="relative h-[68vh] min-h-[460px] max-h-[760px] w-full overflow-hidden">
      {/* Cover image */}
      {cover ? (
        <Image
          src={cover}
          alt={venue.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black" />
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/35 to-[#080808]/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent" />
      <div aria-hidden className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-amber-500/[0.07] blur-[120px]" />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-5">
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md transition-all hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/15 bg-black/40 backdrop-blur-md">
              <FavoriteButton venueId={venue._id} />
            </div>
            <div className="rounded-full border border-white/15 bg-black/40 backdrop-blur-md">
              <ShareButton title={venue.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-8 md:flex-row md:items-end md:justify-between">
          {/* Title block */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            {venue.isVedette && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-sm">
                <Crown className="size-3" />
                Établissement de prestige
              </div>
            )}

            <h1 className="font-serif text-3xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
              {venue.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/75">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0 text-amber-400" />
                <span>{[venue.address, venue.city].filter(Boolean).join(', ')}</span>
              </div>
              <span className="hidden h-3.5 w-px bg-white/20 sm:block" />
              <StarRow count={4} />
              {venue.hasVirtualTour && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                  <Video className="size-3" /> Visite 360°
                </span>
              )}
            </div>
          </motion.div>

          {/* Thumbnail rail */}
          {thumbs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2"
            >
              {thumbs.map((src, i) => {
                const isLast = i === thumbs.length - 1;
                const remaining = images.length - 5;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => onOpenGallery(i + 1)}
                    className="group relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/15 sm:size-20"
                    aria-label={`Voir la photo ${i + 2}`}
                  >
                    <Image
                      src={src}
                      alt={`${venue.name} — photo ${i + 2}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="80px"
                    />
                    {isLast && remaining > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/65 text-sm font-bold text-white">
                        +{remaining}
                      </div>
                    )}
                    <div className="absolute inset-0 ring-0 ring-amber-400/0 transition-all group-hover:ring-2 group-hover:ring-amber-400/60" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onOpenGallery(0)}
                className="inline-flex h-16 items-center gap-2 rounded-xl border border-white/15 bg-black/45 px-4 text-xs font-semibold text-white/85 backdrop-blur-md transition-all hover:border-amber-400/40 hover:text-amber-400 sm:h-20"
              >
                <Images className="size-4" />
                <span className="hidden sm:inline">Toutes<br />les photos</span>
                <span className="sm:hidden">Photos</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Sticky booking widget ──────────────────────────────────────────────────

interface BookingWidgetProps {
  startingPrice?: number;
  onSearch: (checkIn: Date, checkOut: Date, guests: number) => void;
}

function BookingWidget({ startingPrice, onSearch }: BookingWidgetProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(2);

  const nights = checkIn && checkOut ? getRoomNights(checkIn, checkOut) : 0;

  function handleSearch() {
    if (!checkIn || !checkOut) {
      toast.error("Veuillez sélectionner vos dates d'arrivée et de départ.");
      return;
    }
    onSearch(checkIn, checkOut, guests);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111111] to-[#0B0B0B] shadow-2xl">
      {/* Price header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        {startingPrice ? (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-neutral-600">À partir de</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-400">
                {startingPrice.toLocaleString('fr-TN')} DT
              </span>
              <span className="text-sm text-neutral-600">/ nuit</span>
            </div>
          </div>
        ) : (
          <span className="text-sm font-medium text-neutral-300">Réserver votre séjour</span>
        )}
        <div className="flex size-9 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10">
          <Sparkles className="size-4 text-amber-400" />
        </div>
      </div>

      <div className="space-y-2.5 p-5">
        {/* Dates row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-600">
              Arrivée
            </label>
            <input
              type="date"
              min={today.toISOString().slice(0, 10)}
              value={checkIn ? checkIn.toISOString().slice(0, 10) : ''}
              onChange={(e) => {
                const d = e.target.value ? new Date(e.target.value) : null;
                setCheckIn(d);
                if (d && checkOut && checkOut <= d) setCheckOut(null);
              }}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-600">
              Départ
            </label>
            <input
              type="date"
              min={checkIn ? new Date(checkIn.getTime() + 86400000).toISOString().slice(0, 10) : tomorrow.toISOString().slice(0, 10)}
              value={checkOut ? checkOut.toISOString().slice(0, 10) : ''}
              onChange={(e) => setCheckOut(e.target.value ? new Date(e.target.value) : null)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
            />
          </div>
        </div>

        {/* Guests */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Users className="size-4" />
            Voyageurs
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              aria-label="Réduire"
              className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
              disabled={guests <= 1}
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-semibold text-neutral-100">{guests}</span>
            <button
              type="button"
              onClick={() => setGuests((g) => Math.min(10, g + 1))}
              aria-label="Augmenter"
              className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Nights label */}
        {nights > 0 && (
          <div className="text-center text-xs text-neutral-500">
            {nights} nuit{nights > 1 ? 's' : ''} sélectionnée{nights > 1 ? 's' : ''}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleSearch}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5 hover:shadow-amber-400/40"
        >
          <Search className="size-4" />
          Voir les chambres disponibles
        </button>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-600">
          <Shield className="size-3.5 text-emerald-500" />
          Annulation gratuite sur la plupart des chambres
        </div>
      </div>
    </div>
  );
}

// ── Room type filter pills ──────────────────────────────────────────────────

const ROOM_TYPE_FILTERS = [
  { value: '', label: 'Tout afficher' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'DELUXE', label: 'Deluxe' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'JUNIOR_SUITE', label: 'Junior Suite' },
  { value: 'PRESIDENTIAL_SUITE', label: 'Suite Présidentielle' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'APARTMENT', label: 'Appartement' },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function HotelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(2);
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'visite' | 'infos'>('overview');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { data: venue, isLoading: venueLoading, error: venueError } = useQuery({
    queryKey: ['hotel', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['hotel-rooms', venue?._id, checkIn?.toISOString(), checkOut?.toISOString()],
    queryFn: () =>
      fetchVenueRooms(venue!._id, {
        checkIn: checkIn?.toISOString(),
        checkOut: checkOut?.toISOString(),
        guests,
      }),
    enabled: !!venue?._id,
  });

  const allImages = useMemo(() => (venue ? getAllImages(venue) : []), [venue]);

  const filteredRooms = useMemo(
    () =>
      roomTypeFilter
        ? rooms.filter((r) => r.roomType?.toUpperCase() === roomTypeFilter)
        : rooms,
    [rooms, roomTypeFilter]
  );

  const hasRooms = rooms.length > 0;
  const hasVirtualTour =
    venue?.immersiveType &&
    venue.immersiveType !== 'none' &&
    ((venue.immersiveSourceType === 'url' && venue.immersiveUrl) ||
      (venue.immersiveSourceType === 'upload' && venue.immersiveFile));

  function handleSearchRooms(ci: Date, co: Date, g: number) {
    setCheckIn(ci);
    setCheckOut(co);
    setGuests(g);
    setActiveTab('rooms');
    setTimeout(() => {
      document.getElementById('rooms-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // ── Loading ──
  if (venueLoading) {
    return (
      <div className="min-h-screen bg-[#080808]">
        <div className="h-[68vh] min-h-[460px] animate-pulse bg-white/[0.04]" />
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="h-8 w-2/3 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-32 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="h-72 animate-pulse rounded-2xl bg-white/[0.04]" />
          </div>
        </div>
      </div>
    );
  }

  if (venueError || !venue) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808]">
        <div className="space-y-4 text-center">
          <BedDouble className="mx-auto size-14 text-neutral-700" />
          <h2 className="text-xl font-semibold text-neutral-300">Hôtel introuvable</h2>
          <p className="text-neutral-600">Cet hôtel n&apos;existe pas ou a été déplacé.</p>
          <Link href="/hotels" className="inline-flex items-center gap-2 text-amber-400 hover:underline">
            <ArrowLeft className="size-4" />
            Voir tous les hôtels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">

      {/* ── Cinematic hero ── */}
      <HotelHero
        venue={venue}
        images={allImages}
        onBack={() => router.back()}
        onOpenGallery={(i) => setLightboxIdx(i)}
      />

      {/* ── Two-column layout ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:py-10">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">

          {/* ── Left: Main content ── */}
          <div className="space-y-8 lg:col-span-2">

            {/* ── Tab navigation ── */}
            <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.07] px-4">
              {(
                [
                  { id: 'overview', label: 'Aperçu' },
                  { id: 'rooms', label: `Chambres${hasRooms ? ` (${rooms.length})` : ''}` },
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
                    activeTab === tab.id
                      ? 'text-amber-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.span
                      layoutId="hotel-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-amber-400"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-7"
                >
                  {/* Description */}
                  {venue.description && (
                    <div>
                      <h2 className="mb-3 text-lg font-semibold text-neutral-200">
                        À propos de l&apos;hôtel
                      </h2>
                      <p className="whitespace-pre-wrap leading-relaxed text-neutral-400">
                        {venue.description}
                      </p>
                    </div>
                  )}

                  {/* Amenities */}
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-neutral-200">
                      Équipements &amp; Services
                    </h2>
                    <HotelAmenitiesGrid
                      amenities={[
                        'Wi-Fi gratuit',
                        'Piscine',
                        'Parking',
                        'Spa & bien-être',
                        'Restaurant gastronomique',
                        'Bar & lounge',
                        'Salle de fitness',
                        'Climatisation',
                        'Conciergerie',
                        'Room service 24h',
                        'Petit-déjeuner buffet',
                        'Blanchisserie',
                      ]}
                    />
                  </div>

                  {/* Check-in policies */}
                  <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                      <Info className="size-4 text-amber-400" />
                      Politiques de l&apos;établissement
                    </h2>
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-neutral-600">
                          <Clock className="size-3.5" /> Check-in
                        </span>
                        <span className="text-neutral-300">
                          {venue.checkInPolicy ?? 'À partir de 14h00'}
                        </span>
                      </div>
                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-neutral-600">
                          <Clock className="size-3.5" /> Check-out
                        </span>
                        <span className="text-neutral-300">
                          {venue.checkOutPolicy ?? "Jusqu'à 12h00"}
                        </span>
                      </div>
                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-neutral-600">
                          <Shield className="size-3.5" /> Annulation
                        </span>
                        <span className="text-neutral-300">
                          {venue.cancellationPolicy ?? "Gratuite jusqu'à 24h avant l'arrivée"}
                        </span>
                      </div>
                      <div>
                        <span className="mb-1 flex items-center gap-1.5 text-neutral-600">
                          <Users className="size-3.5" /> Animaux
                        </span>
                        <span className="text-neutral-300">Non admis</span>
                      </div>
                    </div>
                  </div>

                  {/* Map */}
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

              {/* ── Rooms tab ── */}
              {activeTab === 'rooms' && (
                <motion.div
                  id="rooms-section"
                  key="rooms"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Date filter info */}
                  {checkIn && checkOut && (
                    <div className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-amber-300">
                        <CalendarDays className="size-4" />
                        <span>
                          {fmt(checkIn)} → {fmt(checkOut)} · {guests} voyageur{guests > 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setCheckIn(null); setCheckOut(null); }}
                        className="text-neutral-600 transition-colors hover:text-neutral-400"
                        aria-label="Effacer les dates"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )}

                  {/* Room type filter pills */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {ROOM_TYPE_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setRoomTypeFilter(f.value)}
                        className={cn(
                          'shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all',
                          roomTypeFilter === f.value
                            ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
                            : 'border-white/[0.07] bg-white/[0.03] text-neutral-500 hover:border-white/20 hover:text-neutral-300'
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Rooms grid */}
                  {roomsLoading ? (
                    <div className="grid gap-5 sm:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0C0C0C]">
                          <div className="aspect-[4/3] bg-white/[0.04]" />
                          <div className="space-y-3 p-4">
                            <div className="h-4 w-2/3 rounded bg-white/[0.05]" />
                            <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                            <div className="h-8 rounded bg-white/[0.04]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-14 text-center">
                      <BedDouble className="size-12 text-neutral-700" />
                      <h3 className="text-base font-semibold text-neutral-400">
                        {rooms.length === 0
                          ? 'Aucune chambre configurée'
                          : 'Aucune chambre de ce type'}
                      </h3>
                      {rooms.length === 0 ? (
                        <p className="max-w-xs text-sm text-neutral-600">
                          Les chambres de cet hôtel ne sont pas encore configurées.
                          Réservez via le formulaire ou contactez l&apos;hôtel directement.
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRoomTypeFilter('')}
                          className="text-sm text-amber-400 hover:underline"
                        >
                          Voir toutes les chambres
                        </button>
                      )}
                    </div>
                  ) : (
                    <AnimatePresence>
                      <div className="grid gap-5 sm:grid-cols-2">
                        {filteredRooms.map((room) => (
                          <RoomCard
                            key={room._id}
                            room={room}
                            checkIn={checkIn?.toISOString()}
                            checkOut={checkOut?.toISOString()}
                            onBook={(r) => setSelectedRoom(r)}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  )}
                </motion.div>
              )}

              {/* ── Visite 360° ── */}
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
                    <h2 className="mb-1 text-lg font-semibold text-neutral-200">
                      Visite virtuelle 360°
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Explorez l&apos;hôtel et ses chambres en immersion complète.
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
                      <iframe
                        src={venue.immersiveUrl}
                        title="Visite virtuelle"
                        className="h-full w-full"
                        allowFullScreen
                      />
                    ) : null}
                  </div>
                </motion.div>
              )}

              {/* ── Infos pratiques ── */}
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
                        <dd className="pl-6 text-neutral-500">
                          {venue.address}, {venue.city}
                        </dd>
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

                  {/* Map */}
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

          {/* ── Right: Sticky booking widget ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingWidget
                startingPrice={venue.startingPrice ?? venue.priceRangeMin}
                onSearch={handleSearchRooms}
              />

              {/* Quick contact */}
              {venue.phone && (
                <a
                  href={`tel:${venue.phone}`}
                  className="mt-3 flex items-center justify-center gap-2 text-xs text-neutral-500 transition-colors hover:text-amber-400"
                >
                  <Phone className="size-3.5" />
                  Appeler l&apos;hôtel
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar hotels ── */}
      <div className="mx-auto mt-4 max-w-7xl border-t border-white/[0.05] px-4 py-8">
        <h2 className="mb-6 text-lg font-semibold text-neutral-200">Hôtels similaires</h2>
        <SimilarVenues venueId={venue._id} type={venue.type} city={venue.city} />
      </div>

      {/* ── Lightbox ── */}
      <Lightbox
        images={allImages}
        index={lightboxIdx}
        name={venue.name}
        onClose={() => setLightboxIdx(null)}
        onNavigate={setLightboxIdx}
      />

      {/* ── Room booking modal ── */}
      {selectedRoom && (
        <RoomBookingModal
          room={selectedRoom}
          venue={venue as Venue}
          open={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          initialCheckIn={checkIn ?? undefined}
          initialCheckOut={checkOut ?? undefined}
        />
      )}
    </div>
  );
}
