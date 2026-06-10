'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { getAdminVenueHref } from '@/lib/venueHref';

/**
 * The generic venue editor was replaced by dedicated, premium per-category
 * editors (/admin/restaurants, /admin/cafes, /admin/coworking, /admin/cinema,
 * /admin/event-spaces, /admin/hotels). This route now resolves the venue's
 * type and forwards to its category editor so old links keep working.
 */
export default function AdminVenueRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: venue, isLoading } = useQuery({
    queryKey: ['admin-venue-redirect', id],
    queryFn: () => fetchVenueByIdOrSlug(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (isLoading || !id) return;
    if (!venue) {
      router.replace('/admin/venues');
      return;
    }
    const href = getAdminVenueHref(venue as { type?: string; _id: string });
    // Guard against a redirect loop for unknown types that map back here.
    router.replace(href === `/admin/venues/${id}` ? '/admin/venues' : href);
  }, [isLoading, venue, id, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-2 text-zinc-400">
      <Loader2 className="size-5 animate-spin" />
      <span className="text-sm">Redirection vers l&apos;éditeur…</span>
    </div>
  );
}
