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
import { fetchVenueByIdOrSlug, fetchVenueScenes } from '@/lib/api/venues';
import { fetchVenueRooms, getRoomNights, ROOM_TYPE_LABELS, toDateInputValue, parseDateInput } from '@/lib/api/rooms';
import type { Venue, HotelRoom } from '@/lib/api/types';
import { RoomBookingModal } from '@/components/hotel/RoomBookingModal';
import { BookingReservationModal } from '@/components/hotel/BookingReservationModal';
import { RoomTypeCard, type RoomTypeGroup } from '@/components/hotel/RoomTypeCard';
import { RoomTypeViewer } from '@/components/hotel/RoomTypeViewer';
import { HotelAmenitiesGrid } from '@/components/hotel/HotelAmenities';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { ShareButton } from '@/components/venue/ShareButton';
import { SimilarVenues } from '@/components/venue/SimilarVenues';
import { VenueMap } from '@/components/venue/VenueMap';
import { VenueGallery } from '@/components/venue/VenueGallery';

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

const MatterportClientViewer = dynamic(
  () => import('@/components/immersive/MatterportClientViewer'),
  { ssr: false }
);

const PanoramaTourViewer = dynamic(
  () => import('@/components/immersive/PanoramaTourViewer').then((module) => ({ default: module.PanoramaTourViewer })),
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
            className="absolute left-4 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            aria-label="Précédent"
          >
            <ChevronLeft className="size-6" />
          </button>

          <div
            className="relative mx-auto aspect-video w-full max-w-5xl px-4 sm:px-20"
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
            className="absolute right-4 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            aria-label="Suivant"
          >
            <ChevronRight className="size-6" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
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
  onOpenTour,
}: {
  venue: Venue;
  images: string[];
  onBack: () => void;
  onOpenGallery: (index: number) => void;
  onOpenTour: () => void;
}) {
  const cover = images[0];
  const thumbs = images.slice(1, 5);

  return (
    <section className="relative h-[50vh] min-h-[320px] md:min-h-[460px] md:h-[68vh] max-h-[760px] w-full overflow-hidden">
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
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-sm">
                {venue.type === 'MAISON_DHOTE' ? 'Maison d\'hôte' : 'Hôtel'}
              </span>
              {typeof venue.stars === 'number' && venue.stars >= 1 && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/40 bg-black/55 px-3 py-1 text-[10px] font-bold tracking-widest text-amber-300 backdrop-blur-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'size-3',
                        i < (venue.stars ?? 0) ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-white/20'
                      )}
                    />
                  ))}
                  <span className="ml-1.5 text-[11px]">{venue.stars}/5</span>
                </span>
              )}
              {venue.isVedette && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-sm">
                  <Crown className="size-3" />
                  Prestige
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
              {venue.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/75">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0 text-amber-400" />
                <span>{[venue.address, venue.city].filter(Boolean).join(', ')}</span>
              </div>
              {venue.hasVirtualTour && (
                <button
                  type="button"
                  onClick={onOpenTour}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/15 px-3 text-[11px] font-bold text-amber-300 backdrop-blur-sm transition-all hover:border-amber-400/60 hover:bg-amber-400/25"
                >
                  <Video className="size-3" /> Explorer en 360
                </button>
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
  groups: RoomTypeGroup[];
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  selectedRoomType: string;
  onCheckInChange: (date: Date | null) => void;
  onCheckOutChange: (date: Date | null) => void;
  onGuestsChange: (guests: number) => void;
  onRoomTypeChange: (roomType: string) => void;
  onBook: () => void;
}

function BookingWidget({
  startingPrice,
  groups,
  checkIn,
  checkOut,
  guests,
  selectedRoomType,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onRoomTypeChange,
  onBook,
}: BookingWidgetProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nights = checkIn && checkOut ? getRoomNights(checkIn, checkOut) : 0;

  function handleBook() {
    if (!checkIn || !checkOut) {
      toast.error("Veuillez sélectionner vos dates d'arrivée et de départ.");
      return;
    }
    if (!selectedRoomType) {
      toast.error('Veuillez choisir un type de chambre ou de suite.');
      return;
    }
    onBook();
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-amber-400/[0.18] bg-gradient-to-br from-[#1a1408] via-[#111111] to-[#0B0B0B] shadow-[0_20px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(245,158,11,0.18)]">
      {/* Price header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-gradient-to-r from-amber-400/[0.08] to-transparent px-4 py-3.5 sm:px-5 sm:py-4">
        {startingPrice ? (
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/85">À partir de</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-serif text-2xl font-black text-amber-400 sm:text-3xl">
                {startingPrice.toLocaleString('fr-TN')}
              </span>
              <span className="text-xs font-bold text-amber-300/80">DT</span>
              <span className="text-xs text-neutral-500">/ nuit</span>
            </div>
          </div>
        ) : (
          <span className="text-sm font-medium text-neutral-300">Réserver votre séjour</span>
        )}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/[0.10] shadow-[0_0_18px_rgba(245,158,11,0.25)]">
          <Sparkles className="size-4 text-amber-400" />
        </div>
      </div>

      <div className="space-y-2.5 p-4 sm:p-5">
        {/* Dates row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-600">
              Arrivée
            </label>
            <input
              type="date"
              min={toDateInputValue(today)}
              value={checkIn ? toDateInputValue(checkIn) : ''}
              onChange={(e) => {
                const d = parseDateInput(e.target.value);
                onCheckInChange(d);
                if (d && checkOut && checkOut <= d) onCheckOutChange(null);
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
              min={checkIn ? toDateInputValue(new Date(checkIn.getTime() + 86400000)) : toDateInputValue(tomorrow)}
              value={checkOut ? toDateInputValue(checkOut) : ''}
              onChange={(e) => onCheckOutChange(parseDateInput(e.target.value))}
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
              onClick={() => onGuestsChange(Math.max(1, guests - 1))}
              aria-label="Réduire"
              className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white disabled:opacity-30"
              disabled={guests <= 1}
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-semibold text-neutral-100">{guests}</span>
            <button
              type="button"
              onClick={() => onGuestsChange(Math.min(10, guests + 1))}
              aria-label="Augmenter"
              className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition-all hover:border-white/20 hover:text-white"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Room or suite type */}
        <div>
          <label
            htmlFor="hotel-room-type"
            className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-600"
          >
            Chambre / Suite
          </label>
          <select
            id="hotel-room-type"
            value={selectedRoomType}
            onChange={(event) => onRoomTypeChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-neutral-200 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
          >
            <option value="">Choisir un type</option>
            {groups.map((group) => {
              const label = ROOM_TYPE_LABELS[group.roomType] ?? group.roomType;
              const capacity = Math.max(
                ...group.rooms.map((room) => room.capacityAdults ?? room.capacity ?? 1)
              );
              const unavailable = group.availableCount === 0 || capacity < guests;
              return (
                <option key={group.roomType} value={group.roomType} disabled={unavailable}>
                  {label} · {group.minPrice.toLocaleString('fr-TN')} DT
                  {unavailable ? ' · indisponible' : ''}
                </option>
              );
            })}
          </select>
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
          onClick={handleBook}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5 hover:shadow-amber-400/40"
        >
          <Sparkles className="size-4" />
          Réserver maintenant
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

// ── Page ────────────────────────────────────────────────────────────────────

export default function HotelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(2);
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [roomSort, setRoomSort] = useState<'price' | 'capacity' | 'surface'>('price');
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
  const [viewerGroup, setViewerGroup] = useState<RoomTypeGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'visite' | 'infos'>('visite');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const { data: venue, isLoading: venueLoading, error: venueError } = useQuery({
    queryKey: ['hotel', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
  });

  const { data: venueTour = { scenes: [], hotspots: [] } } = useQuery({
    queryKey: ['hotel-tour', slug],
    queryFn: () => fetchVenueScenes(slug),
    enabled: !!slug,
  });

  const { data: rawRooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['hotel-rooms', venue?._id, checkIn?.toISOString(), checkOut?.toISOString(), guests],
    queryFn: () =>
      fetchVenueRooms(venue!._id, {
        checkIn: checkIn?.toISOString(),
        checkOut: checkOut?.toISOString(),
        guests,
      }),
    enabled: !!venue?._id,
  });

  const allImages = useMemo(() => (venue ? getAllImages(venue) : []), [venue]);
  const rooms = useMemo(
    () => rawRooms.filter((room) =>
      !!room?._id &&
      Number.isFinite(room.roomNumber) &&
      typeof room.roomType === 'string' &&
      Number.isFinite(room.pricePerNight) &&
      room.pricePerNight >= 0
    ),
    [rawRooms]
  );

  const minimumRoomPrice = useMemo(() => {
    const prices = rooms
      .filter((room) => room.isActive && room.isReservable)
      .map((room) => room.pricePerNight)
      .filter((price) => Number.isFinite(price) && price > 0);

    return prices.length > 0 ? Math.min(...prices) : undefined;
  }, [rooms]);

  // ── Group rooms by roomType for premium type-level booking UX ──
  const roomTypeGroups = useMemo<RoomTypeGroup[]>(() => {
    const byType = new Map<string, HotelRoom[]>();
    for (const r of rooms) {
      const key = (r.roomType ?? 'STANDARD').toUpperCase();
      const list = byType.get(key) ?? [];
      list.push(r);
      byType.set(key, list);
    }

    const groups: RoomTypeGroup[] = [];
    byType.forEach((roomsOfType, key) => {
      const sorted = [...roomsOfType].sort((a, b) => a.pricePerNight - b.pricePerNight);
      const availableRooms = sorted.filter(
        (r) => r.isReservable && r.status !== 'reserved' && r.status !== 'blocked'
      );
      const representativeRoom = availableRooms[0] ?? sorted[0];

      // Dedup gallery union
      const gallerySet = new Set<string>();
      for (const r of sorted) {
        if (r.coverImage) gallerySet.add(r.coverImage);
        (r.gallery ?? []).forEach((u) => u && gallerySet.add(u));
      }

      // Amenities intersection — keep only amenities present in ALL rooms of the type
      let amenityIntersection: string[] | null = null;
      for (const r of sorted) {
        const s = new Set((r.amenities ?? []).map((a) => a.toLowerCase()));
        amenityIntersection =
          amenityIntersection === null
            ? Array.from(s)
            : amenityIntersection.filter((a) => s.has(a));
      }

      groups.push({
        roomType: key,
        rooms: sorted,
        representativeRoom,
        minPrice: sorted[0]?.pricePerNight ?? 0,
        availableCount: availableRooms.length,
        totalCount: sorted.length,
        combinedGallery: Array.from(gallerySet),
        hasVirtualTour: sorted.some(
          (r) =>
            !!r.hasVirtualTour ||
            !!r.virtualTourUrl ||
            (r.panoramicImages?.length ?? 0) > 0 ||
            (r.tourScenes?.length ?? 0) > 0
        ),
        aggregatedAmenities: amenityIntersection ?? [],
        hasBalcony: sorted.some((r) => !!r.hasBalcony),
        isVip: sorted.some((r) => !!r.isVip),
      });
    });

    // Sorting
    groups.sort((a, b) => {
      if (roomSort === 'capacity')
        return (b.representativeRoom.capacity ?? 0) - (a.representativeRoom.capacity ?? 0);
      if (roomSort === 'surface')
        return (b.representativeRoom.surface ?? 0) - (a.representativeRoom.surface ?? 0);
      return a.minPrice - b.minPrice;
    });

    return groups;
  }, [rooms, roomSort]);

  const nights = checkIn && checkOut ? getRoomNights(checkIn, checkOut) : 1;

  const hasRooms = rooms.length > 0;

  useEffect(() => {
    if (!selectedRoomType) return;
    const selectedGroup = roomTypeGroups.find((group) => group.roomType === selectedRoomType);
    const selectedCapacity = selectedGroup
      ? Math.max(...selectedGroup.rooms.map((room) => room.capacityAdults ?? room.capacity ?? 0))
      : 0;
    if (selectedGroup && selectedGroup.availableCount > 0 && selectedCapacity >= guests) return;

    setSelectedRoomType('');
  }, [roomTypeGroups, guests, selectedRoomType]);

  function handleBookDirect() {
    if (!checkIn || !checkOut || !selectedRoomType) {
      toast.error('Veuillez compléter les dates et choisir une chambre ou une suite.');
      return;
    }

    const eligible = rooms
      .filter((r) =>
        (r.roomType ?? 'STANDARD').toUpperCase() === selectedRoomType &&
        r.isReservable &&
        r.status !== 'reserved' &&
        r.status !== 'blocked' &&
        (r.capacityAdults ?? r.capacity ?? 1) >= guests
      )
      .sort((a, b) => a.pricePerNight - b.pricePerNight);

    if (eligible.length === 0) {
      toast.error('Ce type de chambre est indisponible pour ces dates ou ce nombre de voyageurs.');
      setActiveTab('rooms');
      return;
    }

    setSelectedRoom(eligible[0]);
  }

  // ── Loading ──
  if (venueLoading) {
    return (
      <div className="min-h-screen bg-[#080808]">
        <div className="h-[50vh] min-h-[320px] md:min-h-[460px] md:h-[68vh] animate-pulse bg-white/[0.04]" />
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
          <h2 className="text-xl font-semibold text-neutral-300">Hébergement introuvable</h2>
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
    <div className="min-h-screen bg-[#080808] text-neutral-100 pb-20 lg:pb-0">

      {/* ── Cinematic hero ── */}
      <HotelHero
        venue={venue}
        images={allImages}
        onBack={() => router.back()}
        onOpenGallery={(i) => setLightboxIdx(i)}
        onOpenTour={() => {
          setActiveTab('visite');
          setTimeout(() => {
            document.getElementById('hotel-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }}
      />

      {/* ── Two-column layout ── */}
      <div id="hotel-content" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-4 pb-28 sm:py-6 lg:py-10 lg:pb-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">

          {/* ── Left: Main content (360 leads on mobile) ── */}
          <div className="order-1 space-y-8 lg:order-1 lg:col-span-2">

            {/* ── Tab navigation ── */}
            <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.07] px-4">
              {(
                [
                  { id: 'visite', label: 'Visite 360°' },
                  { id: 'rooms', label: `Chambres / Suites${hasRooms ? ` (${rooms.length})` : ''}` },
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

                  {/* Header: type count + sort */}
                  {!roomsLoading && roomTypeGroups.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-2.5 py-0.5">
                          <Video className="size-3 text-amber-400" />
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                            Visites 360° par chambre
                          </span>
                        </div>
                        <h2 className="font-serif text-xl font-bold text-white sm:text-2xl">
                          {roomTypeGroups.length} type{roomTypeGroups.length > 1 ? 's' : ''} de chambre
                        </h2>
                        <p className="text-[12px] text-neutral-500">
                          La réservation est <strong className="text-amber-300">par type de chambre</strong>, pas par numéro — l&apos;hôtel vous attribue une chambre disponible à votre arrivée.
                        </p>
                      </div>

                    </div>
                  )}

                  {/* Room TYPE groups */}
                  {roomsLoading ? (
                    <div className="grid gap-5 md:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0C0C0C]">
                          <div className="aspect-[4/3] bg-white/[0.04] md:aspect-[16/10]" />
                          <div className="space-y-3 p-5">
                            <div className="h-5 w-2/3 rounded bg-white/[0.05]" />
                            <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                            <div className="h-10 rounded bg-white/[0.04]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : roomTypeGroups.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-14 text-center">
                      <BedDouble className="size-12 text-neutral-700" />
                      <h3 className="text-base font-semibold text-neutral-400">
                        Aucune chambre configurée
                      </h3>
                      <p className="max-w-xs text-sm text-neutral-600">
                        Les chambres de cet hôtel ne sont pas encore configurées.
                        Contactez l&apos;hôtel directement pour connaître les disponibilités.
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      <div className="flex flex-col gap-6">
                        {roomTypeGroups.map((g) => (
                          <RoomTypeCard
                            key={g.roomType}
                            group={g}
                            nights={nights}
                            onView360={(grp) => setViewerGroup(grp)}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  )}
                </motion.div>
              )}

              {/* ── Visite 360° ── */}
              {activeTab === 'visite' && (
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
                      Explorez les espaces de l&apos;hôtel en immersion complète.
                    </p>
                  </div>

                  <div className="relative h-[70vh] min-h-[460px] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30 sm:aspect-video sm:h-auto sm:min-h-0">
                    {venueTour.scenes.length > 0 ? (
                      <PanoramaTourViewer
                        scenes={venueTour.scenes}
                        hotspots={venueTour.hotspots}
                        title={`Visite 360 - ${venue.name}`}
                        className="h-full min-h-0 rounded-none border-0"
                      />
                    ) : venue.immersiveProvider === 'matterport' && venue.immersiveUrl ? (
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
                        allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                        <Video className="size-12 text-neutral-700" />
                        <div>
                          <p className="font-medium text-neutral-300">Visite 360° indisponible</p>
                          <p className="mt-1 text-sm text-neutral-600">
                            L&apos;hôtel n&apos;a pas encore publié sa visite virtuelle.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Aperçu under 360 ── */}
                  {venue.description && (
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                        <Sparkles className="size-3" />
                        Aperçu
                      </div>
                      <div>
                        <h2 className="mb-3 font-serif text-xl font-bold text-white">
                          À propos de l&apos;hôtel
                        </h2>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-400">
                          {venue.description}
                        </p>
                      </div>
                      <div>
                        <h3 className="mb-3 text-sm font-semibold text-neutral-200">
                          Équipements &amp; Services
                        </h3>
                        <HotelAmenitiesGrid
                          amenities={
                            venue.amenities?.length
                              ? venue.amenities
                              : ['Wi-Fi gratuit', 'Parking', 'Climatisation', 'Conciergerie']
                          }
                        />
                      </div>
                    </div>
                  )}
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
                  <VenueGallery images={allImages} venueName={venue.name} />

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

          {/* ── Booking trigger: compact card on desktop ── */}
          <div className="order-2 lg:order-2 lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              {/* Desktop trigger card */}
              <div className="hidden lg:block overflow-hidden rounded-3xl border border-amber-400/[0.18] bg-gradient-to-br from-[#1a1408] via-[#111111] to-[#0B0B0B] shadow-[0_20px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(245,158,11,0.18)]">
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-gradient-to-r from-amber-400/[0.08] to-transparent px-5 py-4">
                  {minimumRoomPrice ? (
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/85">À partir de</span>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="font-serif text-2xl font-black text-amber-400">
                          {minimumRoomPrice.toLocaleString('fr-TN')}
                        </span>
                        <span className="text-xs font-bold text-amber-300/80">DT</span>
                        <span className="text-xs text-neutral-500">/ nuit</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-neutral-300">Réserver votre séjour</span>
                  )}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/[0.10] shadow-[0_0_18px_rgba(245,158,11,0.25)]">
                    <Sparkles className="size-4 text-amber-400" />
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-neutral-500">
                    <CalendarDays className="size-4 text-amber-400/70" />
                    <span>Sélectionnez vos dates</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-500">
                    <Users className="size-4 text-amber-400/70" />
                    <span>{guests} voyageur{guests > 1 ? 's' : ''}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(true)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all hover:-translate-y-0.5 hover:shadow-amber-400/40 active:translate-y-0"
                  >
                    <Sparkles className="size-4" />
                    Réserver maintenant
                  </button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-600">
                    <Shield className="size-3.5 text-emerald-500" />
                    Annulation gratuite
                  </div>
                </div>
              </div>

              {/* Mobile floating bar */}
              <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
                <div className="flex items-center justify-between gap-3 border-t border-amber-400/20 bg-[#0D0D0D]/95 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                  <div className="min-w-0">
                    {minimumRoomPrice ? (
                      <div className="flex items-baseline gap-1">
                        <span className="font-serif text-lg font-black text-amber-400">
                          {minimumRoomPrice.toLocaleString('fr-TN')}
                        </span>
                        <span className="text-xs font-bold text-amber-300/80">DT</span>
                        <span className="text-[10px] text-neutral-500">/nuit</span>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-300">Réserver</span>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-neutral-600">
                      <Shield className="size-3 text-emerald-500" />
                      Annulation gratuite
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(true)}
                    className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-5 text-sm font-bold text-black shadow-lg shadow-amber-400/25 transition-all active:scale-95"
                  >
                    <Sparkles className="size-4" />
                    Réserver
                  </button>
                </div>
              </div>

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
        <h2 className="mb-6 text-lg font-semibold text-neutral-200">Autres hébergements</h2>
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

      {/* ── Reservation booking modal ── */}
      <BookingReservationModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        startingPrice={minimumRoomPrice}
        groups={roomTypeGroups}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        selectedRoomType={selectedRoomType}
        onCheckInChange={setCheckIn}
        onCheckOutChange={setCheckOut}
        onGuestsChange={setGuests}
        onRoomTypeChange={setSelectedRoomType}
        onBook={handleBookDirect}
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
          initialGuests={guests}
        />
      )}

      {/* ── Multi-scene 360° viewer (per room type) ── */}
      <RoomTypeViewer
        group={viewerGroup}
        open={!!viewerGroup}
        onClose={() => setViewerGroup(null)}
      />
    </div>
  );
}
