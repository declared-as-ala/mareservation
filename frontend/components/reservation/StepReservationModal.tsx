'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicTablePlacement } from '@/lib/api/venues';
import type { Venue, MenuItem, MenuCategory } from '@/lib/api/types';
import { fetchVenueMenu } from '@/lib/api/menu';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import {
  createReservation,
  fetchTableSlots,
} from '@/lib/api/reservations';
import { toast } from 'sonner';
import {
  Users, Crown, Calendar, Clock, Phone, Loader2,
  UtensilsCrossed, CheckCircle2, ArrowLeft, ArrowRight,
  Minus, Plus, ShoppingCart, CreditCard, X,
  MapPin, Star, ChefHat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReservableLabel, getReservationCTA } from '@/lib/reservation-labels';

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<MenuCategory, string> = {
  entree: 'Entrées', plat: 'Plats', dessert: 'Desserts', boisson: 'Boissons', autre: 'Autres',
};
const CATEGORY_ORDER: MenuCategory[] = ['entree', 'plat', 'dessert', 'boisson', 'autre'];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function buildIso(date: string, time: string): string {
  if (!date || !time) return new Date().toISOString();
  const d = new Date(`${date}T${time}:00`);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}
function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') || (parts[0] ?? '') };
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatRange(startIso: string, endIso: string) {
  return `${fmtTime(startIso)} – ${fmtTime(endIso)}`;
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Types ──────────────────────────────────────────────────────────────────

export type StepReservationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement: PublicTablePlacement;
  venue: Venue;
  imageUrl?: string;
  initialStartAt: string;
  initialEndAt: string;
};

const STEPS = [
  { id: 0, label: 'Table',     icon: MapPin },
  { id: 1, label: 'Horaire',   icon: Clock },
  { id: 2, label: 'Options',   icon: ChefHat },
  { id: 3, label: 'Confirmer', icon: CheckCircle2 },
];

// ── Date strip helpers ───────────────────────────────────────────────────────
function getDayStrip(count = 14): { label: string; short: string; value: string; day: number }[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short' });
    const short = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return { label: label.charAt(0).toUpperCase() + label.slice(1, 3), short, value, day: d.getDate() };
  });
}

// ── Simple time slot picker ───────────────────────────────────────────────────

function SimpleTimePicker({
  slots,
  selectedTime,
  onSelect,
  emptyMessage,
}: {
  slots: { time: string; available: boolean }[];
  selectedTime: string;
  onSelect: (time: string) => void;
  emptyMessage?: string;
}) {
  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
        {emptyMessage ?? 'Aucun créneau disponible pour cette date.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5">
        <Clock className="size-4 text-amber-400 shrink-0" />
        <span className={cn(
          'font-mono text-xl font-black tabular-nums tracking-wider',
          selectedTime ? 'text-amber-400' : 'text-neutral-600'
        )}>
          {selectedTime || '--:--'}
        </span>
        {selectedTime && (
          <span className="ml-auto text-[11px] text-neutral-500 font-medium">Arrivée prévue</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot) => {
          const isSelected = slot.time === selectedTime;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={!slot.available}
              onClick={() => slot.available && onSelect(slot.time)}
              className={cn(
                'rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all duration-150',
                isSelected
                  ? 'border-amber-400 bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-105'
                  : slot.available
                  ? 'border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:border-amber-400/30 hover:bg-amber-400/5 hover:text-amber-300 cursor-pointer'
                  : 'border-white/[0.04] bg-transparent text-neutral-700 line-through cursor-not-allowed opacity-35'
              )}
            >
              {slot.time.slice(0, 5)}
            </button>
          );
        })}
      </div>

      {!selectedTime && (
        <p className="text-center text-[11px] text-neutral-600">Sélectionnez un créneau disponible</p>
      )}
    </div>
  );
}

