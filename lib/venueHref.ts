/**
 * Resolve the dedicated detail-page URL for a venue by its category.
 * Each category gets a purpose-built page; everything else falls back
 * to the generic immersive venue page.
 */
export function getVenueHref(venue: { type?: string | null; slug?: string | null; _id: string }): string {
  const id = venue.slug || venue._id;
  switch (venue.type) {
    case 'HOTEL':
      return `/hotel/${id}`;
    case 'COWORKING':
      return `/coworking/${id}`;
    case 'CINEMA':
      return `/cinema/${id}`;
    case 'CAFE':
    case 'CAFE_LOUNGE':
      return `/cafe/${id}`;
    case 'RESTAURANT':
      return `/restaurant/${id}`;
    default:
      return `/lieu/${id}`;
  }
}
