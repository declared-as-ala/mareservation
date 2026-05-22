'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { createReservation } from '@/lib/api/reservations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Schema                                                               */
/* ------------------------------------------------------------------ */
const schema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  phone: z.string().min(8, 'Numéro de téléphone invalide').refine(
    (val) => /^(\+216|216)?[0-9]{8}$/.test(val.replace(/\s/g, '')),
    'Format téléphone invalide (ex: 12345678 ou +21612345678)'
  ),
  email: z.string().email('Email invalide'),
});
type FormData = z.infer<typeof schema>;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function splitFullName(name = '') {
  const parts = name.trim().split(' ');
  const firstName = parts[0] ?? '';
  const rest = parts.slice(1).join(' ');
  const lastName = rest.length > 0 ? rest : firstName;
  return { firstName, lastName };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/* Success Screen                                                       */
/* ------------------------------------------------------------------ */
function SuccessScreen({ ids }: { ids: string[] }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto size-24 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
          <CheckCircle2 className="size-12 text-amber-400" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Réservation confirmée !</h1>
          <p className="text-zinc-400 leading-relaxed">
            Votre réservation a été créée avec succès. Vous recevrez une confirmation bientôt.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-3">
            {ids.length > 1 ? 'Références' : 'Référence'}
          </p>
          {ids.map((id) => (
            <p key={id} className="text-amber-400 font-mono text-sm">
              #{id.slice(-8).toUpperCase()}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.push('/mes-reservations')}
            className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold rounded-full h-12"
          >
            Voir mes réservations
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/explorer')}
            className="text-zinc-400 hover:text-zinc-100"
          >
            Explorer d&apos;autres lieux
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */
export default function CheckoutPage() {
  const router = useRouter();
  const { user, hasHydrated, isResolving } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const totalAmount = useCartStore((s) => s.totalAmount());
  const clearCart = useCartStore((s) => s.clearCart);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState<string[] | null>(null);
  const [holdTick, setHoldTick] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setHoldTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Auth guard
  useEffect(() => {
    if (hasHydrated && !isResolving && user === null) {
      router.push('/login?returnTo=/checkout');
    }
  }, [hasHydrated, isResolving, user, router]);

  // Empty cart guard
  useEffect(() => {
    if (items.length === 0 && confirmedIds === null) {
      router.push('/panier');
    }
  }, [items, confirmedIds, router]);

  const { firstName: defaultFirst, lastName: defaultLast } = splitFullName(user?.fullName);
  const holdExpiries = items
    .map((item) => item.holdExpiresAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime());
  const earliestHoldExpiry = holdExpiries.length > 0 ? Math.min(...holdExpiries) : null;
  const holdSecondsLeft = earliestHoldExpiry ? Math.max(0, Math.floor((earliestHoldExpiry - holdTick) / 1000)) : null;
  const hasExpiredHold = holdSecondsLeft !== null && holdSecondsLeft <= 0;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: defaultFirst,
      lastName: defaultLast,
      email: user?.email ?? '',
      phone: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (hasExpiredHold) {
      toast.error('Le delai de maintien a expire pour au moins une reservation.');
      return;
    }
    setIsSubmitting(true);
    const ids: string[] = [];
    try {
      for (const item of items) {
        const startAt = item.dateTime;
        const endAt =
          item.endAt ??
          new Date(new Date(item.dateTime).getTime() + 2 * 60 * 60 * 1000).toISOString();

        const bookingType =
          item.type === 'venue_room' ? 'ROOM' : item.type === 'event_ticket' ? 'SEAT' : item.type === 'venue_coworking' ? 'COWORKING' : 'TABLE';

        const result = await createReservation({
          venueId: item.venueId ?? '',
          tableId: item.tableId,
          roomId: item.roomId,
          seatId: item.seatId,
          reservableUnitId: item.reservableUnitId,
          bookingType,
          startAt,
          endAt,
          partySize: item.quantity,
          guestFirstName: data.firstName,
          guestLastName: data.lastName,
          guestPhone: data.phone,
          guestEmail: data.email,
          orderType: item.orderType,
          menuItems: item.orderType === 'with_menu'
            ? (item.menuItems ?? []).map((m) => ({ itemId: m.itemId, quantity: m.quantity }))
            : undefined,
          coworkingDurationType: item.coworkingDurationType,
          coworkingHours: item.coworkingHours,
          coworkingAddons: item.coworkingAddons,
        });
        ids.push(result._id);
      }

      clearCart();
      setConfirmedIds(ids);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la réservation.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmedIds) return <SuccessScreen ids={confirmedIds} />;
  if (!user || items.length === 0) return null;

  return (
    <div className="min-h-screen bg-zinc-950 py-10 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/panier"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors text-sm mb-8 group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour au panier
        </Link>

        {/* Title */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-zinc-100 mb-1">Finaliser la réservation</h1>
          <p className="text-zinc-500 text-sm">
            {items.length} article{items.length > 1 ? 's' : ''} · {totalAmount} TND
          </p>
        </div>

        {holdSecondsLeft !== null && (
          <div
            className={cn(
              'mb-6 inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium',
              hasExpiredHold
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
            )}
          >
            <Clock className="mr-2 size-4" />
            {hasExpiredHold
              ? 'Le maintien de votre reservation a expire.'
              : `Reservation maintenue pendant ${Math.floor(holdSecondsLeft / 60).toString().padStart(2, '0')}:${String(holdSecondsLeft % 60).padStart(2, '0')}`}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-5 gap-8">
            {/* ── Left: form ─────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-6">
              {/* Contact */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                <h2 className="text-lg font-semibold text-zinc-100 mb-5 flex items-center gap-2">
                  <span className="size-7 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xs font-bold">
                    1
                  </span>
                  Vos informations
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-sm">Prénom</Label>
                    <Input
                      {...register('firstName')}
                      placeholder="Prénom"
                      className={cn(
                        'bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/60 focus:ring-amber-400/20',
                        errors.firstName && 'border-red-500/60'
                      )}
                    />
                    {errors.firstName && (
                      <p className="text-red-400 text-xs">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-sm">Nom</Label>
                    <Input
                      {...register('lastName')}
                      placeholder="Nom"
                      className={cn(
                        'bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/60 focus:ring-amber-400/20',
                        errors.lastName && 'border-red-500/60'
                      )}
                    />
                    {errors.lastName && (
                      <p className="text-red-400 text-xs">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-sm">Téléphone</Label>
                    <Input
                      {...register('phone')}
                      placeholder="+216 XX XXX XXX"
                      type="tel"
                      className={cn(
                        'bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/60 focus:ring-amber-400/20',
                        errors.phone && 'border-red-500/60'
                      )}
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-xs">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300 text-sm">Email</Label>
                    <Input
                      {...register('email')}
                      placeholder="email@exemple.com"
                      type="email"
                      className={cn(
                        'bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400/60 focus:ring-amber-400/20',
                        errors.email && 'border-red-500/60'
                      )}
                    />
                    {errors.email && (
                      <p className="text-red-400 text-xs">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                <h2 className="text-lg font-semibold text-zinc-100 mb-5 flex items-center gap-2">
                  <span className="size-7 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xs font-bold">
                    2
                  </span>
                  Détails de la réservation
                </h2>

                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50"
                    >
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                            <MapPin className="size-5 text-zinc-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-100 text-sm">{item.title}</p>
                        <p className="text-amber-400/80 text-xs mb-2">{item.unitLabel}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-zinc-500" />
                            {formatDate(item.dateTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="size-3 text-zinc-500" />
                            {item.quantity} {item.quantity > 1 ? 'places' : 'place'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-zinc-100">
                          {item.price * item.quantity} TND
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-amber-400/60" />
                  Paiement sécurisé
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-amber-400/60" />
                  Confirmation instantanée
                </span>
              </div>
            </div>

            {/* ── Right: summary ─────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="sticky top-20 rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-6">
                <h2 className="font-semibold text-zinc-100 mb-5">Récapitulatif</h2>

                <div className="space-y-3 mb-5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm gap-2">
                      <span className="text-zinc-400 truncate">
                        {item.title}
                        <span className="text-zinc-600 ml-1">· {item.unitLabel}</span>
                      </span>
                      <span className="text-zinc-200 shrink-0 font-medium">
                        {item.price * item.quantity} TND
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="bg-zinc-800 mb-5" />

                <div className="flex items-center justify-between mb-7">
                  <span className="text-zinc-300 font-semibold">Total</span>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-amber-400">{totalAmount}</p>
                    <p className="text-xs text-zinc-500">TND</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || hasExpiredHold}
                  className="w-full h-13 rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-base gap-2 shadow-lg shadow-amber-400/20 transition-all disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                      Traitement en cours…
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="size-5" />
                      Confirmer et payer
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-zinc-600 mt-4 leading-relaxed">
                  En confirmant, vous acceptez nos{' '}
                  <span className="text-zinc-400 underline cursor-pointer">
                    conditions d&apos;utilisation
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
