'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Music, ArrowRight, ScanEye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEventAvailability } from '@/lib/events/availability';
import type { Event } from '@/lib/api/types';

function getVenueName(ev: Event): string {
  const v = ev.venueId;
  if (typeof v === 'object' && v?.name) return v.name;
  return '';
}

function venueHas360(ev: Event): boolean {
  const venue = ev.venueId as any;
  return Boolean(venue && typeof venue === 'object' && (venue.hasVirtualTour || venue.immersiveFile || venue.immersiveType === 'view-360'));
}

interface EventCardProps {
  event: Event;
  className?: string;
}

export function EventCard({ event, className }: EventCardProps) {
  const href = `/evenement/${event.slug || event._id}`;
  const start = new Date(event.startAt);
  const cover = event.coverImage ?? event.imageUrl;
  const avail = getEventAvailability(event.ticketTypes);
  const minPrice = avail.hasTickets
    ? Math.min(...(event.ticketTypes ?? [])
        .filter((t) => t.isActive !== false)
        .map((t) => Number(t.price || 0))
        .filter((p) => p > 0))
    : null;
  const has360 = venueHas360(event);

  return (
    <Link href={href} className={cn('group block h-full', className)}>
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-800">
          {cover ? (
            <Image
              src={cover}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 320px"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-800 text-zinc-600">
              <Music className="size-10 opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
            <TypeBadgeMini type={event.type} />
            {has360 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-black/70 px-2 py-0.5 text-[10px] font-bold text-amber-200 backdrop-blur">
                <ScanEye className="size-3" />
                360
              </span>
            )}
          </div>
          {event.isVedette && (
            <span className="absolute left-2 top-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/25 px-2 py-0.5 text-[10px] font-bold text-amber-100 backdrop-blur-sm">
              ★ Premium
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5">
          <h3 className="line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-snug tracking-tight text-zinc-100 sm:text-[15px]">
            {event.title}
          </h3>

          <div className="space-y-1 text-[11px] text-zinc-400 sm:text-[12.5px]">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0 text-zinc-500" />
              {start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {getVenueName(event) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0 text-zinc-500" />
                <span className="truncate">{getVenueName(event)}</span>
              </span>
            )}
          </div>

          {/* Price + availability */}
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="min-w-0">
              {minPrice != null ? (
                <div className="flex items-baseline gap-1 leading-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Dès</span>
                  <span className="text-base font-black text-amber-300 sm:text-lg">{minPrice}</span>
                  <span className="text-[10px] font-bold text-amber-300/70">TND</span>
                </div>
              ) : (
                <span className="text-[12px] font-semibold text-zinc-400">Entrée libre</span>
              )}
              <AvailabilityLine isSoldOut={avail.isSoldOut} remaining={avail.remaining} hasTickets={avail.hasTickets} />
            </div>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-800/50 text-amber-400 transition-all group-hover:border-amber-400/40 group-hover:bg-amber-400/10">
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* Compact availability — avoids dumping huge raw counts into a tiny card */
function AvailabilityLine({ isSoldOut, remaining, hasTickets }: { isSoldOut: boolean; remaining: number; hasTickets: boolean }) {
  if (isSoldOut) {
    return <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-red-400">Complet</span>;
  }
  if (hasTickets && remaining > 0 && remaining <= 20) {
    return <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-amber-400">Plus que {remaining}</span>;
  }
  return (
    <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-400/90">
      <span className="size-1.5 rounded-full bg-emerald-400" />
      Disponible
    </span>
  );
}

/* Small type chip (kept inline so the card controls its mobile size) */
function TypeBadgeMini({ type }: { type: string }) {
  const t = (type || '').toLowerCase();
  const label =
    ['sport', 'sports', 'match'].includes(t) ? 'Sport'
    : ['concert', 'dj', 'chanteur'].includes(t) ? 'Concert'
    : t === 'festival' ? 'Festival'
    : t === 'soiree' ? 'Soirée'
    : t === 'standup' ? 'Stand-up'
    : ['cinema', 'cinema_session'].includes(t) ? 'Cinéma'
    : 'Événement';
  return (
    <span className="rounded-full border border-white/20 bg-black/65 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
      {label}
    </span>
  );
}