// ── Step indicator ──────────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center w-full gap-0">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className={cn(
              'flex flex-col items-center gap-1 flex-shrink-0',
              active ? 'text-amber-400' : done ? 'text-emerald-400' : 'text-neutral-700'
            )}>
              <div className={cn(
                'flex items-center justify-center size-8 rounded-full text-xs font-bold ring-2 transition-all duration-300',
                active
                  ? 'bg-amber-400 text-black ring-amber-400/30 shadow-lg shadow-amber-400/25'
                  : done
                  ? 'bg-emerald-500 text-black ring-emerald-500/20'
                  : 'bg-white/[0.05] text-neutral-600 ring-white/[0.05]'
              )}>
                {done ? <CheckCircle2 className="size-4" /> : i + 1}
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider hidden sm:block">
                {step.label}
              </span>
            </div>
            {i < total - 1 && (
              <div className="flex-1 mx-1 h-px transition-all duration-500">
                <div className={cn(
                  'h-px w-full rounded-full transition-all duration-500',
                  done ? 'bg-emerald-500' : 'bg-white/[0.08]'
                )} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Menu item row ──────────────────────────────────────────────────────────

function MenuItemRow({
  item,
  qty,
  onChangeQty,
}: {
  item: MenuItem;
  qty: number;
  onChangeQty: (delta: number) => void;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border p-3 transition-all duration-200',
      qty > 0
        ? 'border-amber-400/25 bg-amber-400/5'
        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]'
    )}>
      {item.isPopular && (
        <div className="shrink-0 flex size-8 items-center justify-center rounded-lg bg-amber-400/10">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-100 truncate">{item.name}</span>
        </div>
        {item.description && (
          <p className="text-[11px] text-neutral-600 mt-0.5 truncate leading-tight">{item.description}</p>
        )}
        <span className="text-xs font-bold text-amber-400 mt-0.5 block">{item.price.toFixed(2)} DT</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onChangeQty(-1)}
          disabled={qty === 0}
          aria-label="Retirer"
          className="flex size-7 items-center justify-center rounded-lg border border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-white disabled:opacity-25 transition-all"
        >
          <Minus className="size-3.5" />
        </button>
        <span className={cn(
          'w-5 text-center text-sm font-bold tabular-nums transition-colors',
          qty > 0 ? 'text-amber-400' : 'text-neutral-700'
        )}>
          {qty}
        </span>
        <button
          type="button"
          onClick={() => onChangeQty(1)}
          aria-label="Ajouter"
          className="flex size-7 items-center justify-center rounded-lg border border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-white transition-all"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function StepReservationModal({
  open, onOpenChange, placement, venue, imageUrl, initialStartAt,
}: StepReservationModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem, openDrawer } = useCartStore();

  const isAvailable = placement.table.status === 'available';
  const reservableLabel = getReservableLabel(venue.type);
  const tableLabel = placement.table.name || `Table ${placement.table.tableNumber}`;
  const tablePrice = placement.table.price ?? venue.startingPrice ?? 0;
  const minimumSpend = (placement.table as { minimumSpend?: number }).minimumSpend ?? tablePrice;
  const maxCapacity = placement.table.capacity ?? 20;

  const STEPS_COUNT = 4;
  const [step, setStep] = useState(0);

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(() => todayStr());
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);
  const [guestPhone, setGuestPhone] = useState('');
  const [orderMode, setOrderMode] = useState<'table_only' | 'with_menu'>('table_only');
  const [menuQty, setMenuQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    const d = new Date(initialStartAt);
    const s = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : todayStr();
    setSelectedDate(s >= todayStr() ? s : todayStr());
    setSelectedTime('19:00');
    setPartySize(Math.min(2, maxCapacity));
    setGuestPhone('');
    setOrderMode('table_only');
    setMenuQty({});
    setStep(0);
    setLoading(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: menuData = [] } = useQuery({
    queryKey: ['venue-menu', venue._id],
    queryFn: () => fetchVenueMenu(venue._id),
    enabled: open && orderMode === 'with_menu',
    staleTime: 5 * 60 * 1000,
  });

  // Real availability for THIS table on the chosen day (open/close hours, slot
  // step, reservation duration — all from the venue's table policy).
  const { data: slotData } = useQuery({
    queryKey: ['table-slots', venue._id, placement.table._id, selectedDate],
    queryFn: () => fetchTableSlots(venue._id, placement.table._id, selectedDate),
    enabled: open && !!placement.table._id && !!selectedDate,
    staleTime: 15_000,
  });
  const availableSlots = slotData?.slots ?? [];
  const durationMinutes = slotData?.durationMinutes ?? 240;
  const durationHours = Math.round((durationMinutes / 60) * 10) / 10;

  // Keep the selected time valid: if it's taken/missing once slots load, snap to
  // the first available slot.
  useEffect(() => {
    if (!availableSlots.length) return;
    const current = availableSlots.find((s) => s.time === selectedTime);
    if (!current || !current.available) {
      const firstFree = availableSlots.find((s) => s.available);
      if (firstFree) setSelectedTime(firstFree.time);
    }
  }, [slotData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Book the EXACT instant the slots endpoint evaluated (venue timezone), so a
  // slot shown as free can never 409 on create due to a server/client TZ gap.
  const selectedSlot = availableSlots.find((s) => s.time === selectedTime);
  const startAtIso = selectedSlot?.startAt ?? buildIso(selectedDate, selectedTime);
  const endAtIso = selectedSlot?.endAt
    ?? new Date(new Date(startAtIso).getTime() + durationMinutes * 60 * 1000).toISOString();

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

  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return isAvailable;
      case 1: return (
        partySize >= 1 && partySize <= maxCapacity && !!selectedTime &&
        (availableSlots.length === 0 || availableSlots.some((s) => s.time === selectedTime && s.available))
      );
      case 2: return orderMode !== 'with_menu' || menuMeetsMinimum;
      case 3: return true;
      default: return false;
    }
  }, [step, isAvailable, partySize, maxCapacity, orderMode, menuMeetsMinimum, selectedTime, availableSlots]);

  const nextStep = () => { if (canProceed && step < STEPS_COUNT - 1) setStep((s) => s + 1); };
  const prevStep = () => { if (step > 0) setStep((s) => s - 1); };

  const handleAddToCart = () => {
    const base = {
      id: `venue-${venue._id}-table-${placement.table._id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: (venue.type === 'HOTEL' ? 'venue_room' : 'venue_table') as 'venue_room' | 'venue_table',
      title: venue.name,
      imageUrl,
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

  const handleReserve = async () => {
    if (!isAvailable) return;
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(`/explorer?venue=${venue.slug || venue._id}`)}`);
      return;
    }
    if (user.emailVerified === false) {
      toast.error('Vérifiez votre email avant de réserver.', {
        description: 'Ouvrez votre lien de vérification puis réessayez.',
      });
      router.push('/email-verified?success=false');
      return;
    }
    if (!guestPhone.trim()) { toast.error('Numéro de téléphone requis.'); return; }
    if (orderMode === 'with_menu' && !menuMeetsMinimum) { toast.error(`Minimum ${minimumSpend} DT requis.`); return; }
    setLoading(true);
    try {
      const { firstName, lastName } = splitFullName(user.fullName);
      const result = await createReservation({
        venueId: venue._id, bookingType: 'TABLE', tableId: placement.table._id,
        startAt: startAtIso, endAt: endAtIso, partySize,
        guestFirstName: firstName, guestLastName: lastName,
        guestPhone: guestPhone.trim(), guestEmail: user.email,
        orderType: orderMode,
        menuItems: orderMode === 'with_menu'
          ? selectedMenuItems.map((m) => ({ itemId: m.itemId, quantity: m.quantity }))
          : undefined,
      });
      toast.success('Réservation confirmée !');
      onOpenChange(false);
      if (result._id) router.push(`/reservation/${result._id}/confirmation`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Échec de la réservation.');
    } finally { setLoading(false); }
  };

  // ── Step renderers ────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      // ── STEP 0: Table details & availability ──────────────────────────────
      case 0:
        return (
          <div className="space-y-4">
            {/* Table card */}
            <div className={cn(
              'relative overflow-hidden rounded-2xl border p-4 transition-all',
              isAvailable
                ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                : 'border-red-500/20 bg-red-500/[0.04]'
            )}>
              <div className="flex items-center gap-4">
                {/* Table number badge */}
                <div className={cn(
                  'size-14 shrink-0 rounded-2xl flex items-center justify-center text-2xl font-black',
                  isAvailable ? 'bg-amber-400/15 text-amber-400' : 'bg-white/[0.05] text-neutral-600'
                )}>
                  {placement.table.tableNumber ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-neutral-100 text-sm">{tableLabel}</h3>
                    {placement.table.isVip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        <Crown className="size-2.5" /> VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">{venue.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" /> {placement.table.capacity} pers. max
                    </span>
                    {tablePrice > 0 && (
                      <span className="font-semibold text-amber-400">À partir de {tablePrice} DT</span>
                    )}
                    {placement.table.locationLabel && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {placement.table.locationLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status pill */}
                <div className={cn(
                  'shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold',
                  isAvailable
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/15 text-red-400 border border-red-500/20'
                )}>
                  <span className={cn('size-1.5 rounded-full', isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
                  {isAvailable ? 'Disponible' : 'Réservée'}
                </div>
              </div>
            </div>

            {!isAvailable && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                Cette {reservableLabel} n'est pas disponible. Choisissez-en une autre.
              </div>
            )}

            {/* Available slots */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Créneaux disponibles — {formatDate(selectedDate)}
                </h4>
                <span className="text-[10px] font-semibold text-amber-400/80">
                  {durationHours} h / réservation
                </span>
              </div>
              {availableSlots.filter((s) => s.available).length === 0 ? (
                <p className="text-[12px] text-neutral-600">Aucun créneau libre ce jour — essayez une autre date.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableSlots.filter((s) => s.available).map((s) => (
                    <span key={s.time} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-400">
                      {s.time}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      // ── STEP 1: Date, time & party size ───────────────────────────────────
      case 1: {
        const dayStrip = getDayStrip(14);
        const slots = availableSlots;
        return (
          <div className="space-y-5">

            {/* ── Date strip ── */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <Calendar className="size-3.5 text-amber-400" /> Date
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                {dayStrip.map((d) => {
                  const isSelected = selectedDate === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setSelectedDate(d.value)}
                      className={cn(
                        'flex flex-col items-center shrink-0 w-14 rounded-2xl border py-2.5 transition-all duration-150',
                        isSelected
                          ? 'border-amber-400 bg-amber-400 text-black shadow-lg shadow-amber-400/25'
                          : 'border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:border-amber-400/30 hover:text-amber-300'
                      )}
                    >
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider', isSelected ? 'text-black/70' : 'text-neutral-600')}>
                        {d.label}
                      </span>
                      <span className={cn('text-xl font-black mt-0.5 tabular-nums', isSelected ? 'text-black' : 'text-neutral-200')}>
                        {d.day}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedDate && (
                <p className="text-xs text-neutral-600 capitalize">{formatDate(selectedDate)}</p>
              )}
            </div>

            {/* ── Time picker ── */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <Clock className="size-3.5 text-amber-400" /> Heure d'arrivée
                <span className="ml-auto normal-case tracking-normal text-[10px] font-medium text-neutral-600">
                  Table réservée {durationHours} h
                </span>
              </label>
              <SimpleTimePicker
                slots={slots}
                selectedTime={selectedTime}
                onSelect={setSelectedTime}
                emptyMessage="Aucun créneau disponible pour cette date. Choisissez une autre journée."
              />
            </div>

            {/* ── Party size ── */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <Users className="size-3.5 text-amber-400" /> Nombre de personnes
              </label>

              {/* Visual icon selector up to 8, then +/- for larger */}
              {maxCapacity <= 12 ? (
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPartySize(n)}
                      className={cn(
                        'flex flex-col items-center rounded-xl border py-2.5 text-xs transition-all duration-150',
                        partySize === n
                          ? 'border-amber-400 bg-amber-400/15 text-amber-400 font-black shadow shadow-amber-400/15'
                          : 'border-white/[0.08] bg-white/[0.03] text-neutral-500 hover:border-amber-400/30 hover:text-amber-300'
                      )}
                    >
                      <span className="text-base">{n <= 6 ? ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'][n-1] : n}</span>
                      <span className="text-[9px] mt-0.5 font-semibold">{n === 1 ? 'pers.' : 'pers.'}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                  <button type="button" onClick={() => setPartySize((n) => Math.max(1, n - 1))} disabled={partySize <= 1}
                    className="flex items-center justify-center w-14 h-14 text-neutral-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-25 transition-all border-r border-white/[0.06]">
                    <Minus className="size-4" />
                  </button>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white tabular-nums">{partySize}</span>
                    <span className="text-[10px] text-neutral-600">{partySize === 1 ? 'personne' : 'personnes'} · max {maxCapacity}</span>
                  </div>
                  <button type="button" onClick={() => setPartySize((n) => Math.min(maxCapacity, n + 1))} disabled={partySize >= maxCapacity}
                    className="flex items-center justify-center w-14 h-14 text-neutral-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-25 transition-all border-l border-white/[0.06]">
                    <Plus className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Selected summary pill */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-xs">
                <Calendar className="size-3.5 text-amber-400" />
                <span className="text-amber-300 font-semibold capitalize">{formatDate(selectedDate)}</span>
                <span className="text-neutral-600">·</span>
                <Clock className="size-3.5 text-amber-400" />
                <span className="text-amber-300 font-bold">{selectedTime}</span>
                <span className="text-neutral-600">·</span>
                <Users className="size-3.5 text-amber-400" />
                <span className="text-amber-300 font-semibold">{partySize} pers.</span>
              </div>
            </div>

          </div>
        );
      }

      // ── STEP 2: Contact & order mode ──────────────────────────────────────
      case 2:
        return (
          <div className="space-y-5">
            {/* Phone */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <Phone className="size-3.5 text-amber-400" />
                Téléphone <span className="text-red-400 normal-case font-normal tracking-normal">requis</span>
              </label>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+216 XX XXX XXX"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
              />
            </div>

            {/* Order mode selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Mode de commande
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderMode('table_only')}
                  className={cn(
                    'relative rounded-2xl border p-4 text-left transition-all duration-200 overflow-hidden',
                    orderMode === 'table_only'
                      ? 'border-amber-400/40 bg-amber-400/8 shadow-inner'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]'
                  )}
                >
                  {orderMode === 'table_only' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="size-4 text-amber-400" />
                    </div>
                  )}
                  <div className="text-2xl mb-2">🪑</div>
                  <div className="text-xs font-bold text-neutral-200">Table seule</div>
                  <div className="text-[10px] text-neutral-600 mt-0.5 leading-tight">
                    Commandez sur place à votre arrivée
                  </div>
                  {tablePrice > 0 && (
                    <div className="mt-2 text-[10px] font-bold text-amber-400">
                      À partir de {tablePrice} DT
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setOrderMode('with_menu')}
                  className={cn(
                    'relative rounded-2xl border p-4 text-left transition-all duration-200 overflow-hidden',
                    orderMode === 'with_menu'
                      ? 'border-amber-400/40 bg-amber-400/8 shadow-inner'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]'
                  )}
                >
                  {orderMode === 'with_menu' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="size-4 text-amber-400" />
                    </div>
                  )}
                  <div className="text-2xl mb-2">🍽️</div>
                  <div className="text-xs font-bold text-neutral-200">Pré-commander</div>
                  <div className="text-[10px] text-neutral-600 mt-0.5 leading-tight">
                    Choisissez vos plats maintenant
                  </div>
                  {menuTotal > 0 ? (
                    <div className={cn(
                      'mt-2 text-[10px] font-bold',
                      menuMeetsMinimum ? 'text-emerald-400' : 'text-amber-400'
                    )}>
                      Total : {menuTotal.toFixed(2)} DT
                    </div>
                  ) : minimumSpend > 0 ? (
                    <div className="mt-2 text-[10px] text-neutral-600">
                      Min. {minimumSpend} DT
                    </div>
                  ) : null}
                </button>
              </div>
            </div>

            {/* Menu section */}
            {orderMode === 'with_menu' && (
              <div className="space-y-4">
                {/* Menu items */}
                {menuData.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] py-10 text-center">
                    <UtensilsCrossed className="size-8 text-neutral-700" />
                    <p className="text-sm text-neutral-600">Aucun article disponible.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {CATEGORY_ORDER
                      .filter((cat) => menuData.some((i) => i.category === cat))
                      .map((cat) => (
                        <div key={cat}>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                              {CATEGORY_LABELS[cat]}
                            </p>
                            <div className="flex-1 h-px bg-white/[0.05]" />
                          </div>
                          <div className="space-y-2">
                            {menuData
                              .filter((i) => i.category === cat)
                              .map((item: MenuItem) => (
                                <MenuItemRow
                                  key={item._id}
                                  item={item}
                                  qty={menuQty[item._id] ?? 0}
                                  onChangeQty={(delta) => changeQty(item._id, delta)}
                                />
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      // ── STEP 3: Confirm summary ───────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1.5">
              <div className="mx-auto size-12 rounded-full border border-amber-400/30 bg-amber-400/10 flex items-center justify-center">
                <CheckCircle2 className="size-6 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-neutral-100">Confirmez votre réservation</h3>
              <p className="text-xs text-neutral-600">Vérifiez les détails avant de confirmer</p>
            </div>

            {/* Summary card */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              {/* Card header */}
              <div className="bg-gradient-to-r from-amber-400/10 via-transparent to-transparent px-4 py-3.5 flex items-center gap-3 border-b border-white/[0.06]">
                <div className="size-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-sm font-black text-amber-400">
                  {placement.table.tableNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-100 text-sm">{tableLabel}</span>
                    {placement.table.isVip && <Crown className="size-3 text-amber-400" />}
                  </div>
                  <p className="text-xs text-neutral-600 truncate">{venue.name}</p>
                </div>
              </div>

              {/* Details rows */}
              <div className="p-4 space-y-2.5">
                {[
                  { icon: Calendar, label: 'Date',      value: formatDate(selectedDate) },
                  { icon: Clock,    label: 'Créneau',   value: `${formatRange(startAtIso, endAtIso)} (${durationHours} h)` },
                  { icon: Users,    label: 'Personnes', value: `${partySize} pers.` },
                  { icon: Phone,    label: 'Téléphone', value: guestPhone || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500 flex items-center gap-2">
                      <Icon className="size-3.5 text-neutral-700" /> {label}
                    </span>
                    <span className="font-semibold text-neutral-200">{value}</span>
                  </div>
                ))}
              </div>

              {/* Price summary */}
              {(orderMode === 'with_menu' && menuTotal > 0) || tablePrice > 0 ? (
                <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 space-y-2">
                  {tablePrice > 0 && orderMode === 'table_only' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">À partir de</span>
                      <span className="font-bold text-amber-400">{tablePrice} DT</span>
                    </div>
                  )}
                  {orderMode === 'with_menu' && menuTotal > 0 && (
                    <>
                      {selectedMenuItems.map((item) => (
                        <div key={item.itemId} className="flex justify-between text-xs text-neutral-500">
                          <span>{item.name} × {item.quantity}</span>
                          <span>{(item.unitPrice * item.quantity).toFixed(2)} DT</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm border-t border-white/[0.05] pt-2 mt-1">
                        <span className="text-neutral-500">Total menu</span>
                        <span className="font-bold text-amber-400">{menuTotal.toFixed(2)} DT</span>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {!user && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-300">
                Vous devrez vous connecter pour finaliser la réservation.
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg max-h-[92dvh] overflow-hidden rounded-t-3xl sm:rounded-2xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl flex flex-col"
          >
            {/* ── Handle (mobile) ── */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-bold text-neutral-100">
                  {getReservationCTA(venue.type)}
                </h2>
                <p className="text-[11px] text-neutral-600 mt-0.5">{venue.name}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Fermer"
                className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* ── Step bar ── */}
            <div className="px-5 py-3.5 border-b border-white/[0.05]">
              <StepBar current={step} total={STEPS_COUNT} />
            </div>

            {/* ── Sticky minimum spend bar (step 2, with_menu only) ── */}
            {step === 2 && orderMode === 'with_menu' && minimumSpend > 0 && (
              <div className={cn(
                'relative border-b px-5 py-3 transition-all duration-300',
                menuMeetsMinimum
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-amber-400/15 bg-amber-400/[0.04]'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{menuMeetsMinimum ? '✅' : '🛒'}</span>
                    <span className="text-xs font-bold text-neutral-300">
                      {menuMeetsMinimum ? 'Minimum atteint !' : 'Minimum à atteindre'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'font-mono text-sm font-black tabular-nums',
                      menuMeetsMinimum ? 'text-emerald-400' : 'text-amber-400'
                    )}>
                      {menuTotal.toFixed(2)}
                    </span>
                    <span className="text-neutral-600 text-xs">/</span>
                    <span className="text-neutral-500 text-xs font-semibold">{minimumSpend} DT</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full transition-colors duration-500',
                      menuMeetsMinimum ? 'bg-emerald-500' : 'bg-amber-400'
                    )}
                    animate={{ width: `${Math.min(100, (menuTotal / minimumSpend) * 100)}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                {!menuMeetsMinimum && (
                  <p className="mt-1.5 text-[10px] text-amber-400/70">
                    Encore <span className="font-bold text-amber-400">{(minimumSpend - menuTotal).toFixed(2)} DT</span> pour valider la commande
                  </p>
                )}
              </div>
            )}

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Footer CTAs ── */}
            <div className="border-t border-white/[0.06] px-5 py-4 flex gap-3">
              {/* Back / Close */}
              {step > 0 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-white/[0.08] text-sm font-semibold text-neutral-400 hover:border-white/20 hover:text-white transition-all"
                >
                  <ArrowLeft className="size-4" /> Retour
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-center h-11 px-4 rounded-xl border border-white/[0.08] text-sm font-semibold text-neutral-500 hover:border-white/20 hover:text-neutral-300 transition-all"
                >
                  Fermer
                </button>
              )}

              {/* Next / Final CTAs */}
              {step < STEPS_COUNT - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all',
                    canProceed
                      ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40'
                      : 'bg-white/[0.05] text-neutral-700 cursor-not-allowed'
                  )}
                >
                  Continuer <ArrowRight className="size-4" />
                </button>
              ) : (
                <div className="flex-1 flex gap-2">
                  {/* Add to cart */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-amber-400/30 bg-amber-400/8 text-amber-400 text-sm font-semibold hover:bg-amber-400/15 hover:border-amber-400/50 transition-all"
                  >
                    <ShoppingCart className="size-4" />
                    <span className="hidden sm:block">Panier</span>
                  </button>

                  {/* Confirm */}
                  <button
                    type="button"
                    onClick={handleReserve}
                    disabled={loading || !guestPhone.trim()}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all',
                      'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20',
                      (loading || !guestPhone.trim()) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    {loading ? 'Traitement…' : 'Confirmer'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
