'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { fetchEvents } from '@/lib/api/events';
import { VenueCard } from '@/components/cards/VenueCard';
import { EventCard } from '@/components/cards/EventCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

export function HomeSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: venues = [] } = useQuery({
    queryKey: ['venues', 'featured'],
    queryFn: () => fetchVenues({}),
  });
  const { data: events = [] } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => fetchEvents({ upcoming: true }),
  });

  const items = [
    ...venues.slice(0, 3).map((v) => ({ type: 'venue' as const, id: v._id, data: v })),
    ...events.slice(0, 2).map((e) => ({ type: 'event' as const, id: e._id, data: e })),
  ];

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const step = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth py-2 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="w-[280px] shrink-0 scroll-snap-start"
          >
            {item.type === 'venue' ? (
              <VenueCard venue={item.data} />
            ) : (
              <EventCard event={item.data} />
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md hover:bg-background"
        aria-label="Précédent"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md hover:bg-background"
        aria-label="Suivant"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
