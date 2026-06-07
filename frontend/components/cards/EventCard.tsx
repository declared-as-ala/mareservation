'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Music, ArrowRight, ScanEye } from 'lucide-react';
import { CardFooter, CardHeader } from '@/components/ui/card';
import { BaseCard } from '@/components/shared/BaseCard';
import { TypeBadge } from '@/components/shared/TypeBadge';
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
    <Link href={href} className={cn('group block', className)}>
      <BaseCard className="flex h-full flex-col overflow-hidden bg-zinc-900/60 border-zinc-800 shadow-md hover:border-amber-400/30 hover:shadow-lg">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-800">
          {cover ? (
            <Image src={cover} alt={event.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px" />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-800 text-zinc-600">
              <Music className="size-12 opacity-40" />
            </div>
          )}
          <div className="absolute right-2.5 top-2.5 flex flex-wrap gap-1.5">
            <TypeBadge type={event.type} />
            {event.isVedette && (
              <span className="rounded-full bg-[#D4AF37]/25 border border-[#D4AF37]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100 backdrop-blur-sm shadow-sm shadow-[#D4AF37]/20">
                ★ Premium
              </span>
            )}
            {has360 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-black/70 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 backdrop-blur">
                <ScanEye className="size-3" />
                360
              </span>
            )}
          </div>
        </div>

        <CardHeader className="flex-1 space-y-1.5 pb-2">
          <h3 className="line-clamp-1 text-base font-semibold text-zinc-100 leading-tight tracking-tight">
            {event.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {getVenueName(event) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {getVenueName(event)}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-xs">
            {avail.isSoldOut ? (
              <span className="font-bold text-red-400">COMPLET</span>
            ) : avail.remaining > 0 ? (
              <span className="text-zinc-500">{avail.remaining} billets restants</span>
            ) : (
              <span className="text-zinc-500">Billets limites</span>
            )}
            {minPrice != null ? <span className="font-bold text-amber-300">Des {minPrice} TND</span> : null}
          </div>
        </CardHeader>

        <CardFooter className="pt-0">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 transition-colors group-hover:text-amber-300">
            Voir l&apos;événement
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </CardFooter>
      </BaseCard>
    </Link>
  );
}
