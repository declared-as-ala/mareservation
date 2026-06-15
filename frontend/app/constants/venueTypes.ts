/** Backend venue type enum (uppercase). French labels for UI. */
export type VenueType =
  | 'CAFE'
  | 'CAFE_LOUNGE'
  | 'RESTAURANT'
  | 'HOTEL'
  | 'MAISON_DHOTE'
  | 'COWORKING'
  | 'CINEMA'
  | 'EVENT_SPACE'
  | 'SPA'
  | 'BAR'
  | 'ROOFTOP'
  | 'BEACH_CLUB'
  | 'CLUB'
  | 'LOUNGE';

export const VENUE_TYPE_LABELS: Record<string, string> = {
  CAFE: 'Café',
  CAFE_LOUNGE: 'Café & Lounge',
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hôtel',
  MAISON_DHOTE: "Maison d'hôte",
  COWORKING: 'Coworking',
  CINEMA: 'Cinéma',
  EVENT_SPACE: 'Événements',
  SPA: 'Spa & Bien-être',
  BAR: 'Bar',
  ROOFTOP: 'Rooftop',
  BEACH_CLUB: 'Beach Club',
  CLUB: 'Club',
  LOUNGE: 'Lounge',
};

/** Options for Explorer Type filter */
export const EXPLORER_TYPE_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'cafe', label: 'Café' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'cinema', label: 'Cinéma' },
  { value: 'event_space', label: 'Événements' },
] as const;
