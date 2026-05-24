'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchVenueByIdOrSlug,
  getVenueAvailabilityStreamUrl,
  fetchVenueTablePlacements,
  fetchVenueReservableUnits,
  fetchVenueCoworkingAddons,
  fetchVenueScenes,
  type PublicTablePlacement,
  type PublicReservableUnit,
  type PublicCoworkingAddon,
  type VirtualScene,
  type VirtualHotspot,
} from '@/lib/api/venues';
import { fetchScenes } from '@/lib/api/scenes';
import { fetchVenueMenu } from '@/lib/api/menu';
import { fetchVenueRooms, fetchRoomScenes, ROOM_TYPE_LABELS } from '@/lib/api/rooms';
import type { HotelRoom } from '@/lib/api/types';
import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import { DetailHeader } from '@/components/detail/DetailHeader';
import { Button } from '@/components/ui/button';
import { TypeBadge } from '@/components/shared/TypeBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VenueGallery } from '@/components/venue/VenueGallery';
import { VenueMap } from '@/components/venue/VenueMap';
import { SimilarVenues } from '@/components/venue/SimilarVenues';
import { ShareButton } from '@/components/venue/ShareButton';
import { useCartStore } from '@/stores/cart';
import {
  Video,
  Eye,
  Users,
  ShoppingCart,
  Lock,
  Phone,
  MapPin,
  Clock,
  Crown,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  BedDouble,
  Bath,
  Maximize2,
  Wifi,
  Image as ImageIcon,
  Star,
  X,
  BriefcaseBusiness,
  UtensilsCrossed,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TablePlacement } from '@/lib/api/types';
import type { Venue } from '@/lib/api/types';
import { StepReservationModal } from '@/components/reservation/StepReservationModal';
import { TablePickerSheet } from '@/components/reservation/TablePickerSheet';
import { getReservationCTA } from '@/lib/reservation-labels';

const RESERVATION_DURATION_MS = 2 * 60 * 60 * 1000;
const HOTEL_ROOMS_PER_PAGE = 4;

const MatterportClientViewer = dynamic(
  () => import('@/components/immersive/MatterportClientViewer'),
  { ssr: false }
);

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

const VirtualTourViewer = dynamic(
  () => import('@/components/immersive/VirtualTourViewer').then((m) => ({ default: m.VirtualTourViewer })),
  { ssr: false }
);

function getVenueImage(venue: { coverImage?: string; media?: { kind: string; url: string }[] }) {
  if (venue.coverImage) return venue.coverImage;
  const hero = venue.media?.find((m) => m.kind === 'HERO_IMAGE');
  return hero?.url ?? null;
}

function isPhotoGalleryMedia(kind?: string) {
  return !kind || kind === 'GALLERY_IMAGE';
}

function getAllImages(venue: Venue): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const add = (url: string | undefined | null) => {
    if (url && !seen.has(url)) { seen.add(url); result.push(url); }
  };
  add(venue.coverImage);
  venue.gallery?.forEach(add);
  venue.media?.filter((m) => isPhotoGalleryMedia(m.kind)).forEach((m) => add(m.url));
  return result;
}

