'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BedDouble,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Shield,
  CheckCircle2,
  Loader2,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { HotelRoom, Venue } from '@/lib/api/types';
import { ROOM_TYPE_LABELS, getRoomNights } from '@/lib/api/rooms';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { Dialog } from '@/components/ui/dialog';
import { RoomAmenityChips } from './HotelAmenities';

// ── Mini calendar ──────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isBetween(d: Date, start: Date, end: Date) {
  return d > start && d < end;
}

interface MiniCalendarProps {
  checkIn: Date | null;
  checkOut: Date | null;
  selecting: 'checkIn' | 'checkOut';
  onSelect: (d: Date) => void;
}

function MiniCalendar({ checkIn, checkOut, selecting, onSelect }: MiniCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  function prevMonth() {
    setViewMonth((m) => {
      const d = new Date(m);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }
  function nextMonth() {
    setViewMonth((m) => {
      const d = new Date(m);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  // Monday-based week
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="select-none rounded-xl border border-white/[0.08] bg-[#111] p-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Mois précédent"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-neutral-400"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-neutral-200">
          {MONTHS_FR[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Mois suivant"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-neutral-400"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-neutral-600 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;

          const isPast = d < today;
          const isCheckIn = checkIn && isSameDay(d, checkIn);
          const isCheckOut = checkOut && isSameDay(d, checkOut);
          const isBetweenDates = checkIn && checkOut && isBetween(d, checkIn, checkOut);
          const isSelected = isCheckIn || isCheckOut;

          let cls =
            'relative flex items-center justify-center rounded-lg text-xs h-8 w-full transition-all duration-150 ';

          if (isPast) {
            cls += 'text-neutral-700 cursor-not-allowed';
          } else if (isSelected) {
            cls += 'bg-amber-400 text-black font-bold cursor-pointer';
          } else if (isBetweenDates) {
            cls += 'bg-amber-400/15 text-amber-200 cursor-pointer rounded-none';
          } else {
            cls += 'text-neutral-300 hover:bg-white/10 cursor-pointer';
          }

          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => !isPast && onSelect(d)}
              className={cls}
            >
              {d.getDate()}
              {isCheckIn && selecting === 'checkOut' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Date + Guest selector ──────────────────────────────────────────────────

interface DateGuestSelectorProps {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  onCheckInChange: (d: Date | null) => void;
  onCheckOutChange: (d: Date | null) => void;
  onGuestsChange: (n: number) => void;
  maxCapacity?: number;
}

function DateGuestSelector({
  checkIn,
  checkOut,
  guests,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  maxCapacity = 4,
}: DateGuestSelectorProps) {
  const [selecting, setSelecting] = useState<'checkIn' | 'checkOut'>('checkIn');

  function handleSelect(d: Date) {
    if (selecting === 'checkIn') {
      onCheckInChange(d);
      onCheckOutChange(null);
      setSelecting('checkOut');
    } else {
      if (checkIn && d <= checkIn) {
        onCheckInChange(d);
        onCheckOutChange(null);
        setSelecting('checkOut');
      } else {
        onCheckOutChange(d);
        setSelecting('checkIn');
      }
    }
  }

  function fmt(d: Date | null) {
    if (!d) return '—';
    return d.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-3">
      {/* Date toggle buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSelecting('checkIn')}
          className={cn(
            'flex flex-col rounded-xl border p-3 text-left transition-all',
            selecting === 'checkIn'
              ? 'border-amber-400/50 bg-amber-400/5'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
          )}
        >
          <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
            Arrivée
          </span>
          <span className={cn('mt-0.5 text-sm font-semibold', checkIn ? 'text-neutral-100' : 'text-neutral-600')}>
            {fmt(checkIn)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelecting('checkOut')}
          className={cn(
            'flex flex-col rounded-xl border p-3 text-left transition-all',
            selecting === 'checkOut'
              ? 'border-amber-400/50 bg-amber-400/5'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
          )}
        >
          <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
            Départ
          </span>
          <span className={cn('mt-0.5 text-sm font-semibold', checkOut ? 'text-neutral-100' : 'text-neutral-600')}>
            {fmt(checkOut)}
          </span>
        </button>
      </div>

      {/* Calendar */}
      <MiniCalendar
        checkIn={checkIn}
        checkOut={checkOut}
        selecting={selecting}
        onSelect={handleSelect}
      />

      {/* Guests */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-neutral-500" />
          <div>
            <div className="text-xs font-medium text-neutral-300">Voyageurs</div>
            <div className="text-[10px] text-neutral-600">Max. {maxCapacity} pers.</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Réduire"
            disabled={guests <= 1}
            onClick={() => onGuestsChange(Math.max(1, guests - 1))}
            className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-white disabled:opacity-30 transition-all"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-semibold text-neutral-100">{guests}</span>
          <button
            type="button"
            aria-label="Augmenter"
            disabled={guests >= maxCapacity}
            onClick={() => onGuestsChange(Math.min(maxCapacity, guests + 1))}
            className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-white disabled:opacity-30 transition-all"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Price breakdown ────────────────────────────────────────────────────────

function PriceBreakdown({
  pricePerNight,
  nights,
}: {
  pricePerNight: number;
  nights: number;
}) {
  const subtotal = pricePerNight * nights;
  const taxes = Math.round(subtotal * 0.1);
  const total = subtotal + taxes;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2.5">
      <h4 className="text-sm font-semibold text-neutral-200">Récapitulatif</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-neutral-400">
          <span>
            {pricePerNight.toLocaleString('fr-TN')} DT × {nights} nuit{nights > 1 ? 's' : ''}
          </span>
          <span className="text-neutral-300">{subtotal.toLocaleString('fr-TN')} DT</span>
        </div>
        <div className="flex justify-between text-neutral-500">
          <span>Taxes et frais (10%)</span>
          <span>{taxes.toLocaleString('fr-TN')} DT</span>
        </div>
        <div className="border-t border-white/[0.07] pt-2.5 flex justify-between font-bold">
          <span className="text-neutral-200">Total</span>
          <span className="text-amber-400 text-base">{total.toLocaleString('fr-TN')} DT</span>
        </div>
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────

interface RoomBookingModalProps {
  room: HotelRoom;
  venue: Venue;
  open: boolean;
  onClose: () => void;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialGuests?: number;
}

export function RoomBookingModal({
  room,
  venue,
  open,
  onClose,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
}: RoomBookingModalProps) {
  const router = useRouter();
  const { user, hasHydrated, isResolving } = useAuthStore();
  const { addItem, openDrawer } = useCartStore();

  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn ?? null);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut ?? null);
  const [guests, setGuests] = useState(initialGuests);
  const [step, setStep] = useState<'dates' | 'guest-info' | 'confirm'>('dates');
  const [loading, setLoading] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    firstName: user ? (user as { fullName?: string }).fullName?.split(' ')[0] ?? '' : '',
    lastName: user ? (user as { fullName?: string }).fullName?.split(' ').slice(1).join(' ') ?? '' : '',
    phone: '',
    email: (user as { email?: string } | null)?.email ?? '',
  });

  const nights = checkIn && checkOut ? getRoomNights(checkIn, checkOut) : 0;
  const typeLabel = ROOM_TYPE_LABELS[room.roomType?.toUpperCase?.()] ?? room.roomType ?? 'Chambre';
  const coverImg = room.coverImage ?? room.gallery?.[0];
  const canContinue = !!(checkIn && checkOut && nights > 0);

  const subtotal = room.pricePerNight * nights;
  const taxes = Math.round(subtotal * 0.1);
  const total = subtotal + taxes;

  // Reset on open
  useEffect(() => {
    if (open) {
      setCheckIn(initialCheckIn ?? null);
      setCheckOut(initialCheckOut ?? null);
      setGuests(initialGuests);
      setStep(initialCheckIn && initialCheckOut ? 'guest-info' : 'dates');
      setLoading(false);
    }
  }, [open, initialCheckIn, initialCheckOut, initialGuests]);

  async function handleAddToCart() {
    if (!checkIn || !checkOut) return;
    setLoading(true);
    try {
      addItem({
        id: `hotel-${venue._id}-room-${room._id}-${Date.now()}`,
        type: 'venue_room',
        title: venue.name,
        imageUrl: coverImg,
        unitLabel: typeLabel,
        unitType: 'HOTEL',
        dateTime: checkIn.toISOString(),
        endAt: checkOut.toISOString(),
        price: total,
        quantity: 1,
        venueId: venue._id,
        roomId: room._id,
        slug: venue.slug,
      });
      toast.success(`${typeLabel} ajouté au panier`);
      openDrawer();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function handleBookNow() {
    if (!checkIn || !checkOut) return;
    const params = new URLSearchParams({
      venueId: venue._id,
      roomId: room._id,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults: String(guests),
      children: '0',
    });
    const checkoutUrl = `/checkout/hotel?${params.toString()}`;
    if (!hasHydrated || isResolving) {
      toast.message('Verification de votre session en cours.');
      return;
    }
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(checkoutUrl)}`);
      onClose();
      return;
    }
    onClose();
    router.push(checkoutUrl);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 w-full max-w-2xl max-h-[92dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/[0.08] bg-[#0D0D0D] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start gap-3 p-4 sm:p-5 border-b border-white/[0.06]">
              {coverImg && (
                <div className="relative size-14 sm:size-16 shrink-0 overflow-hidden rounded-xl">
                  <Image src={coverImg} alt={typeLabel} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold mb-0.5">
                  Réserver
                </div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-100 leading-tight truncate">
                  {typeLabel}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">{venue.name}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 flex size-8 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Step tabs */}
            <div className="flex border-b border-white/[0.06]">
              {(['dates', 'guest-info', 'confirm'] as const).map((s, i) => {
                const labels = ['Dates & invités', 'Vos infos', 'Confirmer'];
                const reachable =
                  s === 'dates' ||
                  (s === 'guest-info' && canContinue) ||
                  (s === 'confirm' && canContinue);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!reachable}
                    onClick={() => reachable && setStep(s)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2',
                      step === s
                        ? 'border-amber-400 text-amber-400'
                        : 'border-transparent text-neutral-600 hover:text-neutral-400'
                    )}
                  >
                    <span className={cn(
                      'flex size-4 items-center justify-center rounded-full text-[9px] font-bold',
                      step === s ? 'bg-amber-400 text-black' : 'bg-white/[0.08] text-neutral-600'
                    )}>
                      {i + 1}
                    </span>
                    <span className="hidden sm:block">{labels[i]}</span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <AnimatePresence mode="wait">
                {step === 'dates' && (
                  <motion.div
                    key="dates"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <DateGuestSelector
                      checkIn={checkIn}
                      checkOut={checkOut}
                      guests={guests}
                      onCheckInChange={setCheckIn}
                      onCheckOutChange={setCheckOut}
                      onGuestsChange={setGuests}
                      maxCapacity={room.capacityAdults ?? room.capacity}
                    />

                    {canContinue && (
                      <PriceBreakdown pricePerNight={room.pricePerNight} nights={nights} />
                    )}

                    {/* Amenities reminder */}
                    {room.amenities?.length > 0 && (
                      <div>
                        <p className="text-xs text-neutral-600 mb-2 font-medium uppercase tracking-wider">
                          Inclus
                        </p>
                        <RoomAmenityChips amenities={room.amenities.slice(0, 6)} />
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 'guest-info' && (
                  <motion.div
                    key="guest-info"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-neutral-500">
                      Informations pour la réservation (optionnel si vous êtes connecté).
                    </p>

                    {/* First name */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <User className="size-3.5" /> Prénom
                      </label>
                      <input
                        type="text"
                        value={guestInfo.firstName}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, firstName: e.target.value }))}
                        placeholder="Ex. Mohamed"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
                      />
                    </div>

                    {/* Last name */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <User className="size-3.5" /> Nom
                      </label>
                      <input
                        type="text"
                        value={guestInfo.lastName}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, lastName: e.target.value }))}
                        placeholder="Ex. Ben Ali"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <Phone className="size-3.5" /> Téléphone
                      </label>
                      <input
                        type="tel"
                        value={guestInfo.phone}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+216 XX XXX XXX"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                        <Mail className="size-3.5" /> Email
                      </label>
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo((p) => ({ ...p, email: e.target.value }))}
                        placeholder="votre@email.com"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
                      />
                    </div>

                    <PriceBreakdown pricePerNight={room.pricePerNight} nights={nights} />
                  </motion.div>
                )}

                {step === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Summary card */}
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-neutral-200">
                        Résumé de votre séjour
                      </h4>

                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-neutral-500 flex items-center gap-1.5">
                            <BedDouble className="size-3.5" /> Type
                          </dt>
                          <dd className="text-neutral-300 font-medium">{typeLabel}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-neutral-500 flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" /> Arrivée
                          </dt>
                          <dd className="text-neutral-300 font-medium">
                            {checkIn?.toLocaleDateString('fr-TN', {
                              weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-neutral-500 flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" /> Départ
                          </dt>
                          <dd className="text-neutral-300 font-medium">
                            {checkOut?.toLocaleDateString('fr-TN', {
                              weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-neutral-500 flex items-center gap-1.5">
                            <Users className="size-3.5" /> Voyageurs
                          </dt>
                          <dd className="text-neutral-300 font-medium">{guests} pers.</dd>
                        </div>
                      </dl>
                    </div>

                    <PriceBreakdown pricePerNight={room.pricePerNight} nights={nights} />

                    {/* Trust indicators */}
                    <div className="flex items-center gap-2 text-xs text-neutral-600">
                      <Shield className="size-3.5 text-emerald-500 shrink-0" />
                      Annulation gratuite jusqu'à 24h avant l'arrivée
                    </div>

                    {/* Type-mode allocation note */}
                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-[11px] leading-relaxed text-amber-200/85">
                      <strong className="font-bold">Une chambre {typeLabel.toLowerCase()} disponible vous sera attribuée à votre arrivée.</strong>
                      {' '}Vous pouvez préciser vos préférences (étage, vue, lit) dans une note à l&apos;hôtel.
                    </div>

                    {!user && (
                      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300">
                        Vous n'êtes pas connecté. Vous serez redirigé vers la connexion pour finaliser.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer CTAs */}
            <div className="border-t border-white/[0.06] p-4 sm:p-5 flex gap-3">
              {step === 'dates' && (
                <>
                  <button
                    type="button"
                    disabled={!canContinue || loading}
                    onClick={handleAddToCart}
                    className="flex-1 h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-neutral-300 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Ajouter au panier
                  </button>
                  <button
                    type="button"
                    disabled={!canContinue}
                    onClick={() => setStep('guest-info')}
                    className="flex-1 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-400/20"
                  >
                    Continuer
                  </button>
                </>
              )}

              {step === 'guest-info' && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('dates')}
                    className="flex items-center gap-1.5 h-11 px-4 rounded-xl border border-white/[0.08] text-sm text-neutral-500 hover:text-neutral-300 transition-all"
                  >
                    <ChevronLeft className="size-4" /> Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('confirm')}
                    className="flex-1 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition-all shadow-lg shadow-amber-400/20"
                  >
                    Vérifier
                  </button>
                </>
              )}

              {step === 'confirm' && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('guest-info')}
                    className="flex items-center gap-1.5 h-11 px-4 rounded-xl border border-white/[0.08] text-sm text-neutral-500 hover:text-neutral-300 transition-all"
                  >
                    <ChevronLeft className="size-4" /> Retour
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleBookNow}
                    className="flex-1 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold disabled:opacity-60 transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {loading ? 'Traitement...' : 'Continuer vers le paiement'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
