export type VenueCategory = 'CAFE' | 'RESTAURANT' | 'HOTEL' | 'CINEMA' | 'EVENT_SPACE' | string;

export function getReservableLabel(category?: VenueCategory): string {
  switch (String(category || '').toUpperCase()) {
    case 'HOTEL':
      return 'chambre';
    case 'CINEMA':
    case 'EVENT_SPACE':
      return 'place';
    default:
      return 'table';
  }
}

export function getReservationCTA(category?: VenueCategory): string {
  return `Reserver une ${getReservableLabel(category)}`;
}

export function getDashboardResourceName(category?: VenueCategory): string {
  const label = getReservableLabel(category);
  return `${label[0].toUpperCase()}${label.slice(1)}s`;
}