function HotelGalleryRail({ images, venueName }: { images: string[]; venueName: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const safeImages = images.filter(Boolean);

  if (safeImages.length === 0) return null;

  const showPrevious = () => {
    setLightboxIndex((current) => (
      current === null ? 0 : (current - 1 + safeImages.length) % safeImages.length
    ));
  };

  const showNext = () => {
    setLightboxIndex((current) => (
      current === null ? 0 : (current + 1) % safeImages.length
    ));
  };

  return (
    <>
      <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            <ImageIcon className="size-3.5 text-amber-300" />
            Galerie
          </div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
            {safeImages.length}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:max-h-[430px] md:flex-col md:overflow-x-hidden md:overflow-y-auto md:pr-1">
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className={cn(
                'group relative h-24 w-32 flex-none overflow-hidden rounded-xl border bg-zinc-900 transition-all duration-200 md:h-[92px] md:w-full',
                index === 0
                  ? 'border-amber-300/45 shadow-lg shadow-amber-300/10'
                  : 'border-white/[0.08] hover:border-amber-300/35'
              )}
              aria-label={`Voir la photo ${index + 1} de ${venueName}`}
            >
              <Image
                src={image}
                alt={`${venueName} - photo ${index + 1}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 128px, 170px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-80" />
              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white/90">
                {String(index + 1).padStart(2, '0')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Fermer la galerie"
          >
            <X className="size-5" />
          </button>
          {safeImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showPrevious(); }}
                className="absolute left-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
                aria-label="Photo precedente"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showNext(); }}
                className="absolute right-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
                aria-label="Photo suivante"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <div className="relative h-[80vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <Image
              src={safeImages[lightboxIndex]}
              alt={`${venueName} - photo ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Room card (grid item) ───────────────────────────────────────────── */
function RoomCard({
  room,
  onClick,
  availableSameType,
  totalSameType,
}: {
  room: HotelRoom;
  onClick: () => void;
  availableSameType?: number;
  totalSameType?: number;
}) {
  const typeLabel = ROOM_TYPE_LABELS[room.roomType?.toUpperCase() ?? ''] ?? room.roomType ?? 'Chambre';
  const isSuite = ['SUITE', 'JUNIOR_SUITE', 'PRESIDENTIAL_SUITE', 'VILLA', 'PENTHOUSE'].includes(
    room.roomType?.toUpperCase() ?? ''
  );
  const has360 = (room.panoramicImages?.length ?? 0) > 0 || room.hasVirtualTour;

  // Low-stock warning: this room is available AND fewer than 3 of the same type are left.
  const isThisAvailable = room.status === 'available' || !room.status;
  const showLowStock =
    isThisAvailable &&
    typeof availableSameType === 'number' &&
    typeof totalSameType === 'number' &&
    totalSameType > availableSameType &&
    availableSameType > 0 &&
    availableSameType <= 2;
  const isFullyBooked = typeof availableSameType === 'number' && availableSameType === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/30 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-amber-400/5"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-zinc-900 sm:h-56">
        {room.coverImage ? (
          <Image
            src={room.coverImage}
            alt={room.name ?? `Chambre ${room.roomNumber}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BedDouble className="size-10 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm border',
            isSuite
              ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
              : 'bg-black/40 text-white/90 border-white/10'
          )}>
            {isSuite && <Crown className="size-2.5" />}
            {typeLabel}
          </span>
          {has360 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 border border-amber-400/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              <ScanLine className="size-2.5" /> 360°
            </span>
          )}
        </div>
        {/* Price */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="inline-flex items-center rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-amber-300">
            {room.pricePerNight} DT
            <span className="text-white/40 ml-1 font-normal">/nuit</span>
          </span>
        </div>
        {/* Low-stock banner */}
        {showLowStock && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/85 border border-red-300/40 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-white shadow-lg">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              Plus que {availableSameType}
              {availableSameType === 1 ? ' chambre' : ' chambres'} de ce type
            </span>
          </div>
        )}
        {isFullyBooked && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900/90 border border-zinc-700 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-zinc-300">
              Complet sur ces dates
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-4">
        <div className="space-y-2">
        <div>
          <p className="text-base font-bold leading-snug text-white">
            {room.name ?? `Chambre ${room.roomNumber}`}
          </p>
          {room.roomNumber && <p className="text-[10px] text-zinc-500 mt-0.5">N° {room.roomNumber}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><Users className="size-3" /> {room.capacityAdults ?? room.capacity ?? 2} pers.</span>
          {room.surface && <span className="flex items-center gap-1"><Maximize2 className="size-3" /> {room.surface} m²</span>}
          {room.bedType && <span className="flex items-center gap-1"><BedDouble className="size-3" /> {room.bedType}</span>}
        </div>
        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities.slice(0, 3).map((a) => (
              <span key={a} className="rounded-full bg-white/[0.06] border border-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400 capitalize">
                {a}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-500">
                +{room.amenities.length - 3}
              </span>
            )}
          </div>
        )}
        </div>
        <p className="inline-flex min-h-9 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 px-3 text-xs font-bold text-amber-200 transition-colors group-hover:border-amber-300/35 group-hover:bg-amber-300/15">
          Voir la chambre →
        </p>
      </div>
    </button>
  );
}

/* ── Room detail view (after clicking a card) ────────────────────────── */
function RoomDetailView({
  room, tourScenes, tourHotspots, sceneIdx, onSceneIdxChange, onBack,
}: {
  room: HotelRoom;
  tourScenes: VirtualScene[];
  tourHotspots: VirtualHotspot[];
  sceneIdx: number;
  onSceneIdxChange: (i: number) => void;
  onBack: () => void;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const onGalleryOpen = (i: number) => setLightbox(i);
  const typeLabel = ROOM_TYPE_LABELS[room.roomType?.toUpperCase() ?? ''] ?? room.roomType ?? 'Chambre';
  const isSuite = ['SUITE', 'JUNIOR_SUITE', 'PRESIDENTIAL_SUITE', 'VILLA', 'PENTHOUSE'].includes(
    room.roomType?.toUpperCase() ?? ''
  );

  // Build unified 360° scene list: virtual tour scenes first, then panoramic images
  const immersiveScenes: { id: string; name: string; image: string }[] =
    tourScenes.length > 0
      ? tourScenes.map((s) => ({ id: s._id, name: s.name, image: s.image }))
      : (room.panoramicImages ?? []).map((url, i) => ({
          id: `pano-${i}`,
          name: `Vue ${i + 1}`,
          image: url,
        }));

  const currentScene = immersiveScenes[sceneIdx] ?? immersiveScenes[0];

  // Navigation hotspots for current scene
  const activeHotspots = tourHotspots.filter((h) => currentScene && h.virtualTourId === currentScene.id);
  const psvNavHotspots = activeHotspots
    .map((h) => {
      const target = immersiveScenes.find((s) => s.id === h.targetId);
      if (!target) return null;
      return {
        id: h._id,
        yaw: (h.xPercent / 100 - 0.5) * 2 * Math.PI,
        pitch: -(h.yPercent / 100 - 0.5) * Math.PI,
        label: target.name,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="group inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-400 transition-colors"
      >
        <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Toutes les chambres
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: 360° viewer */}
        <div className="space-y-3">
          {immersiveScenes.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ScanLine className="size-4 text-amber-400" /> Vue 360°
                </h3>
                {immersiveScenes.length > 1 && (
                  <span className="text-xs text-zinc-400">
                    {sceneIdx + 1} / {immersiveScenes.length}
                  </span>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-950 shadow-xl">
                {/* Panorama */}
                <div className="relative w-full" style={{ paddingBottom: '50%' }}>
                  <div className="absolute inset-0">
                    <PanoramaEngineClient
                      imageUrl={currentScene.image}
                      markers={[]}
                      mode="navigate"
                      navHotspots={psvNavHotspots}
                      onNavHotspotClick={(id) => {
                        const h = activeHotspots.find((x) => x._id === id);
                        if (!h) return;
                        const idx = immersiveScenes.findIndex((s) => s.id === h.targetId);
                        if (idx !== -1) onSceneIdxChange(idx);
                      }}
                    />
                  </div>
                  {/* Scene label */}
                  <div className="absolute top-3 left-3 z-20 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                      <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                      {immersiveScenes.length > 1
                        ? `Scène ${sceneIdx + 1} / ${immersiveScenes.length}`
                        : 'Vue 360°'}
                    </span>
                  </div>
                  {/* Arrows */}
                  {sceneIdx > 0 && (
                    <button type="button" onClick={() => onSceneIdxChange(sceneIdx - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all">
                      <ChevronLeft className="size-4" />
                    </button>
                  )}
                  {sceneIdx < immersiveScenes.length - 1 && (
                    <button type="button" onClick={() => onSceneIdxChange(sceneIdx + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all">
                      <ChevronRight className="size-4" />
                    </button>
                  )}
                  {/* Progress bar */}
                  {immersiveScenes.length > 1 && (
                    <div className="absolute bottom-0 inset-x-0 z-20 h-0.5 bg-zinc-800/60">
                      <div className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${((sceneIdx + 1) / immersiveScenes.length) * 100}%` }} />
                    </div>
                  )}
                </div>
                {/* Thumbnail strip */}
                {immersiveScenes.length > 1 && (
                  <div className="bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800/60">
                    <div className="flex gap-2 p-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                      {immersiveScenes.map((s, idx) => {
                        const isActive = idx === sceneIdx;
                        return (
                          <button key={s.id} type="button" onClick={() => onSceneIdxChange(idx)}
                            className={cn(
                              'relative shrink-0 h-[52px] w-[78px] rounded-lg overflow-hidden border-2 transition-all',
                              isActive ? 'border-amber-400 shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'border-transparent opacity-50 hover:opacity-80 hover:border-zinc-600'
                            )}>
                            <Image src={s.image} alt={s.name} fill className="object-cover" sizes="78px" />
                            {isActive && <div className="absolute inset-0 bg-amber-400/10" />}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pb-0.5 pt-2 px-1">
                              <p className="text-[8px] text-white font-medium truncate text-center">{s.name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* Gallery (always shown when available, alongside 360°) */}
          {room.gallery?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="size-4 text-amber-400" /> Galerie photo
                </h3>
                <span className="text-xs text-zinc-400">{room.gallery.length} photo{room.gallery.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {room.gallery.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onGalleryOpen(i)}
                    className={cn(
                      'relative rounded-xl overflow-hidden bg-zinc-900 group',
                      i === 0 && room.gallery.length > 1 ? 'col-span-2 sm:col-span-3 h-56' : 'h-28',
                    )}
                  >
                    <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 33vw" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {immersiveScenes.length === 0 && !(room.gallery?.length > 0) && (
            <div className="flex flex-col items-center justify-center gap-2 h-48 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500">
              <ImageIcon className="size-7 opacity-50" />
              <p className="text-xs">Aucune photo ou vue 360° pour cette chambre.</p>
            </div>
          )}
        </div>

        {/* Right: room info */}
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border',
                isSuite ? 'bg-amber-400/15 text-amber-300 border-amber-400/25' : 'bg-white/[0.06] text-zinc-300 border-white/[0.08]'
              )}>
                {isSuite && <Crown className="size-3" />}
                {typeLabel}
              </span>
              {room.status === 'available' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Disponible
                </span>
              ) : room.status === 'reserved' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  Réservée
                </span>
              ) : null}
            </div>
            <h2 className="text-xl font-bold text-white">{room.name ?? `Chambre ${room.roomNumber}`}</h2>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {room.pricePerNight} DT <span className="text-sm font-normal text-zinc-400">/ nuit</span>
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Users, label: `${room.capacityAdults ?? room.capacity ?? 2} adultes` },
              ...(room.surface ? [{ icon: Maximize2, label: `${room.surface} m²` }] : []),
              ...(room.bedType ? [{ icon: BedDouble, label: room.bedType }] : []),
              ...(room.bathroomType ? [{ icon: Bath, label: room.bathroomType }] : []),
              ...(room.floor != null ? [{ icon: Star, label: `Étage ${room.floor}` }] : []),
              ...(room.view ? [{ icon: Eye, label: room.view }] : []),
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                <Icon className="size-3.5 text-amber-400/70 shrink-0" />
                <span className="text-xs text-zinc-300 truncate">{label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {room.description && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Description</h4>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{room.description}</p>
            </div>
          )}

          {/* Amenities */}
          {room.amenities?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Équipements</h4>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/[0.07] px-2.5 py-1 text-xs text-zinc-300 capitalize">
                    <Wifi className="size-2.5 text-zinc-500" />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reserve CTA */}
          <button
            type="button"
            className="w-full rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold py-3.5 text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-400/20"
          >
            Réserver cette chambre
          </button>
        </div>
      </div>

      {/* Gallery lightbox */}
      {lightbox !== null && room.gallery?.[lightbox] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
          {lightbox > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Précédent"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {lightbox < room.gallery.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Suivant"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
          <div className="relative max-h-[88vh] max-w-5xl w-full aspect-[16/10]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={room.gallery[lightbox]}
              alt={`Photo ${lightbox + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
          <div className="absolute bottom-4 inset-x-0 flex justify-center">
            <span className="rounded-full bg-black/60 border border-white/10 px-3 py-1 text-xs text-white">
              {lightbox + 1} / {room.gallery.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Thin PanoramaEngine wrapper (SSR-safe) ──────────────────────────── */
const PanoramaEngineClient = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

/* ── Hotel immersive hero ────────────────────────────────────────────── */
function HotelPhotoHero({
  hotelName,
  hotelCity,
  hotelAddress,
  imageUrl,
  isPrestige,
  roomCount,
  has360,
  onBack,
}: {
  hotelName: string;
  hotelCity?: string;
  hotelAddress?: string;
  imageUrl: string | null;
  isPrestige?: boolean;
  roomCount: number;
  has360: boolean;
  onBack: () => void;
}) {
  return (
    <section className="relative min-h-[190px] overflow-hidden bg-zinc-950 sm:min-h-[220px] md:min-h-[250px]">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={hotelName}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          quality={95}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <BedDouble className="size-16 text-zinc-700" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/15 to-black/88" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/35" />

      <div className="relative z-10 flex min-h-[190px] flex-col justify-between px-4 pb-4 pt-3 sm:min-h-[220px] md:min-h-[250px] md:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-md outline-none transition-all duration-200 hover:border-amber-300/45 hover:bg-amber-300/10 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300/70"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Retour
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            {isPrestige && (
              <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-200 backdrop-blur-md">
                <Crown className="size-3.5" />
                Prestige
              </span>
            )}
            {has360 && (
              <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-md">
                <ScanLine className="size-3.5 text-amber-300" />
                360° disponible
              </span>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:hidden">
              {isPrestige && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-200 backdrop-blur-md">
                  <Crown className="size-3" />
                  Prestige
                </span>
              )}
              {has360 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md">
                  <ScanLine className="size-3 text-amber-300" />
                  360° disponible
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black leading-tight tracking-tight text-white drop-shadow-lg sm:text-3xl lg:text-4xl">
              {hotelName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-white/75 sm:text-sm">
              {hotelCity && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-amber-300" />
                  {[hotelCity, hotelAddress].filter(Boolean).join(' · ')}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 backdrop-blur-md">
                <BedDouble className="size-4 text-amber-300" />
                {roomCount} chambre{roomCount !== 1 ? 's' : ''} & suites
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HotelImmersiveHero({
  rooms, hotelName, hotelCity, idx, currentImageUrl, onIdxChange, onRoomClick, onBack,
}: {
  rooms: HotelRoom[];
  hotelName: string;
  hotelCity?: string;
  idx: number;
  currentImageUrl: string;
  onIdxChange: (i: number) => void;
  onRoomClick: (room: HotelRoom) => void;
  onBack: () => void;
}) {
  const room = rooms[idx];
  if (!room) return null;

  const imageUrl = currentImageUrl;
  const typeLabel = ROOM_TYPE_LABELS[room.roomType?.toUpperCase() ?? ''] ?? room.roomType ?? 'Chambre';
  const isSuite = ['SUITE', 'JUNIOR_SUITE', 'PRESIDENTIAL_SUITE', 'VILLA', 'PENTHOUSE'].includes(
    room.roomType?.toUpperCase() ?? ''
  );

  return (
    <div className="relative w-full overflow-hidden bg-zinc-950" style={{ height: '100svh', maxHeight: 860, minHeight: 520 }}>
      {/* 360° panorama */}
      <div className="absolute inset-0">
        {imageUrl ? (
          <PanoramaEngineClient imageUrl={imageUrl} markers={[]} mode="navigate" />
        ) : room.coverImage ? (
          <Image src={room.coverImage} alt={room.name ?? 'Chambre'} fill className="object-cover" sizes="100vw" priority />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BedDouble className="size-16 text-zinc-700" />
          </div>
        )}
      </div>

      {/* Gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent via-40% to-black/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <button
          type="button"
          onClick={onBack}
          className="group flex items-center gap-2 rounded-full border border-white/15 bg-black/30 backdrop-blur-md px-4 py-2 text-sm font-medium text-white/80 hover:border-amber-400/40 hover:text-amber-400 transition-all"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Retour
        </button>
        <div className="flex-1 text-center min-w-0">
          <p className="text-white font-bold text-base sm:text-lg truncate drop-shadow-md">{hotelName}</p>
          {hotelCity && <p className="text-zinc-400 text-xs mt-0.5">{hotelCity}</p>}
        </div>
        {/* 360° badge */}
        {imageUrl && (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-black/40 border border-amber-400/35 backdrop-blur-sm px-3 py-1.5 text-[11px] font-bold text-amber-400">
            <ScanLine className="size-3" /> 360°
          </span>
        )}
      </div>

      {/* Drag hint */}
      {imageUrl && (
        <div className="absolute top-[70px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 border border-white/10 backdrop-blur-sm px-3 py-1 text-[10px] font-medium text-white/60">
            Glissez pour explorer
          </span>
        </div>
      )}

      {/* Prev arrow */}
      {idx > 0 && (
        <button
          type="button"
          aria-label="Chambre précédente"
          onClick={() => onIdxChange(idx - 1)}
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 size-11 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/40 transition-all duration-150 shadow-lg"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* Next arrow */}
      {idx < rooms.length - 1 && (
        <button
          type="button"
          aria-label="Chambre suivante"
          onClick={() => onIdxChange(idx + 1)}
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 size-11 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/40 transition-all duration-150 shadow-lg"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 inset-x-0 z-20 px-4 sm:px-6 pb-6 sm:pb-8">
        {/* Room dots */}
        {rooms.length > 1 && (
          <div className="flex justify-center gap-1.5 mb-4">
            {rooms.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Chambre ${i + 1}`}
                onClick={() => onIdxChange(i)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === idx
                    ? 'w-7 h-1.5 bg-amber-400'
                    : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/60'
                )}
              />
            ))}
          </div>
        )}

        {/* Room info card */}
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl bg-black/45 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border',
                    isSuite
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                      : 'bg-white/10 text-white/80 border-white/10'
                  )}>
                    {isSuite && <Crown className="size-2.5" />}
                    {typeLabel}
                  </span>
                  {room.status === 'available' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Disponible
                    </span>
                  )}
                </div>
                {/* Name */}
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {room.name ?? `Chambre ${room.roomNumber}`}
                </h2>
                {/* Quick stats */}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-300 flex-wrap">
                  <span className="flex items-center gap-1"><Users className="size-3 text-zinc-400" />{room.capacityAdults ?? room.capacity ?? 2} pers.</span>
                  {room.surface && <span className="flex items-center gap-1"><Maximize2 className="size-3 text-zinc-400" />{room.surface} m²</span>}
                  {room.bedType && <span className="flex items-center gap-1"><BedDouble className="size-3 text-zinc-400" />{room.bedType}</span>}
                </div>
              </div>

              {/* Price */}
              <div className="shrink-0 text-right">
                <p className="text-2xl font-black text-amber-400 leading-none">{room.pricePerNight}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">DT / nuit</p>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => onRoomClick(room)}
              className="mt-4 w-full rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-bold py-3 text-sm transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2"
            >
              Explorer cette chambre
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VenueDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const slug = params.slug as string;
  const addItem = useCartStore((s) => s.addItem);
  const [activeTablePlacement, setActiveTablePlacement] = useState<TablePlacement | null>(null);
  const [selectedTable, setSelectedTable] = useState<PublicTablePlacement | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeImmersiveSceneIdx, setActiveImmersiveSceneIdx] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
  const [roomSceneIdx, setRoomSceneIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [roomsPage, setRoomsPage] = useState(1);
  const [coworkingDate, setCoworkingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [coworkingTime, setCoworkingTime] = useState('09:00');
  const [coworkingDurationType, setCoworkingDurationType] = useState<'hourly' | 'half_day' | 'full_day'>('hourly');
  const [coworkingHours, setCoworkingHours] = useState(2);
  const [coworkingPartySize, setCoworkingPartySize] = useState(1);
  const [coworkingAddonQty, setCoworkingAddonQty] = useState<Record<string, number>>({});

  const [selectedSlotStartAt] = useState(() =>
    new Date(Date.now() + RESERVATION_DURATION_MS).toISOString()
  );
  const selectedSlotEndAt = useMemo(
    () => new Date(new Date(selectedSlotStartAt).getTime() + RESERVATION_DURATION_MS).toISOString(),
    [selectedSlotStartAt]
  );

  const { data: venue, isLoading, error, refetch } = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => fetchVenueByIdOrSlug(slug),
    enabled: !!slug,
  });

  const isMatterport =
    venue?.immersiveProvider === 'matterport' &&
    venue?.immersiveSourceType === 'url' &&
    !!venue?.immersiveUrl;

  const { data: allPlacements = [] } = useQuery({
    queryKey: ['venue-placements', venue?._id, selectedSlotStartAt, selectedSlotEndAt],
    queryFn: () =>
      fetchVenueTablePlacements(venue!._id, {
        startAt: selectedSlotStartAt,
        endAt: selectedSlotEndAt,
      }),
    enabled: !!venue?._id,
  });

  const { data: scenes = [] } = useQuery({
    queryKey: ['venue-scenes', venue?._id],
    queryFn: () => fetchScenes(venue!._id),
    enabled: !!venue?._id,
  });

  const { data: tourData } = useQuery({
    queryKey: ['venue-tour', venue?._id],
    queryFn: () => fetchVenueScenes(venue!._id),
    enabled: !!venue?._id,
  });
  const tourScenes = tourData?.scenes ?? [];
  const tourHotspots = tourData?.hotspots ?? [];

  const isHotelVenue = (venue as any)?.type === 'HOTEL';
  const isCoworkingVenue = (venue as any)?.type === 'COWORKING';
  const isTableVenue = ['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'].includes(String((venue as any)?.type || ''));

  const { data: hotelRooms = [] } = useQuery({
    queryKey: ['public-hotel-rooms', venue?._id],
    queryFn: () => fetchVenueRooms(venue!._id),
    enabled: !!venue?._id && isHotelVenue,
  });

  const { data: roomTourData } = useQuery({
    queryKey: ['public-room-scenes', selectedRoom?._id],
    queryFn: () => fetchRoomScenes(selectedRoom!.venueId, selectedRoom!._id),
    enabled: !!selectedRoom?._id,
  });

  const { data: coworkingUnits = [] } = useQuery({
    queryKey: ['venue-coworking-units', venue?._id],
    queryFn: () => fetchVenueReservableUnits(venue!._id),
    enabled: !!venue?._id && isCoworkingVenue,
  });

  const { data: coworkingAddons = [] } = useQuery({
    queryKey: ['venue-coworking-addons', venue?._id],
    queryFn: () => fetchVenueCoworkingAddons(venue!._id),
    enabled: !!venue?._id && isCoworkingVenue,
  });

  const { data: venueMenuItems = [] } = useQuery({
    queryKey: ['venue-menu-public', venue?._id],
    queryFn: () => fetchVenueMenu(venue!._id),
    enabled: !!venue?._id && isTableVenue,
  });

  // Auto-select first scene
  const effectiveSceneId = activeSceneId ?? (scenes[0]?._id ?? null);

  // Filter placements to active scene (if scenes exist)
  const scenePlacements =
    scenes.length > 0 && effectiveSceneId
      ? allPlacements.filter((p) => !p.sceneId || p.sceneId === effectiveSceneId)
      : allPlacements;

  useEffect(() => {
    if (!venue?._id) return;
    const source = new EventSource(getVenueAvailabilityStreamUrl(venue._id));
    source.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ['venue-placements', venue._id] });
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [venue?._id, queryClient]);

  useEffect(() => {
    setRoomsPage(1);
  }, [venue?._id, hotelRooms.length]);

  // Coworking date/time derivations — hooks must run unconditionally,
  // before any early return below (Rules of Hooks).
  const coworkingStartAt = useMemo(
    () => new Date(`${coworkingDate}T${coworkingTime}:00`).toISOString(),
    [coworkingDate, coworkingTime]
  );
  const coworkingEffectiveHours =
    coworkingDurationType === 'half_day'
      ? 4
      : coworkingDurationType === 'full_day'
        ? 8
        : Math.max(1, coworkingHours);
  const coworkingEndAt = useMemo(
    () => new Date(new Date(coworkingStartAt).getTime() + coworkingEffectiveHours * 60 * 60 * 1000).toISOString(),
    [coworkingStartAt, coworkingEffectiveHours]
  );

  if (!slug) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Identifiant manquant.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/explorer">Explorer</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <DetailPageSkeleton />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <ErrorState
          title="Lieu introuvable"
          message="Ce lieu n'existe pas ou a été déplacé."
          onRetry={() => refetch()}
        />
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/explorer">Explorer les lieux</Link>
        </Button>
      </div>
    );
  }

  const img = getVenueImage(venue);
  const allImages = getAllImages(venue);
  const roomPageCount = Math.max(1, Math.ceil(hotelRooms.length / HOTEL_ROOMS_PER_PAGE));
  const safeRoomsPage = Math.min(roomsPage, roomPageCount);
  const visibleHotelRooms = hotelRooms.slice(
    (safeRoomsPage - 1) * HOTEL_ROOMS_PER_PAGE,
    safeRoomsPage * HOTEL_ROOMS_PER_PAGE
  );

  // Per-room-type availability counts (used by RoomCard for "Only N left" warning)
  const roomTypeAvailability = hotelRooms.reduce<Record<string, { available: number; total: number }>>(
    (acc, r) => {
      const key = (r.roomType ?? 'OTHER').toUpperCase();
      if (!acc[key]) acc[key] = { available: 0, total: 0 };
      acc[key].total += 1;
      if (r.status === 'available' || !r.status) acc[key].available += 1;
      return acc;
    },
    {},
  );

  const showHotelHero = isHotelVenue && hotelRooms.length > 0;

  const hasNewImmersive =
    !!venue.immersiveType &&
    venue.immersiveType !== 'none' &&
    ((venue.immersiveSourceType === 'url' && !!venue.immersiveUrl) ||
      (venue.immersiveSourceType === 'upload' && !!venue.immersiveFile));
  const hasTour360 = tourScenes.length > 0;
  const hasAnyImmersive = hasTour360 || hasNewImmersive;

  // Build unified scene list: tour scenes first, then single panoramic file
  const immersiveSceneList = tourScenes.length > 0
    ? tourScenes.map((s) => ({ id: s._id, name: s.name, image: s.image, description: s.description }))
    : scenes.length > 0 && scenes[0]?.image
      ? scenes.map((s) => ({ id: s._id, name: s.name, image: s.image ?? '' }))
      : venue.immersiveFile
        ? [{ id: '__single__', name: venue.name ?? 'Vue 360°', image: venue.immersiveFile }]
        : [];

  const currentImmersiveScene = immersiveSceneList[activeImmersiveSceneIdx] ?? immersiveSceneList[0];

  const coworkingAddonsSelected = coworkingAddons
    .filter((a) => (coworkingAddonQty[a.key] ?? 0) > 0)
    .map((a) => ({
      key: a.key,
      name: a.name,
      quantity: coworkingAddonQty[a.key],
      unitPrice: a.unitPrice,
    }));
  const coworkingAddonsTotal = coworkingAddonsSelected.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);

  const tabsDefaultValue =
    isHotelVenue ? 'apercu' : isCoworkingVenue ? 'coworking' : hasAnyImmersive ? 'visite360' : 'apercu';
  const hasTablePlacements = allPlacements.length > 0;
  const tableGalleryImages = allImages.slice(0, 8);
  const menuPreviewItems = venueMenuItems
    .filter((item) => item.isAvailable)
    .sort((a, b) => Number(b.isPopular) - Number(a.isPopular))
    .slice(0, 6);

  const panoramaMarkers = scenePlacements
    .filter((p) => p.positionType === 'yaw_pitch' && p.yaw != null && p.pitch != null)
    .map((p) => ({
      placement: {
        _id: p._id, venueId: p.venueId, tableId: p.tableId, sceneId: p.sceneId,
        positionType: p.positionType as 'yaw_pitch', yaw: p.yaw, pitch: p.pitch,
        createdAt: '', updatedAt: '',
      },
      table: p.table ? {
        _id: p.table._id, venueId: p.venueId, tableNumber: p.table.tableNumber,
        name: p.table.name, capacity: p.table.capacity, locationLabel: p.table.locationLabel || '',
        price: p.table.price, minimumSpend: p.table.minimumSpend, defaultStatus: p.table.status,
        isVip: p.table.isVip, isActive: true,
      } : undefined,
    }));

  const panoAvailableCount = scenePlacements.filter((p) => p.table.status === 'available').length;
  const panoReservedCount = scenePlacements.filter((p) => p.table.status !== 'available').length;

  // Navigation hotspots for the current scene, converted from xPercent/yPercent → yaw/pitch
  const activeNavHotspots = tourHotspots.filter(
    (h) => currentImmersiveScene && h.virtualTourId === currentImmersiveScene.id
  );
  const psvNavHotspots = activeNavHotspots
    .map((h) => {
      const target = immersiveSceneList.find((s) => s.id === h.targetId);
      if (!target) return null;
      return {
        id: h._id,
        yaw: (h.xPercent / 100 - 0.5) * 2 * Math.PI,
        pitch: -(h.yPercent / 100 - 0.5) * Math.PI,
        label: target.name,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);
  const hasReservableTables =
    hasTablePlacements ||
    ((venue.tables as Array<unknown> | undefined)?.length ?? 0) > 0;

  const handleTablePlacementAddToCart = (placement: TablePlacement) => {
    const table = (
      venue.tables as { _id: string; tableNumber?: number; name?: string }[] | undefined
    )?.find((t) => t._id === placement.tableId);
    const label = table ? `Table ${table.tableNumber ?? table.name ?? ''}`.trim() : 'Table';
    addItem({
      id: `venue-${venue._id}-table-${placement.tableId}-${Date.now()}`,
      type: venue.type === 'HOTEL' ? 'venue_room' : 'venue_table',
      title: venue.name,
      imageUrl: img ?? undefined,
      unitLabel: label,
      unitType: venue.type,
      dateTime: selectedSlotStartAt,
      price: venue.startingPrice ?? 0,
      quantity: 1,
      venueId: venue._id,
      slug: venue.slug,
    });
    toast.success(`${label} ajoutée au panier`);
  };

  const handleImmersiveTableSelect = (placement: PublicTablePlacement) => {
    setSelectedTable(placement);
  };

  const handleCoworkingAddToCart = (unit: PublicReservableUnit) => {
    const base = Number((unit as any).basePrice || 0);
    const total = base * coworkingEffectiveHours + coworkingAddonsTotal;
    addItem({
      id: `venue-${venue._id}-coworking-${unit._id}-${Date.now()}`,
      type: 'venue_coworking',
      title: venue.name,
      imageUrl: img ?? undefined,
      unitLabel: unit.label,
      unitType: venue.type,
      dateTime: coworkingStartAt,
      endAt: coworkingEndAt,
      price: total,
      quantity: coworkingPartySize,
      venueId: venue._id,
      reservableUnitId: unit._id,
      slug: venue.slug,
      coworkingDurationType,
      coworkingHours: coworkingEffectiveHours,
      coworkingAddons: coworkingAddonsSelected,
      coworkingAddonsTotal,
    });
    toast.success(`${unit.label} ajouté au panier`);
  };


  const firstTour = venue.virtualTours?.[0];
  const tablePlacements = (venue.tablePlacements || []).filter(
    (p: TablePlacement) => p.virtualTourId === firstTour?._id
  ) as TablePlacement[];

  return (
    <div className="min-h-screen">
      {showHotelHero ? (
        <HotelPhotoHero
          hotelName={venue.name}
          hotelCity={venue.city}
          hotelAddress={venue.address}
          imageUrl={img}
          isPrestige={venue.isVedette}
          roomCount={hotelRooms.length}
          has360={hasAnyImmersive || hotelRooms.some((room) => room.hasVirtualTour || (room.panoramicImages?.length ?? 0) > 0)}
          onBack={() => router.back()}
        />
      ) : (
        <>
          {/* Back button */}
          <div className="mx-auto max-w-5xl px-4 pt-4">
            <button
              onClick={() => router.back()}
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-200 hover:border-amber-400/40 hover:bg-amber-400/[0.08] hover:text-amber-400 hover:shadow-lg hover:shadow-amber-400/10"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Retour
            </button>
          </div>

          {/* Hero header */}
          <div className="relative">
            <DetailHeader
              title={venue.name}
              subtitle={[venue.city, venue.address].filter(Boolean).join(' — ')}
              imageUrl={img}
              imageAlt={venue.name}
              badges={
                <>
                  <TypeBadge type={venue.type} />
                  {venue.immersiveType === 'virtual-tour' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-black/30 px-2 py-0.5 text-xs font-medium text-white">
                      <Video className="size-3" /> Visite virtuelle
                    </span>
                  )}
                  {venue.immersiveType === 'view-360' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-black/30 px-2 py-0.5 text-xs font-medium text-white">
                      <Eye className="size-3" /> Vue 360°
                    </span>
                  )}
                </>
              }
              metaRight={
                <div className="flex flex-col items-end gap-2">
                  <ShareButton title={venue.name} />
                </div>
              }
            />
          </div>
        </>
      )}

      <div className="mx-auto max-w-7xl px-4 py-4">
        {isHotelVenue ? (
          <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0B0B0B] shadow-2xl shadow-black/35">
            <div className="border-b border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300/80">Détails de l'hôtel</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                    Chambres & Suites
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300">
                    <BedDouble className="size-3.5 text-amber-300" />
                    {hotelRooms.length} chambre{hotelRooms.length !== 1 ? 's' : ''}
                  </span>
                  {venue.phone && (
                    <a
                      href={`tel:${venue.phone}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-300/15"
                    >
                      <Phone className="size-3.5" />
                      Appeler
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <BedDouble className="size-3.5 text-amber-300" />
                    Hébergement
                  </div>
                  <p className="mt-2 text-xl font-black text-white">{hotelRooms.length}</p>
                  <p className="text-xs text-zinc-500">chambre{hotelRooms.length !== 1 ? 's' : ''} et suites</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <Star className="size-3.5 text-amber-300" />
                    À partir de
                  </div>
                  <p className="mt-2 text-xl font-black text-white">
                    {venue.startingPrice ?? venue.priceRangeMin ?? '-'} <span className="text-sm text-zinc-500">DT</span>
                  </p>
                  <p className="text-xs text-zinc-500">par nuit selon disponibilité</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <ScanLine className="size-3.5 text-amber-300" />
                    Expérience
                  </div>
                  <p className="mt-2 text-xl font-black text-white">
                    {hasAnyImmersive || hotelRooms.some((room) => room.hasVirtualTour || (room.panoramicImages?.length ?? 0) > 0) ? '360°' : 'Photo'}
                  </p>
                  <p className="text-xs text-zinc-500">aperçus visuels disponibles</p>
                </div>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-8 p-5 sm:p-6">
                <section className="space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10">
                        <BedDouble className="size-4 text-amber-300" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Chambres & Suites</h3>
                        <p className="text-sm text-zinc-500">Galerie, détails et expériences 360° par chambre.</p>
                      </div>
                    </div>
                    <span className="inline-flex min-h-9 items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                      {hotelRooms.length} disponible{hotelRooms.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'grid gap-5',
                      !selectedRoom && allImages.length > 1 && 'xl:grid-cols-[210px_minmax(0,1fr)]'
                    )}
                  >
                    {!selectedRoom && allImages.length > 1 && (
                      <div className="xl:sticky xl:top-24 xl:self-start">
                        <HotelGalleryRail images={allImages} venueName={venue.name} />
                      </div>
                    )}

                    {selectedRoom ? (
                      <RoomDetailView
                        room={selectedRoom}
                        tourScenes={roomTourData?.scenes ?? []}
                        tourHotspots={roomTourData?.hotspots ?? []}
                        sceneIdx={roomSceneIdx}
                        onSceneIdxChange={setRoomSceneIdx}
                        onBack={() => { setSelectedRoom(null); setRoomSceneIdx(0); }}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {visibleHotelRooms.map((room) => {
                            const typeKey = (room.roomType ?? 'OTHER').toUpperCase();
                            const stats = roomTypeAvailability[typeKey];
                            return (
                              <RoomCard
                                key={room._id}
                                room={room}
                                availableSameType={stats?.available}
                                totalSameType={stats?.total}
                                onClick={() => router.push(`/lieu/${venue.slug ?? slug}/chambre/${room._id}`)}
                              />
                            );
                          })}
                        </div>

                        {roomPageCount > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/25 px-3 py-2">
                            <p className="text-xs font-medium text-zinc-500">
                              Page {safeRoomsPage} / {roomPageCount}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setRoomsPage((page) => Math.max(1, page - 1))}
                                disabled={safeRoomsPage === 1}
                                className="inline-flex size-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white transition hover:border-amber-300/30 hover:text-amber-200 disabled:pointer-events-none disabled:opacity-40"
                                aria-label="Chambres precedentes"
                              >
                                <ChevronLeft className="size-4" />
                              </button>
                              {Array.from({ length: roomPageCount }, (_, index) => index + 1).map((page) => (
                                <button
                                  key={page}
                                  type="button"
                                  onClick={() => setRoomsPage(page)}
                                  className={cn(
                                    'inline-flex size-10 items-center justify-center rounded-full border text-xs font-bold transition',
                                    page === safeRoomsPage
                                      ? 'border-amber-300/40 bg-amber-300 text-black'
                                      : 'border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:border-amber-300/30 hover:text-amber-200'
                                  )}
                                  aria-label={`Page ${page} des chambres`}
                                >
                                  {page}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setRoomsPage((page) => Math.min(roomPageCount, page + 1))}
                                disabled={safeRoomsPage === roomPageCount}
                                className="inline-flex size-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white transition hover:border-amber-300/30 hover:text-amber-200 disabled:pointer-events-none disabled:opacity-40"
                                aria-label="Chambres suivantes"
                              >
                                <ChevronRight className="size-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

              </div>

              <aside className="border-t border-white/[0.07] bg-white/[0.025] p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="sticky top-24 space-y-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10">
                        <MapPin className="size-4 text-amber-300" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Infos pratiques</h3>
                        <p className="text-sm text-zinc-500">Contact et localisation.</p>
                      </div>
                    </div>
                  </div>

                  {venue.description && (
                    <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                      <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-zinc-200">
                        <Eye className="size-3.5 text-amber-300" />
                        Aperçu
                      </h4>
                      <p className="text-sm leading-6 text-zinc-500">
                        {venue.description}
                      </p>
                    </div>
                  )}

                  <dl className="space-y-3 text-sm">
                    {venue.address && (
                      <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                        <dt className="mb-1.5 flex items-center gap-1.5 font-semibold text-zinc-200">
                          <MapPin className="size-3.5 text-amber-300" />
                          Adresse
                        </dt>
                        <dd className="pl-5 leading-6 text-zinc-500">
                          {venue.address}, {venue.city}
                        </dd>
                      </div>
                    )}
                    {venue.phone && (
                      <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                        <dt className="mb-1.5 flex items-center gap-1.5 font-semibold text-zinc-200">
                          <Phone className="size-3.5 text-amber-300" />
                          Téléphone
                        </dt>
                        <dd className="pl-5">
                          <a href={`tel:${venue.phone}`} className="font-semibold text-amber-300 hover:underline">
                            {venue.phone}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>

                  {venue.address && venue.city && (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                      <VenueMap address={venue.address} city={venue.city} />
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </section>
        ) : (
        <Tabs value={activeTab ?? tabsDefaultValue} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <TabsTrigger value="apercu" className="min-h-11 flex-none rounded-xl px-4 text-sm font-semibold data-[state=active]:border-amber-300/30 data-[state=active]:bg-amber-300 data-[state=active]:text-black">
              <Eye className="size-3.5" />
              Aperçu
            </TabsTrigger>
            {isHotelVenue && hotelRooms.length > 0 && (
              <TabsTrigger value="chambres" className="min-h-11 flex-none gap-2 rounded-xl px-4 text-sm font-semibold data-[state=active]:border-amber-300/30 data-[state=active]:bg-amber-300 data-[state=active]:text-black">
                <BedDouble className="size-3.5" />
                Chambres & Suites
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-black/15 px-1.5 text-[10px] font-bold text-current">
                  {hotelRooms.length}
                </span>
              </TabsTrigger>
            )}
            {!isHotelVenue && hasAnyImmersive && (
              <TabsTrigger value="visite360" className="min-h-11 flex-none gap-2 rounded-xl px-4 text-sm font-semibold data-[state=active]:border-amber-300/30 data-[state=active]:bg-amber-300 data-[state=active]:text-black">
                <ScanLine className="size-3.5" />
                Visite 360°
                {immersiveSceneList.length > 1 && (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-black/15 px-1.5 text-[10px] font-bold text-current">
                    {immersiveSceneList.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {hasTablePlacements && (
              <TabsTrigger value="tables" className="min-h-11 flex-none gap-2 rounded-xl px-4 text-sm font-semibold data-[state=active]:border-amber-300/30 data-[state=active]:bg-amber-300 data-[state=active]:text-black">
                Tables
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-black/15 px-1.5 text-[10px] font-bold text-current">
                  {allPlacements.length}
                </span>
              </TabsTrigger>
            )}
            {isCoworkingVenue && (
              <TabsTrigger value="coworking" className="min-h-11 flex-none gap-2 rounded-xl px-4 text-sm font-semibold data-[state=active]:border-amber-300/30 data-[state=active]:bg-amber-300 data-[state=active]:text-black">
                <BriefcaseBusiness className="size-3.5" />
                Coworking
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-black/15 px-1.5 text-[10px] font-bold text-current">
                  {coworkingUnits.filter((u) => u.isReservable && u.status === 'active' && u.unitType.startsWith('coworking_')).length}
                </span>
              </TabsTrigger>
            )}
            <TabsTrigger value="infos" className="min-h-11 flex-none rounded-xl px-4 text-sm font-semibold data-[state=active]:border-amber-300/30 data-[state=active]:bg-amber-300 data-[state=active]:text-black">
              <MapPin className="size-3.5" />
              Infos pratiques
            </TabsTrigger>
          </TabsList>

          {/* ── Aperçu ── */}
          <TabsContent value="apercu" className="mt-2 space-y-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
            {venue.description && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                  <Eye className="size-4 text-amber-300" />
                  Aperçu de l'établissement
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-400 sm:text-base">
                  {venue.description}
                </p>
              </div>
            )}
            {allImages.length > 1 && (
              <VenueGallery images={allImages} venueName={venue.name} />
            )}
          </TabsContent>

          {/* ── Chambres & Suites (HOTEL only) ── */}
          {isHotelVenue && (
            <TabsContent value="chambres" className="mt-2">
              {selectedRoom ? (
                /* ── Room detail view ── */
                <RoomDetailView
                  room={selectedRoom}
                  tourScenes={roomTourData?.scenes ?? []}
                  tourHotspots={roomTourData?.hotspots ?? []}
                  sceneIdx={roomSceneIdx}
                  onSceneIdxChange={setRoomSceneIdx}
                  onBack={() => { setSelectedRoom(null); setRoomSceneIdx(0); }}
                />
              ) : (
                /* ── Room grid ── */
                <div className="space-y-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                        <BedDouble className="size-4 text-amber-300" />
                        Chambres & Suites
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Choisissez une chambre puis ouvrez sa galerie ou son expérience 360°.
                      </p>
                    </div>
                    <span className="inline-flex min-h-9 items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                      {hotelRooms.length} disponible{hotelRooms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {hotelRooms.map((room) => {
                      const typeKey = (room.roomType ?? 'OTHER').toUpperCase();
                      const stats = roomTypeAvailability[typeKey];
                      return (
                        <RoomCard
                          key={room._id}
                          room={room}
                          availableSameType={stats?.available}
                          totalSameType={stats?.total}
                          onClick={() => { setSelectedRoom(room); setRoomSceneIdx(0); }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* ── Visite 360° (non-hotel venues only) ── */}
          {!isHotelVenue && hasAnyImmersive && (
            <TabsContent value="visite360" className="mt-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">Visite 360°</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {immersiveSceneList.length > 1
                        ? 'Cliquez et faites glisser pour explorer · Naviguez entre les scènes'
                        : 'Cliquez et faites glisser pour explorer à 360°'}
                    </p>
                  </div>
                  {immersiveSceneList.length > 1 && (
                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 px-3 py-1 text-xs font-semibold text-amber-400">
                      {activeImmersiveSceneIdx + 1} / {immersiveSceneList.length}
                    </span>
                  )}
                </div>

                {/* Matterport embed */}
                {isMatterport && venue.immersiveUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-950" style={{ paddingBottom: '56.25%', position: 'relative' }}>
                    <iframe src={venue.immersiveUrl} title="Visite virtuelle" className="absolute inset-0 w-full h-full" allowFullScreen />
                  </div>
                ) : currentImmersiveScene ? (
                  /* 360° panorama viewer with scene navigation */
                  <div className="rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-950 shadow-2xl">
                    {/* Panorama */}
                    <div className="relative w-full" style={{ paddingBottom: '50%' }}>
                      <div className="absolute inset-0">
                        <PanoramaEngine
                          imageUrl={currentImmersiveScene.image}
                          markers={panoramaMarkers}
                          selectedMarkerId={null}
                          mode="navigate"
                          scenes={[]}
                          activeSceneId={null}
                          onSceneChange={() => {}}
                          navHotspots={psvNavHotspots}
                          onNavHotspotClick={(hotspotId) => {
                            const hotspot = activeNavHotspots.find((h) => h._id === hotspotId);
                            if (!hotspot) return;
                            const targetIdx = immersiveSceneList.findIndex((s) => s.id === hotspot.targetId);
                            if (targetIdx !== -1) setActiveImmersiveSceneIdx(targetIdx);
                          }}
                          onMarkerClick={(placementId) => {
                            const p = scenePlacements.find((pl) => pl._id === placementId);
                            if (p) handleImmersiveTableSelect(p);
                          }}
                        />
                      </div>

                      {/* Scene name badge */}
                      <div className="absolute top-3 left-3 z-20 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                          <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                          {immersiveSceneList.length > 1
                            ? `Scène ${activeImmersiveSceneIdx + 1} / ${immersiveSceneList.length}`
                            : 'Vue 360°'}
                        </span>
                      </div>

                      {/* Prev arrow */}
                      {activeImmersiveSceneIdx > 0 && (
                        <button
                          type="button"
                          aria-label="Scène précédente"
                          onClick={() => setActiveImmersiveSceneIdx((i) => i - 1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                      )}

                      {/* Next arrow */}
                      {activeImmersiveSceneIdx < immersiveSceneList.length - 1 && (
                        <button
                          type="button"
                          aria-label="Scène suivante"
                          onClick={() => setActiveImmersiveSceneIdx((i) => i + 1)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <ChevronRight className="size-5" />
                        </button>
                      )}

                      {/* Table availability badges */}
                      {panoramaMarkers.length > 0 && (
                        <div className="absolute bottom-3 left-3 z-20 flex gap-2 pointer-events-none">
                          {panoAvailableCount > 0 && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
                              <span className="size-1.5 rounded-full bg-white/80" />
                              {panoAvailableCount} disponible{panoAvailableCount !== 1 ? 's' : ''}
                            </div>
                          )}
                          {panoReservedCount > 0 && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
                              <span className="size-1.5 rounded-full bg-white/80" />
                              {panoReservedCount} réservée{panoReservedCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Progress bar */}
                      {immersiveSceneList.length > 1 && (
                        <div className="absolute bottom-0 inset-x-0 z-20 h-0.5 bg-zinc-800/60">
                          <div
                            className="h-full bg-amber-400 transition-all duration-300"
                            style={{ width: `${((activeImmersiveSceneIdx + 1) / immersiveSceneList.length) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Thumbnail strip */}
                    {immersiveSceneList.length > 1 && (
                      <div className="bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800/60">
                        <div
                          className="flex gap-2 p-2.5 overflow-x-auto scroll-smooth"
                          style={{ scrollbarWidth: 'none' }}
                          role="list"
                          aria-label="Scènes de la visite"
                        >
                          {immersiveSceneList.map((scene, idx) => {
                            const isActive = idx === activeImmersiveSceneIdx;
                            return (
                              <button
                                key={scene.id}
                                type="button"
                                role="listitem"
                                aria-label={`${scene.name}${isActive ? ' (actuelle)' : ''}`}
                                aria-current={isActive ? 'true' : undefined}
                                onClick={() => setActiveImmersiveSceneIdx(idx)}
                                className={cn(
                                  'relative shrink-0 h-[60px] w-[90px] rounded-lg overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                                  isActive
                                    ? 'border-amber-400 shadow-[0_0_12px_rgba(212,175,55,0.45)]'
                                    : 'border-transparent opacity-55 hover:opacity-90 hover:border-zinc-600'
                                )}
                              >
                                <Image src={scene.image} alt={scene.name} fill className="object-cover" sizes="90px" />
                                {isActive && <div className="absolute inset-0 bg-amber-400/10" />}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-3 pb-0.5 px-1">
                                  <p className="text-[9px] text-white font-medium truncate text-center leading-tight">
                                    {scene.name}
                                  </p>
                                </div>
                                {isActive && (
                                  <div className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-amber-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Reservation modal */}
                {selectedTable && (
                  <StepReservationModal
                    open={!!selectedTable}
                    onOpenChange={(open) => { if (!open) setSelectedTable(null); }}
                    placement={selectedTable}
                    venue={venue as Venue}
                    imageUrl={img ?? undefined}
                    initialStartAt={selectedSlotStartAt}
                    initialEndAt={selectedSlotEndAt}
                  />
                )}
              </div>
            </TabsContent>
          )}

          {/* ── Tables ── */}
          {hasTablePlacements && (
            <TabsContent value="tables" className="mt-4">
              {(() => {
                const availableCount = allPlacements.filter(
                  (p) => p.table.status === 'available'
                ).length;
                const reservedCount = allPlacements.filter(
                  (p) => p.table.status !== 'available'
                ).length;
                return (
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      {availableCount} disponible{availableCount !== 1 ? 's' : ''}
                    </div>
                    {reservedCount > 0 && (
                      <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400">
                        <span className="size-2 rounded-full bg-red-500" />
                        {reservedCount} réservée{reservedCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mb-5 grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
                <div className="space-y-4">
                  {tableGalleryImages.length > 1 && (
                    <HotelGalleryRail images={tableGalleryImages} venueName={venue.name} />
                  )}
                  {menuPreviewItems.length > 0 && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400">
                          <UtensilsCrossed className="size-3.5 text-amber-300" />
                          Menu conseille
                        </p>
                        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                          Precommande
                        </span>
                      </div>
                      <div className="space-y-2">
                        {menuPreviewItems.slice(0, 4).map((item) => (
                          <div key={item._id} className="rounded-xl border border-white/[0.06] bg-black/20 px-2.5 py-2">
                            <p className="line-clamp-1 text-xs font-semibold text-zinc-100">{item.name}</p>
                            <p className="mt-0.5 text-[11px] text-zinc-500">{item.price.toFixed(2)} TND</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">Reservation de table</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Selectionnez votre table puis finalisez avec ou sans precommande menu.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-300/15"
                    >
                      <CalendarClock className="size-3.5" />
                      Ouvrir le planificateur
                    </button>
                  </div>
                  {menuPreviewItems.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-400">
                      Le menu est disponible dans le parcours de reservation (option "Avec menu").
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allPlacements.map((placement) => {
                  const { table } = placement;
                  const isAvailable = table.status === 'available';
                  const price = table.price ?? venue.startingPrice ?? 0;
                  const isSelected = selectedTable?._id === placement._id;

                  return (
                    <button
                      key={placement._id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => isAvailable && handleImmersiveTableSelect(placement)}
                      className={`group relative rounded-2xl border p-5 text-left transition-all duration-200 ${
                        isAvailable
                          ? isSelected
                            ? 'border-amber-400/50 bg-amber-400/5 shadow-lg shadow-amber-400/10 ring-1 ring-amber-400/20'
                            : 'border-white/[0.08] bg-white/[0.04] hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-400/10 cursor-pointer active:scale-[0.98]'
                          : 'border-white/[0.04] bg-white/[0.02] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {/* Status pill */}
                      <span className={`absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isAvailable
                          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                          : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
                      }`}>
                        <span className={`size-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        {isAvailable ? 'Disponible' : 'Réservée'}
                      </span>

                      {/* Table number */}
                      <div className={`size-12 rounded-2xl flex items-center justify-center text-base font-black mb-3 transition-all ${
                        isAvailable
                          ? isSelected
                            ? 'bg-amber-400/20 text-amber-400'
                            : 'bg-amber-400/10 text-amber-400 group-hover:bg-amber-400/20'
                          : 'bg-white/[0.04] text-neutral-600'
                      }`}>
                        {table.tableNumber}
                      </div>

                      <h4 className="font-bold text-neutral-100 pr-24 leading-tight text-sm">
                        {table.name || `Table ${table.tableNumber}`}
                        {table.isVip && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            <Crown className="size-2.5 inline -mt-px" /> VIP
                          </span>
                        )}
                      </h4>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Users className="size-3" /> {table.capacity} pers. max
                        </span>
                        {table.locationLabel && (
                          <span className="flex items-center gap-1 text-neutral-600">
                            <MapPin className="size-3" /> {table.locationLabel}
                          </span>
                        )}
                        {price > 0 && (
                          <span className="font-semibold text-amber-400">{price} TND min.</span>
                        )}
                      </div>

                      {/* Hover CTA hint */}
                      {isAvailable && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                          {isSelected ? '✓ Sélectionnée' : 'Cliquer pour sélectionner →'}
                        </div>
                      )}
                      {!isAvailable && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-600">
                          <Lock className="size-3.5" />
                          Indisponible
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedTable && (
                <StepReservationModal
                  open={!!selectedTable}
                  onOpenChange={(open) => { if (!open) setSelectedTable(null); }}
                  placement={selectedTable}
                  venue={venue as Venue}
                  imageUrl={img ?? undefined}
                  initialStartAt={selectedSlotStartAt}
                  initialEndAt={selectedSlotEndAt}
                />
              )}
            </TabsContent>
          )}

          {isCoworkingVenue && (
            <TabsContent value="coworking" className="mt-2 space-y-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
              <div className="grid gap-3 md:grid-cols-5">
                <input type="date" min={new Date().toISOString().slice(0, 10)} value={coworkingDate} onChange={(e) => setCoworkingDate(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm md:col-span-1" />
                <input type="time" value={coworkingTime} onChange={(e) => setCoworkingTime(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm md:col-span-1" />
                <select value={coworkingDurationType} onChange={(e) => setCoworkingDurationType(e.target.value as 'hourly' | 'half_day' | 'full_day')} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm md:col-span-1">
                  <option value="hourly">Hourly</option>
                  <option value="half_day">Half-day</option>
                  <option value="full_day">Full-day</option>
                </select>
                <input type="number" min={1} max={12} value={coworkingHours} onChange={(e) => setCoworkingHours(Number(e.target.value || 1))} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm md:col-span-1" disabled={coworkingDurationType !== 'hourly'} />
                <input type="number" min={1} max={20} value={coworkingPartySize} onChange={(e) => setCoworkingPartySize(Number(e.target.value || 1))} className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm md:col-span-1" />
              </div>

              {coworkingAddons.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Add-ons</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {coworkingAddons.map((addon) => {
                      const qty = coworkingAddonQty[addon.key] ?? 0;
                      return (
                        <div key={addon._id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 text-sm">
                          <div className="font-medium text-zinc-200">{addon.name}</div>
                          <div className="text-xs text-zinc-500">{addon.unitPrice} TND</div>
                          <div className="mt-2 flex items-center gap-2">
                            <button type="button" className="rounded border border-zinc-700 px-2 py-0.5 text-xs" onClick={() => setCoworkingAddonQty((p) => ({ ...p, [addon.key]: Math.max(0, (p[addon.key] ?? 0) - 1) }))}>-</button>
                            <span className="text-xs">{qty}</span>
                            <button type="button" className="rounded border border-zinc-700 px-2 py-0.5 text-xs" onClick={() => setCoworkingAddonQty((p) => ({ ...p, [addon.key]: Math.min(addon.maxQty ?? 99, (p[addon.key] ?? 0) + 1) }))}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {coworkingUnits
                  .filter((u) => u.unitType.startsWith('coworking_') && u.isReservable && u.status === 'active')
                  .map((unit) => (
                    <div key={unit._id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <p className="text-sm font-bold text-white">{unit.label}</p>
                      <p className="mt-1 text-xs text-zinc-500">{unit.unitType.replace('coworking_', '').replace('_', ' ')}</p>
                      <p className="mt-2 text-xs text-zinc-400">Capacité max: {unit.capacityMax ?? 1}</p>
                      <p className="mt-1 text-xs text-zinc-400">Base: {unit.basePrice} TND / h</p>
                      <p className="mt-2 text-sm font-semibold text-amber-300">Total: {unit.basePrice * coworkingEffectiveHours + coworkingAddonsTotal} TND</p>
                      <button type="button" onClick={() => handleCoworkingAddToCart(unit)} className="mt-3 w-full rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/15">
                        Ajouter au panier
                      </button>
                    </div>
                  ))}
              </div>
            </TabsContent>
          )}

          {/* ── Infos pratiques ── */}
          <TabsContent value="infos" className="mt-2 space-y-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <MapPin className="size-4 text-amber-300" />
                Infos pratiques
              </h2>
              <p className="mt-1 text-sm text-zinc-500">Adresse, contact et localisation de l'établissement.</p>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {venue.address && (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <dt className="mb-1.5 flex items-center gap-1.5 font-semibold text-zinc-200">
                    <MapPin className="size-3.5 text-amber-300" /> Adresse
                  </dt>
                  <dd className="pl-5 text-zinc-500">
                    {venue.address}, {venue.city}
                  </dd>
                </div>
              )}
              {venue.phone && (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <dt className="mb-1.5 flex items-center gap-1.5 font-semibold text-zinc-200">
                    <Phone className="size-3.5 text-amber-300" /> Téléphone
                  </dt>
                  <dd className="pl-5">
                    <a href={`tel:${venue.phone}`} className="font-semibold text-amber-300 hover:underline">
                      {venue.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {venue.address && venue.city && (
              <VenueMap address={venue.address} city={venue.city} />
            )}
          </TabsContent>
        </Tabs>
        )}

        {/* Similar venues at bottom */}
        <div className="mt-8">
          <SimilarVenues venueId={venue._id} type={venue.type} city={venue.city} />
        </div>
      </div>

      {/* ── Floating reservation button ── */}
      {hasReservableTables && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold px-6 py-3.5 text-sm shadow-2xl shadow-amber-400/40 transition-all hover:scale-105 active:scale-95"
          >
            <ShoppingCart className="size-4" />
            {getReservationCTA(venue.type)}
          </button>
        </div>
      )}

      {/* ── Table picker sheet ── */}
      {hasReservableTables && (
        <TablePickerSheet
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          venue={venue as Venue}
          imageUrl={img ?? undefined}
          initialStartAt={selectedSlotStartAt}
          initialEndAt={selectedSlotEndAt}
        />
      )}
    </div>
  );
}
