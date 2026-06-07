'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);
import {
  BedDouble,
  Users,
  Maximize2,
  Bath,
  Eye,
  Crown,
  Video,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HotelRoom } from '@/lib/api/types';
import { ROOM_TYPE_LABELS } from '@/lib/api/rooms';
import { RoomAmenityChips } from './HotelAmenities';

export interface RoomTypeGroup {
  roomType: string;
  rooms: HotelRoom[];
  representativeRoom: HotelRoom;
  minPrice: number;
  availableCount: number;
  totalCount: number;
  combinedGallery: string[];
  hasVirtualTour: boolean;
  aggregatedAmenities: string[];
  hasBalcony: boolean;
  isVip: boolean;
}

interface RoomTypeCardProps {
  group: RoomTypeGroup;
  nights: number;
  onView360: (group: RoomTypeGroup) => void;
  className?: string;
}

/* ── Availability pill ── */
function AvailabilityPill({ count, total }: { count: number; total: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-300 backdrop-blur-sm">
        <XCircle className="size-3" />
        Complet
      </span>
    );
  }
  if (count === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300 backdrop-blur-sm">
        <Sparkles className="size-3" />
        Dernière chambre
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 backdrop-blur-sm">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
      </span>
      {count} sur {total} disponibles
    </span>
  );
}

