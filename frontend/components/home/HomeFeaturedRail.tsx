'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { VenueCard } from '@/components/cards/VenueCard';
import { SectionCarousel } from '@/components/sections/SectionCarousel';
import { VenueCardSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Venue } from '@/lib/api/types';
import { MapPin } from 'lucide-react';

export function HomeFeaturedRail() {
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['venues', 'featured-home'],
    queryFn: () => fetchVenues({}),
  });
  const items = venues.slice(0, 8);

  return (
    <SectionCarousel<Venue>
      title="Lieux populaires"
      subtitle="Découvrez nos lieux partenaires"
      seeMoreHref="/explorer"
      seeMoreLabel="Voir tout"
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      renderSkeleton={(i) => (
        <div key={i} className="min-w-0 flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_30%]">
          <VenueCardSkeleton />
        </div>
      )}
      emptyMessage={
        <EmptyState
          icon={<MapPin className="size-12" />}
          title="Aucun lieu pour le moment"
          description="Revenez bientôt."
        />
      }
      renderItem={(venue) => <VenueCard key={venue._id} venue={venue} />}
    />
  );
}
