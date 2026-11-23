/** The 24 governorates of Tunisia (official names, French spelling). */
export const TUNISIA_GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan', 'Kasserine', 'Kébili',
  'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse',
  'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
] as const;

/** Normalised amenity keys used by search filters (stored in Venue.features). */
export const FEATURE_KEYS = [
  'pool', 'parking', 'wifi', 'air_conditioning', 'garden', 'sea_view', 'mountain_view', 'breakfast', 'pets_allowed',
  // Character tags (set by the owner/admin; used by the home-page categories)
  'beachfront', 'traditional', 'luxury', 'family_friendly', 'romantic',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
