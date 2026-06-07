'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { fetchEventByIdOrSlug } from '@/lib/api/events';
import { createEventOrder } from '@/lib/api/event-checkout';
import { getEventAvailability } from '@/lib/events/availability';
import { DetailPageSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TypeBadge } from '@/components/shared/TypeBadge';
import { EventImmersiveShowcase } from '@/components/events/EventImmersiveShowcase';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Loader2,
  MapPin,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

const EVENT_SERVICE_FEE_TND = 1.5;

function getVenueId(ev: { venueId: string | { _id: string; name?: string } }): string | null {
  const v = ev.venueId;
  if (typeof v === 'object' && v?._id) return v._id;
  if (typeof v === 'string') return v;
  return null;
}

function getVenueName(ev: { venueId: string | { name?: string } }): string {
  const v = ev.venueId;
  if (typeof v === 'object' && v?.name) return v.name;
  return 'Lieu de l evenement';
}

function getVenueCity(ev: { venueId: string | { city?: string; address?: string } }): string {
  const v = ev.venueId;
  if (typeof v === 'object') return [v.city, v.address].filter(Boolean).join(' - ');
  return '';
}

function ticketRemaining(ticket: { capacity: number; sold?: number }) {
  return Math.max(0, Number(ticket.capacity || 0) - Number(ticket.sold || 0));
}

function getEventImages(event: any): string[] {
  const venue = typeof event.venueId === 'object' ? event.venueId : null;
  return [
    event.coverImage,
    event.imageUrl,
    ...(Array.isArray(event.galleryUrls) ? event.galleryUrls : []),
    venue?.coverImage,
    ...(Array.isArray(venue?.gallery) ? venue.gallery : []),
  ].filter(Boolean);
}

