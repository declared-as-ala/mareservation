/**
 * Resolve the dedicated detail-page URL for a venue by its category.
 * Each category has a purpose-built page. /lieu has been retired —
 * unknown types fall through to the explorer.
 */
export function getVenueHref(venue: { type?: string | null; slug?: string | null; _id: string }): string {
  const id = venue.slug || venue._id;
  switch (venue.type) {
    case 'HOTEL':
    case 'MAISON_DHOTE':
      return `/accommodation/${id}`;
    case 'COWORKING':
      return `/coworking/${id}`;
    case 'CINEMA':
      return `/cinema/${id}`;
    case 'CAFE':
    case 'CAFE_LOUNGE':
      return `/cafe/${id}`;
    case 'RESTAURANT':
      return `/restaurant/${id}`;
    case 'EVENT_SPACE':
      return `/event-space/${id}`;
    default:
      return `/explorer?venue=${id}`;
  }
}

/**
 * Resolve the dedicated ADMIN editor URL for a venue by its type.
 * Each category has a purpose-built premium admin page; unknown types
 * fall back to the generic editor.
 */
export function getAdminVenueHref(venue: { type?: string | null; _id: string }): string {
  const id = venue._id;
  switch (venue.type) {
    case 'HOTEL':
    case 'MAISON_DHOTE':
      return `/admin/hotels/${id}`;
    case 'RESTAURANT':
      return `/admin/restaurants/${id}`;
    case 'CAFE':
    case 'CAFE_LOUNGE':
      return `/admin/cafes/${id}`;
    case 'COWORKING':
      return `/admin/coworking/${id}`;
    case 'CINEMA':
      return `/admin/cinema/${id}`;
    case 'EVENT_SPACE':
      return `/admin/event-spaces/${id}`;
    default:
      return `/admin/venues/${id}`;
  }
}
