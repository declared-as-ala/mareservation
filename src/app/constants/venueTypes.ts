/** Backend venue type enum (uppercase). French labels for UI. */
export type VenueType = 'CAFE' | 'RESTAURANT' | 'HOTEL' | 'CINEMA' | 'EVENT_SPACE';

export const VENUE_TYPE_LABELS: Record<string, string> = {
  CAFE: 'Café',
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hôtel',
  CINEMA: 'Cinéma',
  EVENT_SPACE: 'Événements',
};

/** Options for Explorer Type filter: value sent to API (lowercase, backend uppercases), label in French */
export const EXPLORER_TYPE_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'cafe', label: 'Café' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'cinema', label: 'Cinéma' },
  { value: 'event_space', label: 'Événements' },
] as const;