/* ── Main card ── */
export function RoomTypeCard({ group, nights, onView360, className }: RoomTypeCardProps) {
  const {
    roomType,
    representativeRoom: rep,
    minPrice,
    availableCount,
    totalCount,
    hasVirtualTour,
    aggregatedAmenities,
    hasBalcony,
    isVip,
  } = group;

  const typeLabel = ROOM_TYPE_LABELS[roomType?.toUpperCase?.()] ?? roomType ?? 'Chambre';
  const isAvailable = availableCount > 0;
  const totalPrice = minPrice * Math.max(1, nights);
  const showTotal = nights > 1;

  // Pick the first available 360° asset for the type. We distinguish two
  // shapes:
  //   - panoramaImageUrl: a flat equirectangular image (PanoramaEngine wraps
  //     it into a rotatable sphere on the page)
  //   - tourEmbedUrl: a Klapty / Matterport iframe (renders as <iframe>)
  // panoramicImages[] is always equirectangular when present.
  function isLikelyEquirectangular(url: string): boolean {
    const u = url.toLowerCase();
    if (u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.png') || u.endsWith('.webp')) return true;
    if (u.includes('unsplash.com') || u.includes('photo-sphere-viewer-data') || u.includes('pannellum.org')) return true;
    return false;
  }
  let panoramaImageUrl: string | null = null;
  let tourEmbedUrl: string | null = null;
  let totalTourSceneCount = 0;
  for (const r of group.rooms) {
    totalTourSceneCount += r.tourScenes?.length ?? 0;
    if (!panoramaImageUrl && r.tourScenes && r.tourScenes.length > 0) {
      panoramaImageUrl = r.tourScenes[0].image;
    }
    if (!panoramaImageUrl && r.panoramicImages && r.panoramicImages.length > 0) {
      panoramaImageUrl = r.panoramicImages[0];
    }
    if (!panoramaImageUrl && r.virtualTourUrl && isLikelyEquirectangular(r.virtualTourUrl)) {
      panoramaImageUrl = r.virtualTourUrl;
    }
    if (!tourEmbedUrl && r.virtualTourUrl && !isLikelyEquirectangular(r.virtualTourUrl)) {
      tourEmbedUrl = r.virtualTourUrl;
    }
    if (panoramaImageUrl && tourEmbedUrl) break;
  }
  const hasInlinePanorama = !!panoramaImageUrl || !!tourEmbedUrl;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        // Wider, horizontal layout — gallery on the left on lg, body on the right.
        'group relative grid overflow-hidden rounded-3xl border bg-gradient-to-b from-[#111111] to-[#0B0B0B] shadow-xl transition-all duration-300 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
        isAvailable
          ? 'border-white/[0.07] hover:border-amber-400/30 hover:shadow-2xl hover:shadow-amber-400/10'
          : 'border-white/[0.04] opacity-75',
        className
      )}
    >
      {/* ── Room 360 area ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/30 sm:aspect-[16/10] lg:aspect-auto lg:min-h-[360px]">
        {panoramaImageUrl ? (
          <div className="absolute inset-0">
            <PanoramaEngine
              imageUrl={panoramaImageUrl}
              markers={[]}
              mode="navigate"
              scenes={[]}
              activeSceneId={null}
              onSceneChange={() => undefined}
              onMarkerClick={() => undefined}
            />
          </div>
        ) : tourEmbedUrl ? (
          <iframe
            src={tourEmbedUrl}
            title={`Visite 360° — ${typeLabel}`}
            className="absolute inset-0 h-full w-full border-0"
            allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[0.03] to-transparent px-6 text-center">
            <Video className="size-12 text-neutral-700" />
            <div>
              <p className="text-sm font-semibold text-neutral-400">Visite 360° non publiée</p>
              <p className="mt-1 text-xs text-neutral-600">
                Cette chambre ne dispose pas encore d&apos;une visite immersive.
              </p>
            </div>
          </div>
        )}

        {/* Top-left: type label */}
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md',
              isVip
                ? 'border-amber-400/45 bg-black/70 text-amber-300'
                : 'border-white/20 bg-black/65 text-white/95'
            )}
          >
            {isVip && <Crown className="size-3" />}
            {typeLabel}
          </span>
        </div>

        {/* Top-right: badges */}
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
          {hasBalcony && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
              <Eye className="size-3" />
              Vue
            </span>
          )}
        </div>

        {hasInlinePanorama && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-black/70 px-3 py-1.5 text-[11px] font-bold text-amber-300 backdrop-blur-md">
            <Video className="size-3" />
            Visite 360°
          </div>
        )}

        {/* Plein écran button when 360 — opens the multi-room scene viewer */}
        {hasInlinePanorama && (group.rooms.length > 1 || totalTourSceneCount > 1) && (
          <button
            type="button"
            onClick={() => onView360(group)}
            aria-label="Ouvrir la visite plein écran"
            className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md transition-all hover:scale-[1.02] hover:bg-amber-400/85 hover:text-black"
          >
            <Maximize2 className="size-3" />
            Voir toutes ({group.rooms.length})
          </button>
        )}

        {/* Top-right: availability pill (moved here so it doesn't collide with the gallery toggle) */}
        <div className="pointer-events-none absolute right-3 top-12 z-10">
          <AvailabilityPill count={availableCount} total={totalCount} />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-5">
        {/* Title + description */}
        <div>
          <h3 className="font-serif text-lg font-bold leading-tight text-white transition-colors group-hover:text-amber-100 sm:text-xl">
            {typeLabel}
          </h3>
          {rep.description && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-neutral-500">
              {rep.description}
            </p>
          )}
        </div>

        {/* Quick info chips */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-neutral-400">
          {rep.bedType && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="size-3.5 text-neutral-600" />
              {rep.bedType}
            </span>
          )}
          {rep.capacity > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-neutral-600" />
              {rep.capacityAdults ?? rep.capacity} pers.
            </span>
          )}
          {rep.surface && (
            <span className="flex items-center gap-1.5">
              <Maximize2 className="size-3.5 text-neutral-600" />
              {rep.surface} m²
            </span>
          )}
          {rep.bathroomType && (
            <span className="flex items-center gap-1.5">
              <Bath className="size-3.5 text-neutral-600" />
              {rep.bathroomType}
            </span>
          )}
        </div>

        {/* Aggregated amenities */}
        {aggregatedAmenities.length > 0 && (
          <RoomAmenityChips amenities={aggregatedAmenities.slice(0, 4)} />
        )}

        {/* Inclusions strip */}
        <div className="flex items-center gap-2 text-[11px] text-emerald-300/85">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400/80" />
          <span>Annulation gratuite · Paiement à l&apos;arrivée possible</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + 360 tour row */}
        <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
              {showTotal ? `${minPrice.toLocaleString('fr-TN')} DT × ${nights} nuits` : 'À partir de'}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-serif text-2xl font-black text-amber-400">
                {(showTotal ? totalPrice : minPrice).toLocaleString('fr-TN')} DT
              </span>
              {!showTotal && <span className="text-xs text-neutral-500">/ nuit</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasVirtualTour && (
              <button
                type="button"
                onClick={() => onView360(group)}
                className="group/btn inline-flex h-11 items-center gap-1.5 rounded-2xl border-2 border-amber-400/55 bg-amber-400/[0.10] px-4 text-[12px] font-black uppercase tracking-wide text-amber-300 transition-all hover:border-amber-400 hover:bg-amber-400/[0.18] hover:shadow-[0_4px_18px_rgba(245,158,11,0.30)] active:scale-95"
              >
                <Video className="size-4" />
                <span className="hidden sm:inline">Visite 360°</span>
                <span className="sm:hidden">360°</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
