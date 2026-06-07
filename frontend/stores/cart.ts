'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '@/lib/api/base-url';

export type CartItemType = 'venue_table' | 'venue_room' | 'venue_coworking' | 'event_ticket';

export interface CartOrderMenuItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category: string;
}

export interface CartItem {
  id: string;
  type: CartItemType;
  title: string;
  imageUrl?: string;
  unitLabel: string;
  unitType: string;
  dateTime: string;
  endAt?: string;
  price: number;
  quantity: number;
  /** For linking back to venue/event */
  venueId?: string;
  tableId?: string;
  roomId?: string;
  seatId?: string;
  reservableUnitId?: string;
  eventId?: string;
  slug?: string;
  orderType?: 'table_only' | 'with_menu';
  menuItems?: CartOrderMenuItem[];
  menuTotal?: number;
  holdId?: string;
  holdExpiresAt?: string;
  coworkingDurationType?: 'hourly' | 'half_day' | 'full_day';
  coworkingHours?: number;
  coworkingAddons?: Array<{ key: string; name: string; quantity: number; unitPrice: number }>;
  coworkingAddonsTotal?: number;
}

/** Cart items expire after 24 hours (in milliseconds). */
const CART_EXPIRY_MS = 24 * 60 * 60 * 1000;
function releaseHold(holdId?: string) {
  if (!holdId) return;
  void fetch(`${API_BASE}/api/v1/reservations/holds/${holdId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => undefined);
}

type CartState = {
  items: CartItem[];
  /** Timestamp when the cart was last modified — used for expiry. */
  lastModified: number;
  /** UI state: whether the cart drawer is open */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalQuantity: () => number;
  totalAmount: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastModified: Date.now(),
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      addItem: (payload) => {
        // Expire stale items before adding new ones
        const now = Date.now();
        const state = get();
        if (state.lastModified && now - state.lastModified > CART_EXPIRY_MS) {
          state.items.forEach((item) => releaseHold(item.holdId));
          set({ items: [], lastModified: now });
        }
        const quantity = payload.quantity ?? 1;
        const existing = get().items.find((i) => i.id === payload.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === payload.id ? { ...i, quantity: i.quantity + quantity } : i
            ),
            lastModified: now,
          });
        } else {
          set({ items: [...get().items, { ...payload, quantity }], lastModified: now });
        }
      },
      removeItem: (id) => {
        const existing = get().items.find((i) => i.id === id);
        releaseHold(existing?.holdId);
        set({ items: get().items.filter((i) => i.id !== id), lastModified: Date.now() });
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          const existing = get().items.find((i) => i.id === id);
          releaseHold(existing?.holdId);
          set({ items: get().items.filter((i) => i.id !== id), lastModified: Date.now() });
          return;
        }
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
          lastModified: Date.now(),
        });
      },
      clearCart: () => {
        get().items.forEach((item) => releaseHold(item.holdId));
        set({ items: [], lastModified: Date.now() });
      },
      totalQuantity: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      totalAmount: () =>
        get().items.reduce((acc, i) => acc + i.price * i.quantity + (i.menuTotal ?? 0), 0),
    }),
    {
      name: 'ma-reservation-cart',
      // Don't persist UI state
      partialize: (state) => ({ items: state.items, lastModified: state.lastModified }),
    }
  )
);
