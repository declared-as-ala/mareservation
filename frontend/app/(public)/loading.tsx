import { VenueCardSkeleton } from '@/components/shared/skeletons';

export default function PublicLoading() {
  return (
    <div className="container py-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <VenueCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
