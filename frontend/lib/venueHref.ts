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
    // Nightlife & wellness reserve tables/slots like a café-lounge.
    case 'BAR':
    case 'ROOFTOP':
    case 'BEACH_CLUB':
    case 'CLUB':
    case 'LOUNGE':
    case 'SPA':
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
    // Nightlife & wellness use the café-style editor (menu + tables + 360).
    case 'BAR':
    case 'ROOFTOP':
    case 'BEACH_CLUB':
    case 'CLUB':
    case 'LOUNGE':
    case 'SPA':
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

/**
 * Resolve the ADMIN LIST page for a venue type, so a newly created venue lands
 * in its own category list (e.g. a new Café → the cafés list) no matter which
 * section it was created from.
 */
export function getAdminVenueListHref(type?: string | null): string {
  switch (type) {
    case 'HOTEL':
      return '/admin/hotels';
    case 'MAISON_DHOTE':
      return '/admin/venues?type=MAISON_DHOTE';
    case 'RESTAURANT':
      return '/admin/restaurants';
    case 'CAFE':
    case 'CAFE_LOUNGE':
      return '/admin/cafes';
    case 'COWORKING':
      return '/admin/coworking';
    case 'CINEMA':
      return '/admin/cinema';
    case 'EVENT_SPACE':
      return '/admin/event-spaces';
    case 'BAR':
    case 'ROOFTOP':
    case 'BEACH_CLUB':
    case 'CLUB':
    case 'LOUNGE':
    case 'SPA':
      return `/admin/venues?type=${type}`;
    default:
      return '/admin/venues';
  }
}
