'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { globalSearch } from '@/lib/api/search';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { VenueCard } from '@/components/cards/VenueCard';
import { EventCard } from '@/components/cards/EventCard';
import { VenueCardSkeleton } from '@/components/shared/skeletons';
import { EventCardSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Search } from 'lucide-react';

function RechercheContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => globalSearch(q),
    enabled: q.length >= 2,
  });

  const venues = data?.venues ?? [];
  const events = data?.events ?? [];
  const hasResults = venues.length > 0 || events.length > 0;

  return (
    <div className="container px-4 py-8">
      <SectionHeader
        title="Résultats de recherche"
        subtitle={q ? `Pour « ${q} »` : 'Saisissez un terme dans la barre de recherche.'}
      />
      {!q ? (
        <EmptyState
          icon={<Search className="size-12" />}
          title="Rechercher"
          description="Utilisez la barre de recherche pour trouver un lieu ou un événement."
        />
      ) : isLoading ? (
        <div className="mt-6 space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : !hasResults ? (
        <EmptyState
          icon={<Search className="size-12" />}
          title="Aucun résultat"
          description={`Aucun lieu ou événement trouvé pour « ${q} ». Essayez d'autres mots-clés.`}
        />
      ) : (
        <div className="mt-6 space-y-10">
          {venues.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Lieux</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {venues.map((venue) => (
                  <VenueCard key={venue._id} venue={venue} />
                ))}
              </div>
            </section>
          )}
          {events.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Événements</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={
      <div className="container px-4 py-8">
        <SectionHeader title="Résultats de recherche" subtitle="Chargement..." />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <VenueCardSkeleton key={i} />
          ))}
        </div>
      </div>
    }>
      <RechercheContent />
    </Suspense>
  );
}
