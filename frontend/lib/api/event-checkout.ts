import { apiPostRaw } from './client';

export async function createEventOrder(payload: {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  paymentMethod?: 'online_mock' | 'cash_order';
}) {
  return apiPostRaw<{
    success?: boolean;
    data?: {
      reservationId: string;
      reservationCode: string;
      confirmationCode: string;
      eventTitle?: string;
      ticketTypeName?: string;
      quantity?: number;
      subtotal?: number;
      serviceFee?: number;
      totalPrice: number;
      paymentStatus: string;
      cashExpiresAt?: string;
      qrCodeImageUrl?: string;
    };
  }>('/event-checkout/orders', payload);
}
