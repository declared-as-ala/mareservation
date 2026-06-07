'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { VenueCard } from '@/components/cards/VenueCard';
import { SectionCarousel } from '@/components/sections/SectionCarousel';
import { VenueCardSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Venue } from '@/lib/api/types';
import { MapPin } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  CAFE: 'Cafés',
  RESTAURANT: 'Restaurants',
  HOTEL: 'Hôtels',
  CINEMA: 'Cinéma',
  EVENT_SPACE: 'Événements',
};

interface HomeVenuesRailProps {
  type: string;
  title?: string;
  seeMoreHref?: string;
  limit?: number;
}

export function HomeVenuesRail({
  type,
  title = TYPE_LABELS[type] ?? type,
  seeMoreHref,
  limit = 8,
}: HomeVenuesRailProps) {
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['venues', 'home', type],
    queryFn: () => fetchVenues({ type }),
  });
  const items = venues.slice(0, limit);

  return (
    <SectionCarousel<Venue>
      title={title}
      seeMoreHref={seeMoreHref ?? (type === 'EVENT_SPACE' ? '/evenements' : `/${type.toLowerCase().replace('_', '-')}`)}
      seeMoreLabel="Voir plus"
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
          title={`Aucun ${title.toLowerCase()} pour le moment`}
          description="Revenez bientôt."
        />
      }
      renderItem={(venue) => <VenueCard key={venue._id} venue={venue} />}
    />
  );
}
