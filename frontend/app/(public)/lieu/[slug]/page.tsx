import { redirect } from 'next/navigation';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { getVenueHref } from '@/lib/venueHref';

/**
 * Legacy `/lieu/[slug]` route — the generic venue page has been retired.
 * Resolves the venue's type and redirects to its purpose-built page.
 */
export default async function LieuLegacyRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const venue = await fetchVenueByIdOrSlug(slug);
    if (venue) {
      redirect(getVenueHref(venue));
    }
  } catch {
    // fall through
  }
  redirect('/explorer');
}
