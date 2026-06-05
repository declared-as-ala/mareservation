'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { PublicTablePlacement } from '@/lib/api/venues';
import type { Venue, MenuItem, MenuCategory } from '@/lib/api/types';
import { fetchVenueMenu } from '@/lib/api/menu';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { createReservation } from '@/lib/api/reservations';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getReservableLabel, getReservationCTA } from '@/lib/reservation-labels';
import {
  Users, ShoppingCart, CreditCard, Crown,
  Calendar, Clock, Minus, Plus, Phone, Loader2, UtensilsCrossed,
} from 'lucide-react';

const CATEGORY_LABELS: Record<MenuCategory, string> = {
  entree: 'Entrées', plat: 'Plats', dessert: 'Desserts', boisson: 'Boissons', autre: 'Autres',
};
const CATEGORY_ORDER: MenuCategory[] = ['entree', 'plat', 'dessert', 'boisson', 'autre'];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function buildIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const lastName = parts.slice(1).join(' ') || (parts[0] ?? '');
  return { firstName: parts[0] ?? '', lastName };
}

export type TableReservationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement: PublicTablePlacement;
  venue: Venue;
  imageUrl?: string;
  initialStartAt: string;
  initialEndAt: string;
};

export function TableReservationModal({
  open, onOpenChange, placement, venue, imageUrl, initialStartAt,
}: TableReservationModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem, openDrawer } = useCartStore();

  const isAvailable = placement.table.status === 'available';
  const reservableLabel = getReservableLabel(venue.type);
  const tableLabel  = placement.table.name || `Table ${placement.table.tableNumber}`;
  const tablePrice  = placement.table.price ?? venue.startingPrice ?? 0;
  const minimumSpend = (placement.table as { minimumSpend?: number }).minimumSpend ?? tablePrice;
  const maxCapacity  = placement.table.capacity ?? 20;

  // ── State ──────────────────────────────────────────────────────────────────
  const [orderMode, setOrderMode] = useState<'table_only' | 'with_menu'>('table_only');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime]     = useState('21:30');
  const [partySize, setPartySize] = useState(2);
  const [guestPhone, setGuestPhone] = useState('');
  const [showPhone, setShowPhone]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [menuQty, setMenuQty]       = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    const d = new Date(initialStartAt);
    const s = d.toISOString().slice(0, 10);
    setSelectedDate(s >= todayStr() ? s : todayStr());
    setStartTime('19:00');
    setEndTime('21:30');
    setPartySize(2);
    setGuestPhone('');
    setShowPhone(false);
    setLoading(false);
    setOrderMode('table_only');
    setMenuQty({});
  }, [open, initialStartAt]);

  const { data: menuData = [] } = useQuery({
    queryKey: ['venue-menu', venue._id],
    queryFn: () => fetchVenueMenu(venue._id),
    enabled: open && orderMode === 'with_menu',
    staleTime: 5 * 60 * 1000,
  });

  const startAtIso = buildIso(selectedDate, startTime);
  const endAtIso   = buildIso(selectedDate, endTime);

  const menuTotal = menuData.reduce((acc, item) => acc + (menuQty[item._id] ?? 0) * item.price, 0);
  const selectedMenuItems = menuData
    .filter((item) => (menuQty[item._id] ?? 0) > 0)
    .map((item) => ({ itemId: item._id, name: item.name, quantity: menuQty[item._id], unitPrice: item.price, category: item.category }));
  const menuMeetsMinimum = menuTotal >= minimumSpend || minimumSpend === 0;

  function changeQty(id: string, delta: number) {
    setMenuQty((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  }

  // ── Add to cart ────────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (!isAvailable) return;
    if (orderMode === 'with_menu') {
      if (!selectedMenuItems.length) { toast.error('Sélectionnez au moins un article.'); return; }
      if (!menuMeetsMinimum) { toast.error(`Minimum ${minimumSpend} TND requis.`); return; }
    }
    const base = {
      id: `venue-${venue._id}-table-${placement.table._id}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type: (venue.type === 'HOTEL' ? 'venue_room' : 'venue_table') as 'venue_room' | 'venue_table',
      title: venue.name,
      imageUrl: imageUrl,
      unitLabel: tableLabel,
      unitType: venue.type,
      dateTime: startAtIso,
      endAt: endAtIso,
      quantity: partySize,
      venueId: venue._id,
      tableId: placement.table._id,
      slug: venue.slug,
    };
    if (orderMode === 'with_menu') {
      addItem({ ...base, price: menuTotal, orderType: 'with_menu', menuItems: selectedMenuItems, menuTotal });
    } else {
      addItem({ ...base, price: tablePrice, orderType: 'table_only' });
    }
    onOpenChange(false);
    openDrawer();
  };

  // ── Direct reserve ─────────────────────────────────────────────────────────
  const handleReserve = async () => {
    if (!isAvailable) return;
    if (!user) { router.push(`/login?returnTo=${encodeURIComponent(`/explorer?venue=${venue.slug||venue._id}`)}`); return; }
    if (user.emailVerified === false) {
      toast.error('Verifiez votre email avant de reserver.');
      router.push('/email-verified?success=false');
      return;
    }
    if (!showPhone) { setShowPhone(true); return; }
    if (!guestPhone.trim()) { toast.error('Numéro de téléphone requis.'); return; }
    if (orderMode === 'with_menu' && !menuMeetsMinimum) { toast.error(`Minimum ${minimumSpend} TND requis.`); return; }
    setLoading(true);
    try {
      const { firstName, lastName } = splitFullName(user.fullName);
      const result = await createReservation({
        venueId: venue._id, bookingType: 'TABLE', tableId: placement.table._id,
        startAt: startAtIso, endAt: endAtIso, partySize,
        guestFirstName: firstName, guestLastName: lastName,
        guestPhone: guestPhone.trim(), guestEmail: user.email,
      });
      toast.success('Réservation confirmée !');
      onOpenChange(false);
      if (result._id) router.push(`/reservation/${result._id}/confirmation`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Échec de la réservation.');
    } finally { setLoading(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-0 max-h-[92vh] overflow-y-auto">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <SheetHeader className="px-5 pt-2 pb-0">
          <SheetTitle className="text-zinc-100 text-base font-semibold">{getReservationCTA(venue.type)}</SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5 pb-8">

          {/* ── Table info card ── */}
          <div className={`rounded-2xl border p-4 flex items-center gap-4 ${isAvailable ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/60'}`}>
            <div className={`size-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl font-black ${isAvailable ? 'bg-amber-400/15 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
              {placement.table.tableNumber ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-100 text-sm">{tableLabel}</h3>
                {placement.table.isVip && <Crown className="size-3.5 text-amber-400" />}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{venue.name}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1 text-zinc-500"><Users className="size-3" />{placement.table.capacity} pers. max</span>
                {tablePrice > 0 && <span className="font-semibold text-amber-400">{tablePrice} TND min.</span>}
              </div>
            </div>
            <div className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${isAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <span className={`size-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {isAvailable ? 'Disponible' : 'Réservée'}
            </div>
          </div>

          {!isAvailable && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500 flex-shrink-0" />
              Cette {reservableLabel} n&apos;est pas disponible pour le moment.
            </div>
          )}

          {isAvailable && (<>

            {/* ── Date + Time ── */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                <Calendar className="size-3.5" /> Date &amp; Horaire
              </label>
              <input
                type="date"
                value={selectedDate}
                min={todayStr()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-100 [color-scheme:dark] focus:outline-none focus:border-amber-400/50 transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <Clock className="size-3" /> Arrivée
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-100 [color-scheme:dark] focus:outline-none focus:border-amber-400/50 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <Clock className="size-3" /> Départ
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-100 [color-scheme:dark] focus:outline-none focus:border-amber-400/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ── Party size ── */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                <Users className="size-3.5" /> Personnes
              </label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                  className="size-10 rounded-xl border border-zinc-700 bg-zinc-800/60 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-all">
                  <Minus className="size-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-black text-zinc-100 tabular-nums">{partySize}</span>
                  <span className="text-xs text-zinc-500 ml-2">/ {maxCapacity} max</span>
                </div>
                <button type="button" onClick={() => setPartySize((n) => Math.min(maxCapacity, n + 1))}
                  className="size-10 rounded-xl border border-zinc-700 bg-zinc-800/60 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-all">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* ── Mode selector ── */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Mode de réservation</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setOrderMode('table_only')}
                  className={`rounded-2xl border p-4 text-left transition-all ${orderMode === 'table_only' ? 'border-amber-400/60 bg-amber-400/10' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'}`}>
                  <div className="text-xl mb-1.5">🪑</div>
                  <div className="text-xs font-bold text-zinc-100">Réservation simple</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Commandez sur place</div>
                  {tablePrice > 0 && <div className="text-[10px] font-semibold text-amber-400 mt-2">Min. {tablePrice} TND</div>}
                </button>
                <button type="button" onClick={() => setOrderMode('with_menu')}
                  className={`rounded-2xl border p-4 text-left transition-all ${orderMode === 'with_menu' ? 'border-amber-400/60 bg-amber-400/10' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'}`}>
                  <div className="text-xl mb-1.5">🍽️</div>
                  <div className="text-xs font-bold text-zinc-100">Commander le menu</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Choisissez vos plats</div>
                  {menuTotal > 0
                    ? <div className={`text-[10px] font-semibold mt-2 ${menuMeetsMinimum ? 'text-emerald-400' : 'text-amber-400'}`}>Total : {menuTotal.toFixed(2)} TND</div>
                    : minimumSpend > 0 && <div className="text-[10px] font-semibold text-zinc-500 mt-2">Min. {minimumSpend} TND</div>}
                </button>
              </div>
            </div>

            {/* ── Menu items ── */}
            {orderMode === 'with_menu' && (
              <div className="space-y-3">
                {minimumSpend > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Total sélectionné</span>
                      <span className={menuMeetsMinimum ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {menuTotal.toFixed(2)} / {minimumSpend} TND
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${menuMeetsMinimum ? 'bg-emerald-500' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(100, (menuTotal / minimumSpend) * 100)}%` }} />
                    </div>
                    {!menuMeetsMinimum && (
                      <p className="text-[10px] text-amber-400">Encore {(minimumSpend - menuTotal).toFixed(2)} TND pour atteindre le minimum.</p>
                    )}
                  </div>
                )}
                {menuData.length === 0 ? (
                  <div className="flex items-center justify-center rounded-xl border border-zinc-800 py-8 text-sm text-zinc-500 gap-2">
                    <UtensilsCrossed className="size-4" /> Aucun article disponible.
                  </div>
                ) : (
                  CATEGORY_ORDER.filter((cat) => menuData.some((i) => i.category === cat)).map((cat) => (
                    <div key={cat}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">{CATEGORY_LABELS[cat]}</p>
                      <div className="space-y-2">
                        {menuData.filter((i) => i.category === cat).map((item: MenuItem) => {
                          const qty = menuQty[item._id] ?? 0;
                          return (
                            <div key={item._id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-zinc-100 truncate">{item.name}</span>
                                  {item.isPopular && <span className="text-[9px] bg-amber-400/15 text-amber-400 rounded-full px-1.5 py-0.5 font-bold flex-shrink-0">★</span>}
                                </div>
                                {item.description && <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{item.description}</p>}
                                <span className="text-xs font-bold text-amber-400 mt-0.5 block">{item.price.toFixed(2)} TND</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button type="button" onClick={() => changeQty(item._id, -1)} disabled={qty === 0}
                                  className="size-7 rounded-lg border border-zinc-700 bg-zinc-800/60 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 disabled:opacity-30 transition-all">
                                  <Minus className="size-3" />
                                </button>
                                <span className="text-sm font-bold text-zinc-100 tabular-nums min-w-[16px] text-center">{qty}</span>
                                <button type="button" onClick={() => changeQty(item._id, 1)}
                                  className="size-7 rounded-lg border border-zinc-700 bg-zinc-800/60 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-all">
                                  <Plus className="size-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Phone (progressive) ── */}
            {showPhone && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  <Phone className="size-3.5" /> Téléphone
                </label>
                <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="ex: 12 345 678" autoFocus
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors" />
              </div>
            )}

            {/* ── Summary ── */}
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3 flex items-center justify-between text-xs text-zinc-500">
              <span>📅 {selectedDate} · {startTime} → {endTime}</span>
              <span>{partySize} pers.{orderMode === 'with_menu' && menuTotal > 0 ? ` · ${menuTotal.toFixed(2)} TND` : tablePrice > 0 ? ` · ${tablePrice} TND min.` : ''}</span>
            </div>

            {/* ── CTAs ── */}
            <div className="flex gap-3">
              <button type="button" onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold py-3.5 text-sm transition-all shadow-lg shadow-amber-400/20 active:scale-[0.98]">
                <ShoppingCart className="size-4" /> Ajouter au panier
              </button>
              <button type="button" onClick={handleReserve} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-3.5 text-sm transition-all active:scale-[0.98] disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                {showPhone ? 'Confirmer' : 'Réserver'}
              </button>
            </div>

          </>)}

          {!isAvailable && (
            <button type="button" onClick={() => onOpenChange(false)}
              className="w-full rounded-xl border border-zinc-800 py-3 text-sm text-zinc-500 hover:bg-zinc-800/60 transition-colors">
              Fermer
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
