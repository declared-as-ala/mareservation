/** Reservation / discovery categories */
export const CATEGORIES = [
  { id: 'cafe', label: 'Cafés & Lounges', type: 'cafe' },
  { id: 'restaurant', label: 'Restaurants', type: 'restaurant' },
  { id: 'rooftop', label: 'Rooftops', type: 'restaurant' },
  { id: 'event', label: 'Cinéma / Événements', type: 'event' },
  { id: 'hotel', label: 'Hôtels (chambres)', type: 'hotel' },
  { id: 'beach_club', label: 'Beach Clubs', type: 'beach_club' },
  { id: 'spa', label: 'Spas', type: 'spa' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
