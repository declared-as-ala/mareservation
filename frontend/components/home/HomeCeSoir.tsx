'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '@/lib/api/events';
import { EventCard } from '@/components/cards/EventCard';
import { EventCardSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Calendar } from 'lucide-react';

export function HomeCeSoir() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => fetchEvents({ upcoming: true }),
  });

  const tonight = new Date();
  tonight.setHours(0, 0, 0, 0);
  const tomorrow = new Date(tonight);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const ceSoir = events.filter((e) => {
    const d = new Date(e.startAt);
    return d >= tonight && d < tomorrow;
  }).slice(0, 4);

  if (isLoading) {
    return (
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (ceSoir.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<Calendar className="size-12" />}
          title="Rien ce soir"
          description="Consultez les événements à venir."
        />
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {ceSoir.map((event) => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
}
