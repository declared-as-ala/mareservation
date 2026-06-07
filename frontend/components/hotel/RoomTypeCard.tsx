'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  BedDouble,
  Users,
  Maximize2,
  Bath,
  Eye,
  Crown,
  Video,
  ChevronLeft,
  ChevronRight,
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
  onReserve: (group: RoomTypeGroup) => void;
  onView360: (group: RoomTypeGroup) => void;
  className?: string;
}

/* ── Image carousel with swipe (mobile) + arrows (desktop) ── */
function GalleryCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const total = images.length;

  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white/[0.03]">
        <BedDouble className="size-12 text-neutral-700" />
      </div>
    );
  }

  return (
    <div className="group/carousel relative h-full" {...swipeHandlers(setIdx, total)}>
      <Image
        src={images[idx]}
        alt={alt}
        fill
        className="object-cover transition-all duration-500"
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={idx === 0}
      />
      {/* Soft gradient for text legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />

      {total > 1 && (
        <>
          {/* Desktop arrows — hidden on touch by default */}
          <button
            type="button"
            aria-label="Photo précédente"
            onClick={(e) => {
              e.preventDefault();
              setIdx((i) => (i - 1 + total) % total);
            }}
            className="absolute left-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-sm transition-all hover:bg-black/80 group-hover/carousel:flex md:flex"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Photo suivante"
            onClick={(e) => {
              e.preventDefault();
              setIdx((i) => (i + 1) % total);
            }}
            className="absolute right-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-sm transition-all hover:bg-black/80 group-hover/carousel:flex md:flex"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Image ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  setIdx(i);
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  i === idx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/45 hover:bg-white/70'
                )}
              />
            ))}
          </div>

          {/* Image count chip */}
          <div className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur-sm">
            {idx + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}

/* Lightweight swipe handlers for touch carousels */
function swipeHandlers(setIdx: (fn: (i: number) => number) => void, total: number) {
  let startX = 0;
  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 30) return;
      if (dx < 0) setIdx((i) => (i + 1) % total);
      else setIdx((i) => (i - 1 + total) % total);
    },
  };
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
export function RoomTypeCard({ group, nights, onReserve, onView360, className }: RoomTypeCardProps) {
  const {
    roomType,
    representativeRoom: rep,
    minPrice,
    availableCount,
    totalCount,
    combinedGallery,
    hasVirtualTour,
    aggregatedAmenities,
    hasBalcony,
    isVip,
  } = group;

  const typeLabel = ROOM_TYPE_LABELS[roomType?.toUpperCase?.()] ?? roomType ?? 'Chambre';
  const isAvailable = availableCount > 0;
  const totalPrice = minPrice * Math.max(1, nights);
  const showTotal = nights > 1;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border bg-gradient-to-b from-[#111111] to-[#0B0B0B] shadow-xl transition-all duration-300',
        isAvailable
          ? 'border-white/[0.07] hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-2xl hover:shadow-amber-400/10'
          : 'border-white/[0.04] opacity-75',
        className
      )}
    >
      {/* ── Gallery area ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/30 md:aspect-[16/10]">
        <GalleryCarousel images={combinedGallery} alt={typeLabel} />

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

        {/* Top-right: bigger 360° + view badges */}
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
          {hasVirtualTour && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/55 bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1 text-[11px] font-black text-black shadow-[0_4px_16px_rgba(245,158,11,0.45)]">
              <Video className="size-3.5" />
              Visite 360°
            </span>
          )}
          {hasBalcony && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
              <Eye className="size-3" />
              Vue
            </span>
          )}
        </div>

        {/* Centre overlay CTA when 360 available — only on hover, button on the body still does the work on tap */}
        {hasVirtualTour && (
          <button
            type="button"
            onClick={() => onView360(group)}
            aria-label="Ouvrir la visite 360°"
            className="absolute inset-x-0 bottom-14 z-[5] mx-auto hidden h-10 w-[60%] items-center justify-center gap-1.5 rounded-full border border-white/25 bg-black/65 px-4 text-[12px] font-bold text-white backdrop-blur-md transition-all hover:scale-[1.02] hover:bg-amber-400/85 hover:text-black sm:inline-flex"
          >
            <Video className="size-3.5" />
            Explorer en 360°
          </button>
        )}

        {/* Bottom-left: availability pill */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10">
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

        {/* Price + CTA row */}
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
            <button
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onReserve(group)}
              className={cn(
                'inline-flex h-11 min-w-[120px] items-center justify-center gap-1.5 rounded-2xl px-5 text-[13px] font-bold transition-all active:scale-95',
                isAvailable
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-[0_8px_24px_rgba(245,158,11,0.32)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(245,158,11,0.45)]'
                  : 'cursor-not-allowed bg-white/[0.05] text-neutral-600'
              )}
            >
              {isAvailable ? 'Réserver' : 'Complet'}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
