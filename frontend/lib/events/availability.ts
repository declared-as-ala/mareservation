export type TicketTypeLike = {
  capacity?: number;
  sold?: number;
  isActive?: boolean;
  price?: number;
};

export function ticketRemaining(ticket: TicketTypeLike): number {
  return Math.max(0, Number(ticket.capacity || 0) - Number(ticket.sold || 0));
}

export function getEventAvailability(ticketTypes?: TicketTypeLike[]): {
  hasTickets: boolean;
  totalCapacity: number;
  totalSold: number;
  remaining: number;
  isSoldOut: boolean;
  percentSold: number;
} {
  const active = (ticketTypes ?? []).filter((t) => t.isActive !== false);
  const totalCapacity = active.reduce((s, t) => s + Number(t.capacity || 0), 0);
  const totalSold = active.reduce((s, t) => s + Number(t.sold || 0), 0);
  const remaining = active.reduce((s, t) => s + ticketRemaining(t), 0);
  return {
    hasTickets: active.length > 0,
    totalCapacity,
    totalSold,
    remaining,
    isSoldOut: active.length > 0 && remaining === 0,
    percentSold: totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0,
  };
}

export function minTicketPrice(ticketTypes?: TicketTypeLike[]): number | null {
  const prices = (ticketTypes ?? [])
    .filter((t) => t.isActive !== false)
    .map((t) => Number(t.price || 0))
    .filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
}
