'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchVenues } from '@/lib/api/venues';
import { VenueCard } from '@/components/cards/VenueCard';
import { VenueCardSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { MapPin } from 'lucide-react';

export function HomeFeaturedVenues() {
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['venues', 'featured-home'],
    queryFn: () => fetchVenues({}),
  });

  const featured = venues.slice(0, 6);

  if (isLoading) {
    return (
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <VenueCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (featured.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<MapPin className="size-12" />}
          title="Aucun lieu pour le moment"
          description="Revenez bientôt."
        />
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {featured.map((venue) => (
        <VenueCard key={venue._id} venue={venue} />
      ))}
    </div>
  );
}
