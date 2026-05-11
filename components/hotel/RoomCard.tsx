'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  BedDouble,
  Users,
  SquareArrowOutUpRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  Video,
  Bath,
  Eye,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HotelRoom } from '@/lib/api/types';
import { ROOM_TYPE_LABELS } from '@/lib/api/rooms';
import { RoomAmenityChips } from './HotelAmenities';
import { Button } from '@/components/ui/button';

// ── Image mini-carousel ────────────────────────────────────────────────────

function RoomImageCarousel({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
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
    <div className="group/carousel relative h-full">
      <Image
        src={images[idx]}
        alt={name}
        fill
        className="object-cover transition-transform duration-500"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
      />

      {total > 1 && (
        <>
          {/* Prev */}
          <button
            type="button"
            aria-label="Image précédente"
            onClick={(e) => {
              e.preventDefault();
              setIdx((i) => (i - 1 + total) % total);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/80"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Next */}
          <button
            type="button"
            aria-label="Image suivante"
            onClick={(e) => {
              e.preventDefault();
              setIdx((i) => (i + 1) % total);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black/80"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Image ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  setIdx(i);
                }}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === idx ? 'w-4 h-1.5 bg-amber-400' : 'size-1.5 bg-white/40 hover:bg-white/60'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Bed type badge ──────────────────────────────────────────────────────────

function BedBadge({ bedType }: { bedType?: string }) {
  if (!bedType) return null;
  const icons: Record<string, React.ReactNode> = {
    king: <BedDouble className="size-3.5" />,
    queen: <BedDouble className="size-3.5" />,
    twin: (
      <span className="inline-flex gap-0.5">
        <BedDouble className="size-3" />
        <BedDouble className="size-3" />
      </span>
    ),
    single: <BedDouble className="size-3.5" />,
    double: <BedDouble className="size-3.5" />,
  };
  const key = bedType.toLowerCase();
  const icon = Object.entries(icons).find(([k]) => key.includes(k))?.[1] ?? (
    <BedDouble className="size-3.5" />
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-neutral-400">
      {icon}
      {bedType}
    </span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface RoomCardProps {
  room: HotelRoom;
  checkIn?: string;
  checkOut?: string;
  onBook?: (room: HotelRoom) => void;
  className?: string;
}

export function RoomCard({ room, checkIn, checkOut, onBook, className }: RoomCardProps) {
  const images = [room.coverImage, ...(room.gallery || [])].filter(Boolean) as string[];
  const isAvailable = room.status !== 'reserved' && room.status !== 'blocked' && room.isReservable;
  const typeLabel = ROOM_TYPE_LABELS[room.roomType?.toUpperCase?.()] ?? room.roomType ?? 'Chambre';

  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.round(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
          )
        )
      : 1;

  const totalPrice = room.pricePerNight * nights;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-[#0C0C0C] transition-all duration-300',
        isAvailable
          ? 'border-white/[0.08] hover:border-amber-400/25 hover:shadow-xl hover:shadow-amber-400/10 hover:-translate-y-0.5'
          : 'border-white/[0.04] opacity-60',
        className
      )}
    >
      {/* ── Image area ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/30">
        <RoomImageCarousel images={images} name={room.name || typeLabel} />

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Room type badge */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md',
              room.isVip
                ? 'border border-amber-400/40 bg-black/70 text-amber-400'
                : 'border border-white/20 bg-black/60 text-white/90'
            )}
          >
            {room.isVip && <Crown className="size-2.5" />}
            {typeLabel}
          </span>
        </div>

        {/* Top-right badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end pointer-events-none">
          {room.hasVirtualTour && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
              <Video className="size-3" /> 360°
            </span>
          )}
          {room.hasBalcony && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
              <Eye className="size-3" /> Vue
            </span>
          )}
        </div>

        {/* Availability overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-full bg-red-950/80 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400">
              <Lock className="size-3.5" />
              Non disponible
            </div>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Name */}
        <div>
          <h3 className="font-semibold text-neutral-100 leading-snug group-hover:text-amber-100 transition-colors">
            {room.name || typeLabel}
          </h3>
          {room.description && (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-500 leading-relaxed">
              {room.description}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500">
          {room.capacity > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-neutral-600" />
              {room.capacityAdults ?? room.capacity} pers.
            </span>
          )}
          {room.surface && (
            <span className="flex items-center gap-1">
              <SquareArrowOutUpRight className="size-3.5 text-neutral-600" />
              {room.surface} m²
            </span>
          )}
          {room.bathroomType && (
            <span className="flex items-center gap-1">
              <Bath className="size-3.5 text-neutral-600" />
              {room.bathroomType}
            </span>
          )}
        </div>

        {/* Bed type */}
        {room.bedType && (
          <BedBadge bedType={room.bedType} />
        )}

        {/* Amenity chips */}
        {room.amenities?.length > 0 && (
          <RoomAmenityChips amenities={room.amenities.slice(0, 4)} />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + CTA */}
        <div className="flex items-end justify-between pt-2 border-t border-white/[0.06] mt-1">
          <div>
            {nights > 1 ? (
              <>
                <div className="text-xs text-neutral-600">
                  {room.pricePerNight.toLocaleString('fr-TN')} DT × {nights} nuit{nights > 1 ? 's' : ''}
                </div>
                <div className="text-lg font-bold text-amber-400">
                  {totalPrice.toLocaleString('fr-TN')} DT
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] text-neutral-600 uppercase tracking-wider">Par nuit</div>
                <div className="text-lg font-bold text-amber-400">
                  {room.pricePerNight.toLocaleString('fr-TN')} DT
                </div>
              </>
            )}
          </div>

          <Button
            disabled={!isAvailable}
            onClick={() => onBook?.(room)}
            className={cn(
              'h-9 px-4 rounded-xl text-xs font-semibold transition-all',
              isAvailable
                ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40'
                : 'bg-white/5 text-neutral-600 cursor-not-allowed'
            )}
          >
            {isAvailable ? 'Réserver' : 'Indisponible'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
