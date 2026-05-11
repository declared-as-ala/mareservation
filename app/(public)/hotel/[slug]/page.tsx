'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Share2,
  Star,
  Heart,
  BedDouble,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  Wifi,
  Waves,
  Car,
  Sparkles,
  UtensilsCrossed,
  Video,
  Eye,
  Shield,
  Clock,
  Info,
  Search,
  Loader2,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { fetchVenueRooms, ROOM_TYPE_LABELS, getRoomNights } from '@/lib/api/rooms';
import type { Venue, HotelRoom } from '@/lib/api/types';
import { RoomCard } from '@/components/hotel/RoomCard';
import { RoomBookingModal } from '@/components/hotel/RoomBookingModal';
import { HotelAmenitiesGrid } from '@/components/hotel/HotelAmenities';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { ShareButton } from '@/components/venue/ShareButton';
import { SimilarVenues } from '@/components/venue/SimilarVenues';
import { Button } from '@/components/ui/button';

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

// ── Gallery grid ───────────────────────────────────────────────────────────

function HotelGalleryGrid({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const shown = images.slice(0, 5);

  if (shown.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px] sm:h-[500px] rounded-2xl overflow-hidden">
        {/* Main large image */}
        <button
          type="button"
          onClick={() => setLightboxIdx(0)}
          className="col-span-2 row-span-2 relative overflow-hidden group"
          aria-label="Voir la photo principale"
        >
          {shown[0] && (
            <Image
              src={shown[0]}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </button>

        {/* Secondary images */}
        {shown.slice(1, 5).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setLightboxIdx(i + 1)}
            className="relative overflow-hidden group"
            aria-label={`Voir la photo ${i + 2}`}
          >
            <Image
              src={src}
              alt={`${name} — photo ${i + 2}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            {/* "See all" overlay on last visible */}
            {i === 3 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">+{images.length - 5} photos</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            onClick={() => setLightboxIdx(null)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.max(0, (i ?? 0) - 1)); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              aria-label="Précédent"
            >
              <ChevronLeft className="size-6" />
            </button>

            <div className="relative mx-auto max-w-5xl w-full px-20 aspect-video" onClick={(e) => e.stopPropagation()}>
              <Image
                src={images[lightboxIdx]}
                alt={`${name} — photo ${lightboxIdx + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.min(images.length - 1, (i ?? 0) + 1)); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              aria-label="Suivant"
            >
              <ChevronRight className="size-6" />
            </button>

            <button
              type="button"
              onClick={() => setLightboxIdx(null)}
              className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/60">
              {lightboxIdx + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sticky booking widget ──────────────────────────────────────────────────

interface BookingWidgetProps {
  startingPrice?: number;
  venueId: string;
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

  function fmtShort(d: Date | null) {
    if (!d) return 'Choisir';
    return d.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' });
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D0D] p-5 shadow-2xl">
      {startingPrice && (
        <div className="mb-4">
          <span className="text-xs text-neutral-600 uppercase tracking-wider">À partir de</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-bold text-amber-400">
              {startingPrice.toLocaleString('fr-TN')} DT
            </span>
            <span className="text-sm text-neutral-600">/ nuit</span>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {/* Dates row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-1 font-medium">
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
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-1 font-medium">
              Départ
            </label>
            <input
              type="date"
              min={checkIn ? new Date(checkIn.getTime() + 86400000).toISOString().slice(0, 10) : tomorrow.toISOString().slice(0, 10)}
              value={checkOut ? checkOut.toISOString().slice(0, 10) : ''}
              onChange={(e) => setCheckOut(e.target.value ? new Date(e.target.value) : null)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
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
              className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition-all disabled:opacity-30"
              disabled={guests <= 1}
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-semibold text-neutral-100">{guests}</span>
            <button
              type="button"
              onClick={() => setGuests((g) => Math.min(10, g + 1))}
              aria-label="Augmenter"
              className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition-all"
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
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm shadow-lg shadow-amber-400/25 transition-all hover:shadow-amber-400/40"
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

// ── Star display ────────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
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

  const { data: venue, isLoading: venueLoading, error: venueError, refetch } = useQuery({
    queryKey: ['hotel', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
    select: (v) => (v?.type === 'HOTEL' ? v : v), // allow all for graceful fallback
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
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
          <div className="h-[500px] rounded-2xl animate-pulse bg-white/[0.04]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 w-2/3 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-32 rounded bg-white/[0.04] animate-pulse" />
            </div>
            <div className="h-72 rounded-2xl bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (venueError || !venue) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center space-y-4">
          <BedDouble className="size-14 text-neutral-700 mx-auto" />
          <h2 className="text-xl font-semibold text-neutral-300">Hôtel introuvable</h2>
          <p className="text-neutral-600">Cet hôtel n'existe pas ou a été déplacé.</p>
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

      {/* ── Back navigation ── */}
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-2">
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 backdrop-blur-sm transition-all hover:border-amber-400/40 hover:bg-amber-400/[0.08] hover:text-amber-400"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour
        </button>
      </div>

      {/* ── Gallery ── */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <HotelGalleryGrid images={allImages} name={venue.name} />
      </div>

      {/* ── Two-column layout ── */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── Left: Main content ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Hotel title + meta */}
            <div>
              {venue.isVedette && (
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/8 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  <Crown className="size-2.5" />
                  Établissement de prestige
                </div>
              )}

              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                {venue.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-amber-400 shrink-0" />
                  <span>{[venue.address, venue.city].filter(Boolean).join(', ')}</span>
                </div>
                <StarRow count={4} />
                {venue.hasVirtualTour && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-neutral-400">
                    <Video className="size-3" /> Visite 360°
                  </span>
                )}
              </div>

              {/* Action row */}
              <div className="mt-4 flex items-center gap-3">
                <div onClick={(e) => e.preventDefault()}>
                  <FavoriteButton venueId={venue._id} />
                </div>
                <ShareButton title={venue.name} />
              </div>
            </div>

            {/* ── Tab navigation ── */}
            <div className="flex gap-1 border-b border-white/[0.07] -mx-4 px-4 overflow-x-auto">
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
                    'whitespace-nowrap pb-3 pt-1 px-1 text-sm font-medium border-b-2 transition-all',
                    activeTab === tab.id
                      ? 'border-amber-400 text-amber-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Aperçu ── */}
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
                      <h2 className="text-lg font-semibold text-neutral-200 mb-3">
                        À propos de l'hôtel
                      </h2>
                      <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                        {venue.description}
                      </p>
                    </div>
                  )}

                  {/* Amenities — derive from description or hardcode sample */}
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-200 mb-3">
                      Équipements & Services
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
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                      <Info className="size-4 text-amber-400" />
                      Politiques de l'établissement
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-600 flex items-center gap-1.5 mb-1">
                          <Clock className="size-3.5" /> Check-in
                        </span>
                        <span className="text-neutral-300">
                          {(venue as { checkInPolicy?: string }).checkInPolicy ?? 'À partir de 14h00'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-600 flex items-center gap-1.5 mb-1">
                          <Clock className="size-3.5" /> Check-out
                        </span>
                        <span className="text-neutral-300">
                          {(venue as { checkOutPolicy?: string }).checkOutPolicy ?? "Jusqu'à 12h00"}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-600 flex items-center gap-1.5 mb-1">
                          <Shield className="size-3.5" /> Annulation
                        </span>
                        <span className="text-neutral-300">Gratuite jusqu'à 24h avant l'arrivée</span>
                      </div>
                      <div>
                        <span className="text-neutral-600 flex items-center gap-1.5 mb-1">
                          <Users className="size-3.5" /> Animaux
                        </span>
                        <span className="text-neutral-300">Non admis</span>
                      </div>
                    </div>
                  </div>
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
                        className="text-neutral-600 hover:text-neutral-400 transition-colors"
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
                        <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#0C0C0C] overflow-hidden animate-pulse">
                          <div className="aspect-[4/3] bg-white/[0.04]" />
                          <div className="p-4 space-y-3">
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
                        <p className="text-sm text-neutral-600 max-w-xs">
                          Les chambres de cet hôtel ne sont pas encore configurées.
                          Réservez via le formulaire ou contactez l'hôtel directement.
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
                    <h2 className="text-lg font-semibold text-neutral-200 mb-1">
                      Visite virtuelle 360°
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Explorez l'hôtel et ses chambres en immersion complète.
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
                        <dt className="flex items-center gap-2 font-medium text-neutral-300 mb-1">
                          <MapPin className="size-4 text-amber-400" /> Adresse
                        </dt>
                        <dd className="text-neutral-500 pl-6">
                          {venue.address}, {venue.city}
                        </dd>
                      </div>
                    )}
                    {venue.phone && (
                      <div>
                        <dt className="flex items-center gap-2 font-medium text-neutral-300 mb-1">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: Sticky booking widget ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingWidget
                startingPrice={venue.startingPrice ?? venue.priceRangeMin}
                venueId={venue._id}
                onSearch={handleSearchRooms}
              />

              {/* Quick contact */}
              {venue.phone && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <a
                    href={`tel:${venue.phone}`}
                    className="flex items-center gap-2 text-xs text-neutral-500 hover:text-amber-400 transition-colors"
                  >
                    <Phone className="size-3.5" />
                    Appeler l'hôtel
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar hotels ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 border-t border-white/[0.05] mt-4">
        <h2 className="text-lg font-semibold text-neutral-200 mb-6">Hôtels similaires</h2>
        <SimilarVenues venueId={venue._id} type={venue.type} city={venue.city} />
      </div>

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
