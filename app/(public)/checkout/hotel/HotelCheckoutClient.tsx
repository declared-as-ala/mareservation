'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Hotel,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  Shield,
  Sparkles,
  Tag,
  Timer,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { fetchVenueByIdOrSlug } from '@/lib/api/venues';
import { fetchVenueRooms } from '@/lib/api/rooms';
import {
  createHotelHold,
  releaseHotelHold,
  confirmHotelCheckout,
  type PaymentOption,
  type HotelCheckoutExtra,
} from '@/lib/api/hotel-checkout';
import type { HotelRoom, Venue } from '@/lib/api/types';

/* ─── helpers ─────────────────────────────────────────────────────────── */

const TAX_RATE = 0.1;

const STEPS = [
  { id: 1, key: 'stay', label: 'Séjour', icon: CalendarDays },
  { id: 2, key: 'rate', label: 'Tarif', icon: Tag },
  { id: 3, key: 'guest', label: 'Vos infos', icon: User },
  { id: 4, key: 'extras', label: 'Extras', icon: Sparkles },
  { id: 5, key: 'payment', label: 'Paiement', icon: CreditCard },
] as const;

function nightsBetween(a: Date | null, b: Date | null) {
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function fmtDateLong(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateShort(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function fmtMoney(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} DT`;
}

/* ─── extras catalog (plan §4.4) ──────────────────────────────────────── */

const EXTRAS_CATALOG: Array<HotelCheckoutExtra & { description: string; icon: string }> = [
  { key: 'breakfast', name: 'Petit-déjeuner buffet', description: 'Petit-déjeuner gourmand inclus chaque matin.', unitPrice: 25, quantity: 0, unit: 'per_night', icon: '🥐' },
  { key: 'half_board', name: 'Demi-pension', description: 'Petit-déjeuner + dîner au restaurant.', unitPrice: 60, quantity: 0, unit: 'per_night', icon: '🍽️' },
  { key: 'airport_transfer', name: 'Transfert aéroport', description: 'Trajet privé aller-retour, climatisé.', unitPrice: 80, quantity: 0, unit: 'once', icon: '🚗' },
  { key: 'spa', name: 'Forfait spa', description: 'Accès illimité + 1 soin par personne.', unitPrice: 90, quantity: 0, unit: 'per_person', icon: '💆' },
  { key: 'romantic', name: 'Décoration romantique', description: 'Bouquet, pétales et bouteille à l\'arrivée.', unitPrice: 70, quantity: 0, unit: 'once', icon: '🌹' },
  { key: 'late_checkout', name: 'Late check-out (16h)', description: 'Profitez de votre chambre plus longtemps.', unitPrice: 40, quantity: 0, unit: 'once', icon: '🕓' },
  { key: 'parking', name: 'Parking privé', description: 'Place réservée pour votre véhicule.', unitPrice: 10, quantity: 0, unit: 'per_night', icon: '🅿️' },
  { key: 'baby_cot', name: 'Lit bébé', description: 'Lit bébé sécurisé en chambre.', unitPrice: 15, quantity: 0, unit: 'per_night', icon: '🍼' },
];

/* ─── extras pricing ──────────────────────────────────────────────────── */

function extraTotal(e: HotelCheckoutExtra, nights: number, guests: number) {
  const mult = e.unit === 'per_night' ? nights : e.unit === 'per_person' ? guests : 1;
  return e.unitPrice * e.quantity * mult;
}

/* ─── hold countdown ──────────────────────────────────────────────────── */

function HoldTimer({ expiresAt, onExpire }: { expiresAt: Date | null; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const remaining = expiresAt ? Math.max(0, expiresAt.getTime() - now) : null;
  const expired = remaining === 0;

  useEffect(() => {
    if (expiresAt && expired) onExpire();
  }, [expired, expiresAt, onExpire]);

  if (!expiresAt || remaining === null) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-500">
        <Loader2 className="size-3.5 animate-spin" />
        Réservation en cours…
      </div>
    );
  }

  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000);
  const urgent = remaining < 2 * 60_000;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors',
        expired
          ? 'border-red-500/40 bg-red-500/10 text-red-300'
          : urgent
          ? 'border-amber-400/40 bg-amber-400/10 text-amber-300 animate-pulse'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      )}
    >
      <Timer className="size-3.5" />
      {expired ? 'Hold expiré' : `Chambre réservée · ${mm}:${ss.toString().padStart(2, '0')}`}
    </div>
  );
}

/* ─── stepper ────────────────────────────────────────────────────────── */

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <li key={s.id} className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                done
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : active
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                  : 'border-white/[0.08] bg-white/[0.02] text-neutral-600'
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                  done ? 'bg-emerald-400 text-black' : active ? 'bg-amber-400 text-black' : 'bg-white/[0.08]'
                )}
              >
                {done ? <Check className="size-3" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px w-4 sm:w-8', done ? 'bg-emerald-500/40' : 'bg-white/[0.06]')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ─── form atoms ─────────────────────────────────────────────────────── */

function Field({
  label,
  required,
  error,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400">
        {Icon && <Icon className="size-3.5" />}
        {label}
        {required && <span className="text-amber-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all';

/* ─── main component ─────────────────────────────────────────────────── */

export default function HotelCheckoutClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuthStore();

  const venueParam = sp.get('venueId') ?? '';
  const roomId = sp.get('roomId') ?? '';
  const initialCheckIn = sp.get('checkIn');
  const initialCheckOut = sp.get('checkOut');
  const initialAdults = Number(sp.get('adults') ?? '2');
  const initialChildren = Number(sp.get('children') ?? '0');

  // ── State ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn ? new Date(initialCheckIn) : null);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut ? new Date(initialCheckOut) : null);
  const [adults, setAdults] = useState(Math.max(1, initialAdults));
  const [children, setChildren] = useState(Math.max(0, initialChildren));
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [promoCode, setPromoCode] = useState('');

  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpires, setHoldExpires] = useState<Date | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  // Guest info
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCountry, setGuestCountry] = useState('Tunisie');
  const [guestCity, setGuestCity] = useState('');
  const [bookerIsGuest, setBookerIsGuest] = useState(true);
  const [arrivalTime, setArrivalTime] = useState('15:00');
  const [needBabyBed, setNeedBabyBed] = useState(false);
  const [needExtraBed, setNeedExtraBed] = useState(false);
  const [accessibilityRequest, setAccessibilityRequest] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [acceptedHotelPolicy, setAcceptedHotelPolicy] = useState(false);
  const [acceptedPlatformTerms, setAcceptedPlatformTerms] = useState(false);

  // Extras
  const [extras, setExtras] = useState<HotelCheckoutExtra[]>(
    EXTRAS_CATALOG.map((e) => ({ key: e.key, name: e.name, unitPrice: e.unitPrice, quantity: 0, unit: e.unit }))
  );

  // Payment
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('online');
  const [submitting, setSubmitting] = useState(false);

  // ── Fill guest info from user once available ─────────────────────────
  useEffect(() => {
    if (user) {
      const u = user as { fullName?: string; email?: string; phone?: string };
      const [first, ...rest] = (u.fullName ?? '').split(' ');
      setGuestFirstName((v) => v || first || '');
      setGuestLastName((v) => v || rest.join(' ') || '');
      setGuestEmail((v) => v || u.email || '');
      setGuestPhone((v) => v || u.phone || '');
    }
  }, [user]);

  // ── Maintain children ages array ─────────────────────────────────────
  useEffect(() => {
    setChildrenAges((prev) => {
      const next = [...prev];
      while (next.length < children) next.push(6);
      while (next.length > children) next.pop();
      return next;
    });
  }, [children]);

  // ── Fetch venue + room ────────────────────────────────────────────────
  const { data: venue } = useQuery({
    queryKey: ['checkout-venue', venueParam],
    queryFn: () => fetchVenueByIdOrSlug(venueParam),
    enabled: !!venueParam,
  });

  const venueId = venue?._id ?? venueParam;

  const { data: rooms } = useQuery({
    queryKey: ['checkout-rooms', venueId, checkIn?.toISOString(), checkOut?.toISOString()],
    queryFn: () =>
      fetchVenueRooms(venueId, {
        checkIn: checkIn?.toISOString(),
        checkOut: checkOut?.toISOString(),
        guests: adults + children,
      }),
    enabled: !!venueId,
  });

  const room: HotelRoom | undefined = useMemo(
    () => rooms?.find((r) => r._id === roomId),
    [rooms, roomId]
  );

  // ── Derived pricing ───────────────────────────────────────────────────
  const nights = nightsBetween(checkIn, checkOut);
  const guestsTotal = adults + children;
  const pricePerNight = room?.pricePerNight ?? 0;
  const subtotal = pricePerNight * nights;
  const taxes = Math.round(subtotal * TAX_RATE);
  const extrasTotal = useMemo(
    () => extras.reduce((s, e) => s + extraTotal(e, nights, guestsTotal), 0),
    [extras, nights, guestsTotal]
  );
  const total = subtotal + taxes + extrasTotal;

  // ── Create hold on entering step 2 ────────────────────────────────────
  const holdCreatedRef = useRef(false);

  async function ensureHold() {
    if (holdCreatedRef.current || !venueId || !roomId || !checkIn || !checkOut) return;
    holdCreatedRef.current = true;
    setHoldLoading(true);
    setHoldError(null);
    try {
      const h = await createHotelHold({
        venueId,
        roomId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        adults,
        children,
        rooms: 1,
      });
      setHoldId(h._id);
      setHoldExpires(new Date(h.expiresAt));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de réserver la chambre.';
      setHoldError(msg);
      holdCreatedRef.current = false;
    } finally {
      setHoldLoading(false);
    }
  }

  // Release hold on unmount if not converted
  useEffect(() => {
    return () => {
      if (holdId) releaseHotelHold(holdId).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleHoldExpired() {
    setHoldId(null);
    setHoldExpires(null);
    holdCreatedRef.current = false;
    setStep(1);
    toast.error('Votre réservation temporaire a expiré. Veuillez recommencer.');
  }

  // ── Step navigation ───────────────────────────────────────────────────
  const stepValid: Record<number, boolean> = {
    1: !!(checkIn && checkOut && nights >= 1 && adults >= 1 && !!room),
    2: !!holdId,
    3: !!(
      guestFirstName.trim() &&
      guestLastName.trim() &&
      /\S+@\S+\.\S+/.test(guestEmail) &&
      guestPhone.replace(/\s/g, '').length >= 8
    ),
    4: true,
    5: acceptedHotelPolicy && acceptedPlatformTerms,
  };

  async function goNext() {
    if (step === 1) {
      if (!stepValid[1]) {
        toast.error('Veuillez compléter votre séjour.');
        return;
      }
      // Need auth before holding
      if (!user) {
        const ret = `/checkout/hotel?${sp.toString()}`;
        router.push(`/login?returnTo=${encodeURIComponent(ret)}`);
        return;
      }
      await ensureHold();
      setStep(2);
      return;
    }
    if (step === 5) {
      await submit();
      return;
    }
    if (!stepValid[step]) {
      toast.error('Veuillez compléter les champs requis.');
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit() {
    if (!holdId) {
      toast.error('Hold expiré, recommencez.');
      setStep(1);
      return;
    }
    if (!stepValid[5]) {
      toast.error('Vous devez accepter les politiques et conditions.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await confirmHotelCheckout({
        holdId,
        paymentOption,
        promoCode: promoCode || undefined,
        guest: {
          firstName: guestFirstName,
          lastName: guestLastName,
          email: guestEmail,
          phone: guestPhone,
          country: guestCountry,
          city: guestCity || undefined,
          adults,
          children,
          childrenAges,
        },
        extras: extras.filter((e) => e.quantity > 0),
        arrivalTime,
        specialRequest: specialRequest || undefined,
        needBabyBed,
        needExtraBed,
        accessibilityRequest: accessibilityRequest || undefined,
        acceptedHotelPolicy,
        acceptedPlatformTerms,
      });
      // Prevent the unmount cleanup from releasing the converted hold
      setHoldId(null);
      toast.success('Réservation confirmée !');
      router.push(`/reservation/${res._id}/confirmation`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la confirmation.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── render ─────────────────────────────────────────────────────────── */

  if (!venueParam || !roomId) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Info className="size-10 text-neutral-700 mx-auto" />
          <p className="text-sm text-neutral-500">Lien de réservation invalide.</p>
          <Link href="/hotels" className="inline-flex items-center gap-2 text-amber-400 text-sm hover:underline">
            <ArrowLeft className="size-4" /> Voir les hôtels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080808]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-400 hover:border-amber-400/40 hover:text-amber-400 transition-all"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            Retour
          </button>
          <div className="hidden sm:block">
            <Stepper current={step} />
          </div>
          {step >= 2 && <HoldTimer expiresAt={holdExpires} onExpire={handleHoldExpired} />}
        </div>
        <div className="sm:hidden border-t border-white/[0.05] px-4 py-2">
          <Stepper current={step} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 items-start">
          {/* ── left: step content ────────────────────────────────────── */}
          <section className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {step === 1 && (
                  <StayDetailsStep
                    checkIn={checkIn}
                    checkOut={checkOut}
                    adults={adults}
                    children={children}
                    childrenAges={childrenAges}
                    promoCode={promoCode}
                    onCheckIn={setCheckIn}
                    onCheckOut={setCheckOut}
                    onAdults={setAdults}
                    onChildren={setChildren}
                    onChildAge={(idx, age) =>
                      setChildrenAges((prev) => prev.map((a, i) => (i === idx ? age : a)))
                    }
                    onPromo={setPromoCode}
                    nights={nights}
                  />
                )}

                {step === 2 && (
                  <RateConfirmStep
                    venue={venue ?? undefined}
                    room={room}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    nights={nights}
                    adults={adults}
                    children={children}
                    holdLoading={holdLoading}
                    holdError={holdError}
                    onRetryHold={() => {
                      holdCreatedRef.current = false;
                      ensureHold();
                    }}
                  />
                )}

                {step === 3 && (
                  <GuestInfoStep
                    firstName={guestFirstName}
                    lastName={guestLastName}
                    email={guestEmail}
                    phone={guestPhone}
                    country={guestCountry}
                    city={guestCity}
                    arrivalTime={arrivalTime}
                    needBabyBed={needBabyBed}
                    needExtraBed={needExtraBed}
                    accessibilityRequest={accessibilityRequest}
                    specialRequest={specialRequest}
                    onChange={{
                      firstName: setGuestFirstName,
                      lastName: setGuestLastName,
                      email: setGuestEmail,
                      phone: setGuestPhone,
                      country: setGuestCountry,
                      city: setGuestCity,
                      arrivalTime: setArrivalTime,
                      needBabyBed: setNeedBabyBed,
                      needExtraBed: setNeedExtraBed,
                      accessibilityRequest: setAccessibilityRequest,
                      specialRequest: setSpecialRequest,
                    }}
                  />
                )}

                {step === 4 && (
                  <ExtrasStep
                    extras={extras}
                    nights={nights}
                    guests={guestsTotal}
                    onChange={(key, qty) =>
                      setExtras((prev) =>
                        prev.map((e) => (e.key === key ? { ...e, quantity: Math.max(0, qty) } : e))
                      )
                    }
                  />
                )}

                {step === 5 && (
                  <PaymentStep
                    total={total}
                    paymentOption={paymentOption}
                    onPaymentOption={setPaymentOption}
                    acceptedHotelPolicy={acceptedHotelPolicy}
                    acceptedPlatformTerms={acceptedPlatformTerms}
                    onAcceptHotel={setAcceptedHotelPolicy}
                    onAcceptPlatform={setAcceptedPlatformTerms}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* nav */}
            <div className="flex items-center justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 1 || submitting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-4 h-11 text-sm font-medium text-neutral-400 hover:text-neutral-200 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="size-4" />
                Retour
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={submitting || holdLoading || (step === 5 && !stepValid[5])}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black h-11 px-6 text-sm font-bold shadow-lg shadow-amber-400/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {submitting || holdLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : step === 5 ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {submitting
                  ? 'Confirmation…'
                  : step === 5
                  ? 'Confirmer & réserver'
                  : step === 1
                  ? 'Confirmer le séjour'
                  : 'Continuer'}
              </button>
            </div>
          </section>

          {/* ── right: live summary ───────────────────────────────────── */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingSummary
                venue={venue ?? undefined}
                room={room}
                checkIn={checkIn}
                checkOut={checkOut}
                nights={nights}
                adults={adults}
                children={children}
                subtotal={subtotal}
                taxes={taxes}
                extrasTotal={extrasTotal}
                extras={extras}
                total={total}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* STEP 1 — Stay details                                                   */
/* ─────────────────────────────────────────────────────────────────────── */

function StayDetailsStep({
  checkIn,
  checkOut,
  adults,
  children,
  childrenAges,
  promoCode,
  nights,
  onCheckIn,
  onCheckOut,
  onAdults,
  onChildren,
  onChildAge,
  onPromo,
}: {
  checkIn: Date | null;
  checkOut: Date | null;
  adults: number;
  children: number;
  childrenAges: number[];
  promoCode: string;
  nights: number;
  onCheckIn: (d: Date | null) => void;
  onCheckOut: (d: Date | null) => void;
  onAdults: (n: number) => void;
  onChildren: (n: number) => void;
  onChildAge: (idx: number, age: number) => void;
  onPromo: (v: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold mb-1">Étape 1 sur 5</p>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">Votre séjour</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Confirmez vos dates et le nombre de voyageurs. Le tarif est calculé en temps réel.
        </p>
      </header>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Arrivée" required icon={CalendarDays}>
            <input
              type="date"
              min={today.toISOString().slice(0, 10)}
              value={checkIn ? checkIn.toISOString().slice(0, 10) : ''}
              onChange={(e) => {
                const d = e.target.value ? new Date(e.target.value) : null;
                onCheckIn(d);
                if (d && checkOut && checkOut <= d) onCheckOut(null);
              }}
              className={inputCls}
            />
          </Field>
          <Field label="Départ" required icon={CalendarDays}>
            <input
              type="date"
              min={checkIn ? new Date(checkIn.getTime() + 86400000).toISOString().slice(0, 10) : today.toISOString().slice(0, 10)}
              value={checkOut ? checkOut.toISOString().slice(0, 10) : ''}
              onChange={(e) => onCheckOut(e.target.value ? new Date(e.target.value) : null)}
              className={inputCls}
            />
          </Field>
        </div>

        {nights > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-400/5 border border-amber-400/15 px-3 py-2 text-xs text-amber-300">
            <Clock className="size-3.5" />
            {nights} nuit{nights > 1 ? 's' : ''} · du {fmtDateShort(checkIn)} au {fmtDateShort(checkOut)}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Adultes" icon={Users}>
            <Counter value={adults} min={1} max={10} onChange={onAdults} />
          </Field>
          <Field label="Enfants (0–12 ans)" icon={Users}>
            <Counter value={children} min={0} max={6} onChange={onChildren} />
          </Field>
        </div>

        {children > 0 && (
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3">
            <p className="text-xs font-medium text-neutral-400 mb-2">Âge des enfants</p>
            <div className="flex flex-wrap gap-2">
              {childrenAges.map((age, i) => (
                <label key={i} className="flex items-center gap-1.5 text-xs text-neutral-500">
                  Enfant {i + 1}
                  <input
                    type="number"
                    min={0}
                    max={17}
                    value={age}
                    onChange={(e) => onChildAge(i, Math.max(0, Math.min(17, Number(e.target.value))))}
                    className="w-14 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-center text-neutral-100 text-xs focus:outline-none focus:border-amber-400/40"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <Field label="Code promo (facultatif)" icon={Tag}>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => onPromo(e.target.value.toUpperCase().slice(0, 20))}
            placeholder="EX. WELCOME10"
            className={inputCls}
          />
        </Field>
      </div>

      <Notice icon={Shield} tone="info">
        Annulation gratuite jusqu'à 24h avant l'arrivée. Aucun débit avant la confirmation.
      </Notice>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* STEP 2 — Rate & room confirmation                                       */
/* ─────────────────────────────────────────────────────────────────────── */

function RateConfirmStep({
  venue,
  room,
  checkIn,
  checkOut,
  nights,
  adults,
  children,
  holdLoading,
  holdError,
  onRetryHold,
}: {
  venue?: Venue;
  room?: HotelRoom;
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
  adults: number;
  children: number;
  holdLoading: boolean;
  holdError: string | null;
  onRetryHold: () => void;
}) {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold mb-1">Étape 2 sur 5</p>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">Votre chambre est réservée</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Nous avons bloqué cette chambre pour vous pendant 15 minutes. Vérifiez votre sélection avant de continuer.
        </p>
      </header>

      {holdError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 space-y-3">
          <p className="text-sm text-red-300 font-medium">{holdError}</p>
          <button
            type="button"
            onClick={onRetryHold}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {/* Room hero */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <div className="relative aspect-[16/10] sm:aspect-[2/1] bg-neutral-900">
          {room?.coverImage || room?.gallery?.[0] ? (
            <Image
              src={room.coverImage ?? room.gallery[0]}
              alt={room.name ?? 'Chambre'}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-neutral-600">
              <BedDouble className="size-12" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/30 to-transparent">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                  <Hotel className="size-3" /> {venue?.name ?? 'Hôtel'}
                </div>
                <h3 className="mt-1 text-xl font-bold text-white">{room?.name ?? room?.roomType ?? '—'}</h3>
                {venue && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-300">
                    <MapPin className="size-3" />
                    {[venue.address, venue.city].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              {holdLoading && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-1 text-[10px] font-semibold text-amber-200">
                  <Loader2 className="size-3 animate-spin" /> Hold en cours
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.06] border-t border-white/[0.06]">
          <Stat label="Dates" value={`${fmtDateShort(checkIn)} → ${fmtDateShort(checkOut)}`} />
          <Stat label="Nuits" value={String(nights)} />
          <Stat label="Voyageurs" value={`${adults + children}`} />
          <Stat label="Capacité" value={`${room?.capacityAdults ?? room?.capacity ?? '—'}`} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Info className="size-4 text-amber-400" /> Inclus dans votre tarif
        </h3>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-400">
          {[
            { ok: true, text: 'Wi-Fi haut débit gratuit' },
            { ok: true, text: 'Climatisation' },
            { ok: true, text: 'Annulation gratuite (24h)' },
            { ok: false, text: 'Petit-déjeuner (à ajouter en extras)' },
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              {item.ok ? (
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="size-4 text-neutral-600 shrink-0" />
              )}
              <span className={item.ok ? '' : 'text-neutral-600'}>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* STEP 3 — Guest information                                              */
/* ─────────────────────────────────────────────────────────────────────── */

interface GuestInfoChange {
  firstName: (v: string) => void;
  lastName: (v: string) => void;
  email: (v: string) => void;
  phone: (v: string) => void;
  country: (v: string) => void;
  city: (v: string) => void;
  arrivalTime: (v: string) => void;
  needBabyBed: (v: boolean) => void;
  needExtraBed: (v: boolean) => void;
  accessibilityRequest: (v: string) => void;
  specialRequest: (v: string) => void;
}

function GuestInfoStep(p: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  arrivalTime: string;
  needBabyBed: boolean;
  needExtraBed: boolean;
  accessibilityRequest: string;
  specialRequest: string;
  onChange: GuestInfoChange;
}) {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold mb-1">Étape 3 sur 5</p>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">Vos informations</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Le voyageur principal présentera une pièce d'identité à l'arrivée.
        </p>
      </header>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Prénom" required icon={User}>
            <input type="text" value={p.firstName} onChange={(e) => p.onChange.firstName(e.target.value)} className={inputCls} placeholder="Ex. Mohamed" />
          </Field>
          <Field label="Nom" required icon={User}>
            <input type="text" value={p.lastName} onChange={(e) => p.onChange.lastName(e.target.value)} className={inputCls} placeholder="Ex. Ben Ali" />
          </Field>
          <Field label="Email" required icon={Mail}>
            <input type="email" value={p.email} onChange={(e) => p.onChange.email(e.target.value)} className={inputCls} placeholder="vous@example.com" />
          </Field>
          <Field label="Téléphone" required icon={Phone}>
            <input type="tel" value={p.phone} onChange={(e) => p.onChange.phone(e.target.value)} className={inputCls} placeholder="+216 XX XXX XXX" />
          </Field>
          <Field label="Pays" icon={MapPin}>
            <input type="text" value={p.country} onChange={(e) => p.onChange.country(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Ville (facultatif)" icon={MapPin}>
            <input type="text" value={p.city} onChange={(e) => p.onChange.city(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Heure d'arrivée estimée" icon={Clock}>
          <input type="time" value={p.arrivalTime} onChange={(e) => p.onChange.arrivalTime(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-200">Préférences (facultatif)</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle label="Lit bébé" checked={p.needBabyBed} onChange={p.onChange.needBabyBed} description="Sous réserve de disponibilité" />
          <Toggle label="Lit supplémentaire" checked={p.needExtraBed} onChange={p.onChange.needExtraBed} description="Frais éventuels facturés sur place" />
        </div>

        <Field label="Demande d'accessibilité" icon={Info}>
          <input
            type="text"
            value={p.accessibilityRequest}
            onChange={(e) => p.onChange.accessibilityRequest(e.target.value)}
            className={inputCls}
            placeholder="Ex. chambre PMR, ascenseur proche"
          />
        </Field>

        <Field label="Demandes spéciales" icon={Info}>
          <textarea
            value={p.specialRequest}
            onChange={(e) => p.onChange.specialRequest(e.target.value)}
            className={cn(inputCls, 'min-h-[88px] resize-y')}
            placeholder="Ex. chambre calme, vue mer, oreillers supplémentaires…"
          />
        </Field>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* STEP 4 — Extras                                                          */
/* ─────────────────────────────────────────────────────────────────────── */

function ExtrasStep({
  extras,
  nights,
  guests,
  onChange,
}: {
  extras: HotelCheckoutExtra[];
  nights: number;
  guests: number;
  onChange: (key: string, qty: number) => void;
}) {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold mb-1">Étape 4 sur 5</p>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">Personnalisez votre séjour</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Ajoutez des services pour un séjour sur mesure. Aucun engagement, tout reste modifiable jusqu'au paiement.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXTRAS_CATALOG.map((cat) => {
          const cur = extras.find((e) => e.key === cat.key);
          const qty = cur?.quantity ?? 0;
          const lineTotal = cur ? extraTotal(cur, nights, guests) : 0;
          const active = qty > 0;
          return (
            <div
              key={cat.key}
              className={cn(
                'rounded-2xl border p-4 transition-all',
                active
                  ? 'border-amber-400/40 bg-amber-400/[0.06] shadow-lg shadow-amber-400/5'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-neutral-100">{cat.name}</h4>
                  <p className="mt-0.5 text-xs text-neutral-500 leading-snug">{cat.description}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-sm font-bold text-amber-400">{fmtMoney(cat.unitPrice)}</span>
                    <span className="text-[11px] text-neutral-600">
                      {cat.unit === 'per_night' ? '/ nuit' : cat.unit === 'per_person' ? '/ personne' : 'une fois'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Counter value={qty} min={0} max={5} onChange={(v) => onChange(cat.key, v)} compact />
                {active && (
                  <span className="text-xs font-semibold text-amber-300 tabular-nums">+ {fmtMoney(lineTotal)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* STEP 5 — Payment                                                         */
/* ─────────────────────────────────────────────────────────────────────── */

function PaymentStep({
  total,
  paymentOption,
  onPaymentOption,
  acceptedHotelPolicy,
  acceptedPlatformTerms,
  onAcceptHotel,
  onAcceptPlatform,
}: {
  total: number;
  paymentOption: PaymentOption;
  onPaymentOption: (v: PaymentOption) => void;
  acceptedHotelPolicy: boolean;
  acceptedPlatformTerms: boolean;
  onAcceptHotel: (v: boolean) => void;
  onAcceptPlatform: (v: boolean) => void;
}) {
  const deposit = Math.round(total * 0.3);

  const options: Array<{ key: PaymentOption; title: string; desc: string; icon: React.ComponentType<{ className?: string }>; payNow: number; remaining: number }> = [
    { key: 'online', title: 'Payer en ligne maintenant', desc: 'Carte bancaire sécurisée. Confirmation immédiate.', icon: CreditCard, payNow: total, remaining: 0 },
    { key: 'deposit', title: 'Acompte 30%', desc: 'Versez un acompte maintenant, soldez à l\'hôtel.', icon: Wallet, payNow: deposit, remaining: total - deposit },
    { key: 'pay_at_hotel', title: 'Payer à l\'hôtel', desc: 'Aucun paiement maintenant. Confirmation soumise à l\'hôtel.', icon: Hotel, payNow: 0, remaining: total },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold mb-1">Étape 5 sur 5</p>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">Paiement & confirmation</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Choisissez la formule de paiement qui vous convient. Toutes les options sont sécurisées.
        </p>
      </header>

      <div className="space-y-3">
        {options.map((o) => {
          const Icon = o.icon;
          const active = paymentOption === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onPaymentOption(o.key)}
              className={cn(
                'w-full text-left flex items-start gap-4 rounded-2xl border p-4 sm:p-5 transition-all',
                active
                  ? 'border-amber-400/50 bg-amber-400/[0.07] shadow-lg shadow-amber-400/10'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'
              )}
            >
              <span
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl shrink-0',
                  active ? 'bg-amber-400 text-black' : 'bg-white/[0.06] text-neutral-400'
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-neutral-100">{o.title}</h4>
                  <span
                    className={cn(
                      'inline-flex size-4 items-center justify-center rounded-full border shrink-0',
                      active ? 'border-amber-400 bg-amber-400' : 'border-white/20'
                    )}
                  >
                    {active && <Check className="size-2.5 text-black" />}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500 leading-snug">{o.desc}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5">
                    <span className="text-neutral-600 block">À payer maintenant</span>
                    <span className="font-semibold text-neutral-200 tabular-nums">{fmtMoney(o.payNow)}</span>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5">
                    <span className="text-neutral-600 block">À l'hôtel</span>
                    <span className="font-semibold text-neutral-200 tabular-nums">{fmtMoney(o.remaining)}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Notice icon={Lock} tone="success">
        Paiement chiffré SSL · Aucune donnée bancaire n'est stockée par Ma Reservation.
      </Notice>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-200">Conditions</h3>
        <Checkbox
          checked={acceptedHotelPolicy}
          onChange={onAcceptHotel}
          label="J'accepte les politiques de l'hôtel"
          description="Check-in à partir de 14h, check-out avant 12h. Annulation gratuite jusqu'à 24h avant l'arrivée."
        />
        <Checkbox
          checked={acceptedPlatformTerms}
          onChange={onAcceptPlatform}
          label="J'accepte les conditions générales de Ma Reservation"
          description="Voir les CGV et la politique de confidentialité."
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Summary aside                                                            */
/* ─────────────────────────────────────────────────────────────────────── */

function BookingSummary({
  venue,
  room,
  checkIn,
  checkOut,
  nights,
  adults,
  children,
  subtotal,
  taxes,
  extrasTotal,
  extras,
  total,
}: {
  venue?: Venue;
  room?: HotelRoom;
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
  adults: number;
  children: number;
  subtotal: number;
  taxes: number;
  extrasTotal: number;
  extras: HotelCheckoutExtra[];
  total: number;
}) {
  const activeExtras = extras.filter((e) => e.quantity > 0);
  const cover = room?.coverImage ?? room?.gallery?.[0];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] overflow-hidden">
      {cover && (
        <div className="relative aspect-[16/9]">
          <Image src={cover} alt={room?.name ?? 'Chambre'} fill className="object-cover" sizes="400px" />
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
            <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">{venue?.name}</p>
            <h4 className="text-base font-bold text-white truncate">{room?.name ?? room?.roomType}</h4>
          </div>
        </div>
      )}

      <div className="p-5 space-y-4">
        <dl className="space-y-2 text-sm">
          <SumRow label="Arrivée" value={fmtDateLong(checkIn)} />
          <SumRow label="Départ" value={fmtDateLong(checkOut)} />
          <SumRow label="Durée" value={`${nights} nuit${nights > 1 ? 's' : ''}`} />
          <SumRow label="Voyageurs" value={`${adults} adulte${adults > 1 ? 's' : ''}${children ? ` · ${children} enfant${children > 1 ? 's' : ''}` : ''}`} />
        </dl>

        <div className="h-px bg-white/[0.06]" />

        <dl className="space-y-1.5 text-sm">
          <SumRow label={`${room?.pricePerNight?.toLocaleString('fr-FR') ?? '—'} DT × ${nights} nuit${nights > 1 ? 's' : ''}`} value={fmtMoney(subtotal)} muted />
          <SumRow label="Taxes & frais (10%)" value={fmtMoney(taxes)} muted />
          {activeExtras.length > 0 && (
            <>
              <SumRow label="Extras" value={fmtMoney(extrasTotal)} muted />
              <ul className="pl-2 space-y-0.5 text-[11px] text-neutral-600">
                {activeExtras.map((e) => (
                  <li key={e.key} className="flex items-center justify-between">
                    <span>· {e.name} × {e.quantity}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </dl>

        <div className="h-px bg-white/[0.06]" />

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-neutral-300 font-medium">Total</span>
          <span className="text-2xl font-bold text-amber-400 tabular-nums">{fmtMoney(total)}</span>
        </div>

        <p className="text-[10px] text-neutral-600 text-center leading-relaxed">
          Annulation gratuite jusqu'à 24h avant l'arrivée. Aucun frais caché.
        </p>
      </div>
    </div>
  );
}

/* ─── small primitives ────────────────────────────────────────────────── */

function Counter({ value, min, max, onChange, compact }: { value: number; min: number; max: number; onChange: (n: number) => void; compact?: boolean }) {
  const size = compact ? 'size-7' : 'size-9';
  return (
    <div className={cn('inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03]', compact ? 'p-0.5' : 'p-1')}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn('flex items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all', size)}
        aria-label="Réduire"
      >
        <Minus className={compact ? 'size-3' : 'size-4'} />
      </button>
      <span className={cn('w-6 text-center font-semibold text-neutral-100 tabular-nums', compact ? 'text-xs' : 'text-sm')}>{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn('flex items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all', size)}
        aria-label="Ajouter"
      >
        <Plus className={compact ? 'size-3' : 'size-4'} />
      </button>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
        checked ? 'border-amber-400/40 bg-amber-400/[0.06]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15'
      )}
    >
      <span
        className={cn(
          'mt-0.5 inline-flex h-5 w-9 items-center rounded-full border transition-all',
          checked ? 'bg-amber-400 border-amber-400' : 'bg-white/[0.04] border-white/15'
        )}
      >
        <span
          className={cn(
            'h-4 w-4 rounded-full bg-white transition-transform shadow',
            checked ? 'translate-x-4 bg-black' : 'translate-x-0.5'
          )}
        />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-neutral-200">{label}</span>
        {description && <span className="block text-[11px] text-neutral-600 mt-0.5">{description}</span>}
      </span>
    </button>
  );
}

function Checkbox({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span
        className={cn(
          'mt-0.5 inline-flex size-5 items-center justify-center rounded-md border transition-all',
          checked ? 'border-amber-400 bg-amber-400' : 'border-white/20 bg-white/[0.02] group-hover:border-white/40'
        )}
      >
        {checked && <Check className="size-3 text-black" />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex-1">
        <span className="block text-sm text-neutral-200">{label}</span>
        {description && <span className="block text-[11px] text-neutral-600 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-neutral-200 truncate">{value}</p>
    </div>
  );
}

function SumRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className={cn('text-xs', muted ? 'text-neutral-600' : 'text-neutral-500')}>{label}</dt>
      <dd className={cn('text-xs font-medium tabular-nums', muted ? 'text-neutral-500' : 'text-neutral-200')}>{value}</dd>
    </div>
  );
}

function Notice({
  icon: Icon,
  tone = 'info',
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'info' | 'success' | 'warn';
  children: React.ReactNode;
}) {
  const toneCls =
    tone === 'success'
      ? 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300'
      : tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/[0.06] text-amber-300'
      : 'border-white/[0.07] bg-white/[0.02] text-neutral-400';
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-relaxed', toneCls)}>
      <Icon className="size-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