export default function EventDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { isAuthenticated, hasHydrated, isResolving } = useAuthStore();

  const [ticketTypeId, setTicketTypeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online_mock' | 'cash_order'>('online_mock');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => fetchEventByIdOrSlug(slug),
    enabled: !!slug,
  });

  const ticketTypes = useMemo(() => (event?.ticketTypes ?? []).filter((ticket) => ticket.isActive !== false), [event]);
  const selectedTicket = useMemo(
    () => ticketTypes.find((ticket) => String(ticket._id) === ticketTypeId) ?? ticketTypes[0],
    [ticketTypeId, ticketTypes]
  );
  const maxQty = useMemo(() => {
    if (!selectedTicket) return 1;
    return Math.max(1, Math.min(20, Number(selectedTicket.maxPerOrder || 10), ticketRemaining(selectedTicket)));
  }, [selectedTicket]);
  const subtotal = Number(selectedTicket?.price || 0) * quantity;
  const serviceFee = EVENT_SERVICE_FEE_TND * quantity;
  const total = subtotal + serviceFee;

  if (!slug) {
    return (
      <div className="min-h-screen bg-[#080808] px-4 py-12 text-center text-zinc-100">
        <p className="text-zinc-500">Identifiant manquant.</p>
        <Button variant="outline" className="mt-4 rounded-full border-zinc-700 text-zinc-200" asChild>
          <Link href="/evenements">Evenements</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] px-4 py-8">
        <DetailPageSkeleton />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#080808] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <ErrorState
            title="Evenement introuvable"
            message="Cet evenement n'existe pas ou n'est pas encore disponible."
            onRetry={() => refetch()}
          />
          <Button variant="outline" className="mt-4 rounded-full border-zinc-700 text-zinc-200" asChild>
            <Link href="/evenements">Voir les evenements</Link>
          </Button>
        </div>
      </div>
    );
  }

  const start = new Date(event.startAt);
  const end = new Date(event.endsAt || event.endAt || event.startAt);
  const venueId = getVenueId(event);
  const venueName = getVenueName(event);
  const venueLine = getVenueCity(event);
  const mediaImages = getEventImages(event);
  const imageUrl = event.coverImage ?? event.imageUrl ?? mediaImages[0] ?? null;
  const eventAvail = getEventAvailability(event.ticketTypes);
  const soldOut = !selectedTicket || ticketRemaining(selectedTicket) <= 0;

  const handleReserve = async () => {
    if (!hasHydrated || isResolving) {
      toast.message('Verification de votre session en cours.');
      return;
    }
    if (!isAuthenticated) {
      toast.message('Connectez-vous pour finaliser votre billet.');
      router.push(`/login?returnTo=${encodeURIComponent(`/evenement/${slug}`)}`);
      return;
    }
    if (!selectedTicket?._id) return toast.error('Aucun billet disponible.');
    if (soldOut) return toast.error('Ce type de billet est epuise.');
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return toast.error('Ajoutez nom, prenom et email.');
    if (!acceptedTerms) return toast.error('Acceptez les conditions de reservation.');

    try {
      setLoading(true);
      const result = await createEventOrder({
        eventId: event._id,
        ticketTypeId: String(selectedTicket._id),
        quantity,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        paymentMethod,
      });
      const reservationId = result?.data?.reservationId;
      if (!reservationId) throw new Error('Reservation introuvable');
      toast.success(paymentMethod === 'cash_order' ? 'Commande creee, paiement cash en attente.' : 'Billet confirme.');
      router.push(`/reservation/${reservationId}/confirmation`);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur reservation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100">
      <section className="relative overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0">
          {imageUrl ? (
            <Image src={imageUrl} alt={event.title} fill priority className="object-cover opacity-45" sizes="100vw" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.22),transparent_28%),linear-gradient(135deg,#18181b,#030303)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,0.96),rgba(8,8,8,0.72)_46%,rgba(8,8,8,0.96))]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#080808] to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-end px-4 py-8 md:px-6">
          <Button variant="ghost" className="mb-auto w-fit rounded-full text-zinc-300 hover:bg-white/10 hover:text-white" asChild>
            <Link href="/evenements">
              <ArrowLeft className="mr-2 size-4" />
              Tous les evenements
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <TypeBadge type={event.type} />
                {event.isVedette ? (
                  <span className="rounded-full border border-amber-400/40 bg-amber-400 px-3 py-1 text-xs font-black text-black">
                    Selection premium
                  </span>
                ) : null}
                <span className="rounded-full border border-zinc-700 bg-black/55 px-3 py-1 text-xs font-semibold text-zinc-300">
                  QR ticket inclus
                </span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">{event.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
                {event.description || 'Reservez votre billet, recevez votre QR code et presentez-le a l entree.'}
              </p>
              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur">
                  <Calendar className="mb-2 size-5 text-amber-300" />
                  <p className="font-bold text-white">{start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur">
                  <Clock className="mb-2 size-5 text-amber-300" />
                  <p className="font-bold text-white">
                    {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur">
                  <MapPin className="mb-2 size-5 text-amber-300" />
                  <p className="font-bold text-white">{venueName}</p>
                  {venueLine ? <p className="mt-1 text-xs text-zinc-400">{venueLine}</p> : null}
                </div>
              </div>
            </div>

              <div className="rounded-3xl border border-amber-400/20 bg-zinc-950/90 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Reservation</p>
                  <h2 className="mt-1 text-xl font-black">Choisir vos billets</h2>
                </div>
                <Ticket className="size-6 text-amber-300" />
              </div>

              {eventAvail.isSoldOut && (
                <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-center">
                  <p className="text-sm font-bold text-red-400">Evenement complet</p>
                  <p className="mt-1 text-xs text-red-300/70">Tous les billets ont ete vendus.</p>
                </div>
              )}

              <div className="space-y-3">
                {ticketTypes.map((ticket) => {
                  const remaining = ticketRemaining(ticket);
                  const active = String(ticket._id) === String(selectedTicket?._id);
                  return (
                    <button
                      key={String(ticket._id || ticket.name)}
                      type="button"
                      onClick={() => {
                        setTicketTypeId(String(ticket._id));
                        setQuantity(1);
                      }}
                      disabled={remaining <= 0}
                      className={cn(
                        'w-full rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                        active ? 'border-amber-400 bg-amber-400 text-black shadow-lg shadow-amber-400/15' : 'border-zinc-800 bg-black hover:border-zinc-600'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black">{ticket.name}</p>
                          <p className={cn('mt-1 text-xs', active ? 'text-black/65' : 'text-zinc-500')}>
                            {remaining > 0 ? `${remaining} billets restants` : 'Epuise'}
                          </p>
                        </div>
                        <p className="text-lg font-black">{ticket.price} TND</p>
                      </div>
                    </button>
                  );
                })}
                {!ticketTypes.length ? (
                  <div className="rounded-2xl border border-zinc-800 bg-black p-5 text-center text-sm text-zinc-500">
                    Aucun billet disponible pour cet evenement.
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Quantite</p>
                    <p className="text-xs text-zinc-500">Maximum {maxQty} par commande</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Diminuer la quantite"
                      className="grid size-11 place-items-center rounded-full border border-zinc-800 text-zinc-300 disabled:opacity-40"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="grid size-11 place-items-center rounded-full bg-zinc-900 font-black text-white">{quantity}</span>
                    <button
                      type="button"
                      aria-label="Augmenter la quantite"
                      className="grid size-11 place-items-center rounded-full border border-zinc-800 text-zinc-300 disabled:opacity-40"
                      disabled={quantity >= maxQty || soldOut}
                      onClick={() => setQuantity((value) => Math.min(maxQty, value + 1))}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_410px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-black">Experience evenement</h2>
                <p className="text-sm text-zinc-500">Billet numerique, QR code, suivi dans votre compte.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <QrCode className="mb-2 size-5 text-amber-300" />
                <p className="font-bold text-white">Ticket QR</p>
                <p className="mt-1 text-sm text-zinc-500">Visible apres confirmation et dans vos reservations.</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <ShieldCheck className="mb-2 size-5 text-emerald-300" />
                <p className="font-bold text-white">Inventaire securise</p>
                <p className="mt-1 text-sm text-zinc-500">Le stock est reserve au moment de la confirmation.</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <Users className="mb-2 size-5 text-sky-300" />
                <p className="font-bold text-white">Zones VIP / Normal</p>
                <p className="mt-1 text-sm text-zinc-500">L organisateur peut separer les prix et capacites.</p>
              </div>
            </div>
          </div>

          <EventImmersiveShowcase venueId={venueId} title={event.title} images={mediaImages} />

          {(event.reservationMode === 'seat' || event.reservationMode === 'seat_zone') ? (
            <div className="rounded-3xl border border-amber-400/20 bg-[linear-gradient(135deg,rgba(251,191,36,0.14),rgba(8,8,8,0.86))] p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Plan de salle</p>
                  <h2 className="mt-1 text-xl font-black">Selection visuelle preparee</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    Pour cinema, show et salle VIP, les billets sont organises par zone. La visite 360 peut etre liee au lieu pour guider le client avant achat.
                  </p>
                </div>
                <Landmark className="size-10 text-amber-300" />
              </div>
            </div>
          ) : null}

          {venueId ? (
            <Button variant="outline" className="rounded-full border-zinc-700 text-zinc-200 hover:bg-zinc-900" asChild>
              <Link href={`/explorer?venue=${venueId}`}>Voir le lieu</Link>
            </Button>
          ) : null}
        </section>

        <aside className="h-fit rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30 md:p-6 lg:sticky lg:top-24">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Checkout</p>
            <h2 className="mt-1 text-xl font-black">Informations client</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-zinc-300">Prenom</Label>
              <Input className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Nom</Label>
              <Input className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-zinc-300">Email</Label>
              <Input type="email" className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-zinc-300">Telephone</Label>
              <Input className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 ..." />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('online_mock')}
              className={cn(
                'min-h-[88px] rounded-2xl border p-4 text-left transition',
                paymentMethod === 'online_mock' ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600'
              )}
            >
              <CreditCard className="mb-2 size-5" />
              <span className="block font-black">Online</span>
              <span className={cn('text-xs', paymentMethod === 'online_mock' ? 'text-black/65' : 'text-zinc-500')}>Confirmation immediate</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cash_order')}
              className={cn(
                'min-h-[88px] rounded-2xl border p-4 text-left transition',
                paymentMethod === 'cash_order' ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600'
              )}
            >
              <Wallet className="mb-2 size-5" />
              <span className="block font-black">Cash</span>
              <span className={cn('text-xs', paymentMethod === 'cash_order' ? 'text-black/65' : 'text-zinc-500')}>A payer sous 4h</span>
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">{selectedTicket?.name || 'Billet'} x{quantity}</span>
              <span className="font-semibold text-zinc-200">{subtotal} TND</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-500">Frais service ({EVENT_SERVICE_FEE_TND} TND / billet)</span>
              <span className="font-semibold text-zinc-200">{serviceFee} TND</span>
            </div>
            <div className="mt-3 border-t border-zinc-800 pt-3 flex items-center justify-between">
              <span className="font-black text-white">Total</span>
              <span className="text-2xl font-black text-amber-300">{total} TND</span>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 size-4 accent-amber-400"
            />
            <span>
              J accepte les conditions de reservation et je comprends que le billet est non remboursable sauf annulation par l organisateur.
            </span>
          </label>

          <Button
            onClick={handleReserve}
            disabled={loading || soldOut || !ticketTypes.length || eventAvail.isSoldOut}
            className="mt-4 h-13 w-full rounded-2xl bg-amber-400 py-6 text-base font-black text-black hover:bg-amber-300"
          >
            {loading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <CheckCircle2 className="mr-2 size-5" />}
            {eventAvail.isSoldOut ? 'Evenement complet' : soldOut ? 'Billet epuise' : 'Confirmer et obtenir QR'}
          </Button>
        </aside>
      </main>
    </div>
  );
}
