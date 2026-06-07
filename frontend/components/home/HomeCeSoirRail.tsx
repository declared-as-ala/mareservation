'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '@/lib/api/events';
import { EventCard } from '@/components/cards/EventCard';
import { SectionCarousel } from '@/components/sections/SectionCarousel';
import { EventCardSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Event } from '@/lib/api/types';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HomeCeSoirRail() {
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
  }).slice(0, 8);

  return (
    <SectionCarousel<Event>
      title="Ce soir"
      subtitle="Événements à ne pas manquer"
      seeMoreHref="/evenements"
      seeMoreLabel="Voir tout"
      items={ceSoir}
      isLoading={isLoading}
      skeletonCount={4}
      renderSkeleton={(i) => (
        <div key={i} className="min-w-0 flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_30%]">
          <EventCardSkeleton />
        </div>
      )}
      emptyMessage={
        <EmptyState
          icon={<Calendar className="size-12" />}
          title="Rien ce soir"
          description="Consultez les événements à venir."
          action={
            <Button asChild variant="outline">
              <Link href="/evenements">Voir les événements</Link>
            </Button>
          }
        />
      }
      renderItem={(event) => <EventCard key={event._id} event={event} />}
    />
  );
}
