// Base URL for API (no trailing slash). Use VITE_API_BASE_URL or VITE_API_URL; all paths use /api/v1.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_PREFIX = '/api/v1';

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface VenueMediaItem {
  _id: string;
  venueId: string;
  kind: 'HERO_IMAGE' | 'GALLERY_IMAGE' | 'TOUR_360_VIDEO' | 'TOUR_360_EMBED_URL';
  url: string;
}

export interface VirtualTour {
  _id: string;
  venueId: string;
  provider: 'klapty' | 'pannellum' | 'video';
  embedUrl?: string;
  videoUrl?: string;
  previewImage?: string;
  isActive: boolean;
}

export interface TourHotspot {
  _id: string;
  virtualTourId: string;
  label: string;
  targetType: 'table' | 'room' | 'seat_zone' | 'info';
  targetId: string;
  xPercent: number;
  yPercent: number;
  tooltipText?: string;
  isActive: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  type: 'primary' | 'secondary';
  displayOrder?: number;
}

export interface Venue {
  _id: string;
  name: string;
  slug?: string;
  type: 'CAFE' | 'RESTAURANT' | 'HOTEL' | 'CINEMA' | 'EVENT_SPACE';
  city: string;
  address: string;
  description: string;
  shortDescription?: string;
  governorate?: string;
  rating: number;
  startingPrice?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  availableTables?: number;
  hasEvent?: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  media?: VenueMediaItem[];
  tables?: Table[];
  rooms?: Room[];
  seats?: Seat[];
  hotspots?: TableHotspot[];
  virtualTours?: VirtualTour[];
  tourHotspots?: TourHotspot[];
  events?: Event[];
}

export interface Room {
  _id: string;
  venueId: string;
  roomNumber: number;
  roomType: string;
  capacity: number;
  pricePerNight: number;
  status?: 'available' | 'reserved';
}

export interface Seat {
  _id: string;
  venueId: string;
  seatNumber: number;
  zone: string;
  price: number;
  status?: 'available' | 'reserved';
}

export interface Table {
  _id: string;
  venueId: string;
  tableNumber: number;
  capacity: number;
  locationLabel: string;
  price: number;
  isVip?: boolean;
  status?: 'available' | 'reserved';
}

export interface TableHotspot {
  _id: string;
  venueId: string;
  tableId: string | Table;
  sceneId: string;
  pitch: number;
  yaw: number;
  radius?: number;
  label?: string;
}

export interface Event {
  _id: string;
  venueId: string | { _id: string; name: string; address?: string; city?: string };
  title: string;
  type: string;
  startAt: string;
  description: string;
}

export type BookingType = 'TABLE' | 'ROOM' | 'SEAT';

export interface Reservation {
  _id: string;
  userId: string | { _id: string; fullName: string; email: string };
  venueId: string | { _id: string; name: string; address?: string; city?: string };
  bookingType: BookingType;
  tableId?: string | Table;
  roomId?: string | Room;
  seatId?: string | Seat;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  confirmationCode?: string;
  totalPrice?: number;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  partySize?: number;
  createdAt: string;
}

export interface SearchResults {
  lieux: Array<{ type: 'venue'; _id: string; name: string; city: string; venueType: string }>;
  chambres: Array<{ type: 'room'; _id: string; roomNumber: number; roomType: string; venueId: string; venueName: string; city: string }>;
  evenements: Array<{ type: 'event'; _id: string; title: string; startAt: string; venueId: string; venueName: string; city: string }>;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

const AUTH_TOKEN_KEY = 'authToken';

function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE}${API_PREFIX}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.accessToken) {
    setAuthToken(data.accessToken);
    return data.accessToken;
  }
  return null;
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${API_PREFIX}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken) return fetchAPI<T>(endpoint, options, true);
    removeAuthToken();
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const venuesAPI = {
  getAll: (filters?: { type?: string; city?: string; hasEvent?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.hasEvent) params.append('hasEvent', 'true');
    const q = params.toString();
    return fetchAPI<Venue[]>(`/venues${q ? `?${q}` : ''}`);
  },
  getById: (id: string, options?: { startAt?: string; endAt?: string }) => {
    const params = new URLSearchParams();
    if (options?.startAt) params.append('startAt', options.startAt);
    if (options?.endAt) params.append('endAt', options.endAt);
    const q = params.toString();
    return fetchAPI<Venue>(`/venues/${id}${q ? `?${q}` : ''}`);
  },
};

