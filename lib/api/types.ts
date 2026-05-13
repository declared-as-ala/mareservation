// Shared types aligned with backend models (ids as strings for JSON)

export type VenueType = 'CAFE' | 'RESTAURANT' | 'HOTEL' | 'CINEMA' | 'EVENT_SPACE';

export interface VenueMediaItem {
  _id: string;
  venueId: string;
  kind: string;
  url: string;
}

export interface VirtualTour {
  _id: string;
  venueId: string;
  title?: string;
  sourceType?: 'uploaded_video' | 'panorama_image' | 'custom_embed';
  mediaUrl?: string;
  embedUrl?: string;
  videoUrl?: string;
  previewImage?: string;
  posterImageUrl?: string;
  isActive: boolean;
  isDefault?: boolean;
}

export type PositionType = 'yaw_pitch' | 'matterport_anchor';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface TablePlacement {
  _id: string;
  venueId: string;
  tableId: string;
  virtualTourId?: string;
  sceneId: string;
  positionType: PositionType;
  floorIndex?: number;
  yaw?: number;
  pitch?: number;
  anchorPosition?: Vector3;
  stemVector?: Vector3;
}

export interface Venue {
  _id: string;
  name: string;
  slug?: string;
  type: VenueType;
  shortDescription?: string;
  description: string;
  city: string;
  governorate?: string;
  address: string;
  phone?: string;
  coordinates?: { lat?: number; lng?: number };
  coverImage?: string;
  gallery?: string[];
  startingPrice?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  isVedette?: boolean;
  vedetteOrder?: number;
  bannerImage?: string;
  hasVirtualTour?: boolean;
  immersiveType?: 'none' | 'virtual-tour' | 'view-360';
  immersiveSourceType?: 'url' | 'upload' | null;
  /** @deprecated provider selection removed from admin — always 'custom' for new venues */
  immersiveProvider?: 'custom' | 'matterport' | 'klapty';
  immersiveUrl?: string | null;
  immersiveFile?: string | null;
  immersiveMeta?: Record<string, unknown> | null;
  availableTables?: number;
  hasEvent?: boolean;
  media?: VenueMediaItem[];
  virtualTours?: VirtualTour[];
  tablePlacements?: TablePlacement[];
  tables?: unknown[];
  rooms?: unknown[];
  seats?: unknown[];
  events?: Event[];
}

export interface Event {
  _id: string;
  venueId: string | { _id: string; name: string; city?: string; address?: string };
  title: string;
  type: string;
  slug?: string;
  startAt: string;
  endAt?: string;
  description: string;
  imageUrl?: string;
  isVedette?: boolean;
}

export interface EventSession {
  _id: string;
  eventId: string;
  startAt: string;
  endAt?: string;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
export type BookingType = 'TABLE' | 'ROOM' | 'SEAT';

export interface Reservation {
  _id: string;
  userId: string | { _id: string; fullName: string; email: string };
  venueId: string | { _id: string; name: string; city?: string; address?: string };
  tableId?: unknown;
  roomId?: unknown;
  seatId?: unknown;
  reservableUnitId?: string;
  bookingType: BookingType;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  confirmationCode?: string;
  reservationCode?: string;
  totalPrice?: number;
  partySize?: number;
  paymentStatus?: string;
  qrCodeData?: string;
  qrCodeImageUrl?: string;
  checkInStatus?: 'not_checked_in' | 'checked_in';
  checkedInAt?: string;
}

// ── Hotel-specific types ─────────────────────────────────────────────────────

export type HotelRoomType =
  | 'STANDARD'
  | 'SUPERIOR'
  | 'DELUXE'
  | 'SUITE'
  | 'JUNIOR_SUITE'
  | 'PRESIDENTIAL_SUITE'
  | 'VILLA'
  | 'APARTMENT'
  | 'PENTHOUSE'
  | 'BUNGALOW';

export interface HotelRoom {
  _id: string;
  venueId: string;
  name?: string;
  roomNumber: number;
  roomType: string;
  capacityAdults?: number;
  capacityChildren?: number;
  capacity: number;
  bedType?: string;
  pricePerNight: number;
  surface?: number;
  floor?: number;
  view?: string;
  amenities: string[];
  services?: string[];
  isActive: boolean;
  isReservable: boolean;
  coverImage?: string;
  gallery: string[];
  description?: string;
  hasVirtualTour?: boolean;
  virtualTourUrl?: string;
  panoramicImages?: string[];
  defaultStatus?: 'available' | 'reserved' | 'blocked';
  /** Dynamically computed when fetched with availability window */
  status?: 'available' | 'reserved' | 'blocked';
  isVip?: boolean;
  bathroomType?: string;
  hasBalcony?: boolean;
  smokingAllowed?: boolean;
  minimumNights?: number;
}

export interface HotelAvailabilityParams {
  checkIn: string;
  checkOut: string;
  guests?: number;
}

export interface HotelBookingPayload {
  venueId: string;
  roomId: string;
  startAt: string;
  endAt: string;
  partySize: number;
  bookingType: 'ROOM';
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  guestEmail?: string;
  specialRequests?: string;
}

export interface HotelAmenityGroup {
  label: string;
  icon: string;
  items: string[];
}

export interface HotelSearchFilters {
  governorate?: string;
  q?: string;
  priceMin?: number;
  priceMax?: number;
  starRating?: number;
  hasVirtualTour?: boolean;
  amenities?: string[];
}

export interface Scene {
  _id: string;
  venueId: string;
  name: string;
  description?: string;
  image: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  type?: string;
  displayOrder?: number;
}

export interface Tag {
  _id: string;
  name: string;
  slug: string;
}

export interface HomepageConfig {
  siteName?: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  supportPhone?: string;
  supportEmail?: string;
  defaultLanguage?: string;
  homeSectionsOrder?: string[];
  bannerSlides?: BannerSlide[];
}

export type MenuCategory = 'entree' | 'plat' | 'dessert' | 'boisson' | 'autre';

export interface MenuItem {
  _id: string;
  venueId: string;
  name: string;
  description?: string;
  price: number;
  category: MenuCategory;
  image?: string;
  isAvailable: boolean;
  isPopular: boolean;
  allergens?: string[];
}

export interface BannerSlide {
  _id: string;
  titleFr: string;
  subtitleFr?: string;
  ctaLabelFr?: string;
  ctaUrl?: string;
  imageUrlDesktop: string;
  imageUrlMobile?: string;
  type: string;
  linkedEventId?: string;
  linkedVenueId?: string;
  sortOrder: number;
  isActive: boolean;
}
