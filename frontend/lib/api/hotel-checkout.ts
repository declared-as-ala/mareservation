import { api, apiGetRaw } from './client';
import { API_BASE } from './base-url';

export type PaymentOption = 'online' | 'deposit' | 'pay_at_hotel';

export interface HotelCheckoutHold {
  _id: string;
  expiresAt: string;
  ttlMinutes: number;
  nights: number;
  pricePerNight: number;
}

export interface HotelCheckoutExtra {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit?: 'once' | 'per_night' | 'per_person';
}

export interface HotelCheckoutGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country?: string;
  city?: string;
  bookerFirstName?: string;
  bookerLastName?: string;
  bookerPhone?: string;
  idNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  adults?: number;
  children?: number;
  childrenAges?: number[];
}

export interface HotelCheckoutConfirmPayload {
  holdId: string;
  paymentOption: PaymentOption;
  promoCode?: string;
  guest: HotelCheckoutGuest;
  extras?: HotelCheckoutExtra[];
  arrivalTime?: string;
  specialRequest?: string;
  needBabyBed?: boolean;
  needExtraBed?: boolean;
  accessibilityRequest?: string;
  acceptedHotelPolicy: boolean;
  acceptedPlatformTerms: boolean;
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export async function createHotelHold(body: {
  venueId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  rooms?: number;
}): Promise<HotelCheckoutHold> {
  const res = await api.post<{ data?: HotelCheckoutHold }>('/hotel-checkout/hold', body);
  const data = unwrap<HotelCheckoutHold>(res);
  if (!data?._id) throw new Error('Hold creation failed');
  return data;
}

export async function releaseHotelHold(holdId: string): Promise<void> {
  await api.delete(`/hotel-checkout/hold/${holdId}`);
}

export async function confirmHotelCheckout(body: HotelCheckoutConfirmPayload): Promise<{
  _id: string;
  reservationCode: string;
  confirmationCode: string;
  status: string;
  paymentStatus: string;
}> {
  const res = await api.post<{ data?: any }>('/hotel-checkout/confirm', body);
  const data = unwrap<any>(res);
  if (!data?._id) throw new Error('Confirmation failed');
  return data;
}

export async function fetchHotelTicket(reservationId: string): Promise<any> {
  const raw = await apiGetRaw<any>(`/hotel-checkout/ticket/${reservationId}`);
  return unwrap(raw);
}

export function getCalendarIcsUrl(reservationId: string): string {
  return `${API_BASE}/api/v1/hotel-checkout/calendar/${reservationId}.ics`;
}