export const tablesAPI = {
  getByVenue: (venueId: string, startAt?: string, endAt?: string) => {
    const params = new URLSearchParams();
    if (startAt) params.append('startAt', startAt);
    if (endAt) params.append('endAt', endAt);
    const q = params.toString();
    return fetchAPI<Table[]>(`/tables/venue/${venueId}${q ? `?${q}` : ''}`);
  },
};

export const eventsAPI = {
  getAll: (filters?: { city?: string; type?: string; venueId?: string; upcoming?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.city) params.append('city', filters.city);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.venueId) params.append('venueId', filters.venueId);
    if (filters?.upcoming !== false) params.append('upcoming', 'true');
    const q = params.toString();
    return fetchAPI<Event[]>(`/events${q ? `?${q}` : ''}`);
  },
  getById: (id: string) => fetchAPI<Event>(`/events/${id}`),
};

export const reservationsAPI = {
  getAll: () => fetchAPI<Reservation[]>('/reservations'),
  getById: (id: string) => fetchAPI<Reservation>(`/reservations/${id}`),
  getTicket: (id: string) =>
    fetchAPI<{
      _id: string;
      confirmationCode?: string;
      qrPayload: string;
      startAt: string;
      endAt: string;
      status: string;
      venueName?: string;
      venueAddress?: string;
      venueCity?: string;
      tableNumber?: number;
      roomNumber?: number;
      seatNumber?: number;
      bookingType?: string;
      totalPrice?: number;
      partySize?: number;
    }>(`/reservations/${id}/ticket`),
  create: (data: {
    venueId: string;
    bookingType: BookingType;
    tableId?: string;
    roomId?: string;
    seatId?: string;
    startAt: string;
    endAt: string;
    totalPrice?: number;
    guestFirstName: string;
    guestLastName: string;
    guestPhone: string;
    partySize: number;
  }) =>
    fetchAPI<{ message: string; reservation: Reservation }>('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancel: (id: string) =>
    fetchAPI<{ message: string; reservation: Reservation }>(`/reservations/${id}/cancel`, {
      method: 'PATCH',
    }),
};

export const searchAPI = {
  search: (q: string) => fetchAPI<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
};

export const categoriesAPI = {
  getAll: () => fetchAPI<Category[]>('/categories'),
};

export interface AdminOverview {
  totalUsers: number;
  newUsers7d: number;
  totalVenues: number;
  totalReservations: number;
  reservationsToday: number;
  reservations7d: number;
  cancellationRate30d: number;
  revenue30d: number;
  activeVenues30d: number;
}

export const adminAPI = {
  getOverview: (range?: string) =>
    fetchAPI<AdminOverview>(`/admin/overview${range ? `?range=${range}` : ''}`),
  getStats: () => fetchAPI<{ totalUsers: number; totalVenues: number; reservationsToday: number; reservationsWeek: number; upcomingEvents: number }>('/admin/stats'),
  getChartsReservationsDaily: (days?: number) => fetchAPI<{ date: string; count: number }[]>(`/admin/charts/reservations-daily?days=${days ?? 30}`),
  getChartsRevenueDaily: (days?: number) => fetchAPI<{ date: string; revenue: number }[]>(`/admin/charts/revenue-daily?days=${days ?? 30}`),
  getChartsReservationsByType: (days?: number) => fetchAPI<{ type: string; count: number; label: string }[]>(`/admin/charts/reservations-by-type?days=${days ?? 30}`),
  getChartsReservationsByCity: (days?: number) => fetchAPI<{ city: string; count: number }[]>(`/admin/charts/reservations-by-city?days=${days ?? 30}`),
  getChartsTopVenues: (days?: number, limit?: number) => fetchAPI<{ venueName: string; city: string; count: number }[]>(`/admin/charts/top-venues?days=${days ?? 30}&limit=${limit ?? 5}`),
  getChartsUsersSignups: (days?: number) => fetchAPI<{ date: string; count: number }[]>(`/admin/charts/users-signups?days=${days ?? 30}`),
  getUsers: (params?: { page?: number; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.append('page', String(params.page));
    if (params?.q) sp.append('q', params.q);
    const q = sp.toString();
    return fetchAPI<{ users: any[]; total: number; page: number; pages: number }>(`/api/admin/users${q ? `?${q}` : ''}`);
  },
  getVenues: (params?: { page?: number; type?: string; city?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.append('page', String(params.page));
    if (params?.type) sp.append('type', params.type);
    if (params?.city) sp.append('city', params.city || '');
    if (params?.q) sp.append('q', params.q);
    const q = sp.toString();
    return fetchAPI<{ venues: Venue[]; total: number; page: number; pages: number }>(`/admin/venues${q ? `?${q}` : ''}`);
  },
  getReservations: (params?: { page?: number; venueId?: string; status?: string; type?: string; city?: string; from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.append('page', String(params.page));
    if (params?.venueId) sp.append('venueId', params.venueId);
    if (params?.status) sp.append('status', params.status);
    if (params?.type) sp.append('type', params.type);
    if (params?.city) sp.append('city', params.city || '');
    if (params?.from) sp.append('from', params.from);
    if (params?.to) sp.append('to', params.to);
    const q = sp.toString();
    return fetchAPI<{ reservations: Reservation[]; total: number; page: number; pages: number }>(`/admin/reservations${q ? `?${q}` : ''}`);
  },
  getEvents: () => fetchAPI<any[]>('/admin/events'),
  cancelReservation: (id: string) =>
    fetchAPI<{ message: string; reservation: Reservation }>(`/admin/reservations/${id}/cancel`, { method: 'PATCH' }),
  getVirtualTours: (venueId: string) =>
    fetchAPI<any[]>(`/admin/virtual-tours?venueId=${encodeURIComponent(venueId)}`),
  createVirtualTour: (data: { venueId: string; provider?: string; embedUrl?: string; videoUrl?: string; isActive?: boolean }) =>
    fetchAPI<any>('/admin/virtual-tours', { method: 'POST', body: JSON.stringify(data) }),
  updateVirtualTour: (id: string, data: Partial<{ embedUrl: string; videoUrl: string; isActive: boolean }>) =>
    fetchAPI<any>(`/admin/virtual-tours/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getTourHotspots: (virtualTourId: string) =>
    fetchAPI<any[]>(`/admin/tour-hotspots?virtualTourId=${encodeURIComponent(virtualTourId)}`),
  createTourHotspot: (data: { virtualTourId: string; label: string; targetType: string; targetId: string; xPercent: number; yPercent: number; tooltipText?: string }) =>
    fetchAPI<any>('/admin/tour-hotspots', { method: 'POST', body: JSON.stringify(data) }),
  updateTourHotspot: (id: string, data: Partial<{ label: string; xPercent: number; yPercent: number; isActive: boolean }>) =>
    fetchAPI<any>(`/admin/tour-hotspots/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTourHotspot: (id: string) =>
    fetchAPI<{ message: string }>(`/admin/tour-hotspots/${id}`, { method: 'DELETE' }),
};

export const authAPI = {
  me: () => fetchAPI<{ id: string; fullName: string; email: string; role: UserRole }>('/api/auth/me'),
  signup: (data: { name: string; email: string; password: string; role?: string }) =>
    fetchAPI<{ message: string; accessToken: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ ...data, fullName: data.name }),
    }),

  login: (email: string, password: string) =>
    fetchAPI<{ message: string; accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    fetchAPI<{ message: string }>('/auth/logout', { method: 'POST' }),
};
