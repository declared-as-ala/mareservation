'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOwnerEvent,
  fetchOwnerEvents,
  submitOwnerEvent,
  updateOwnerEvent,
  type OwnerEvent,
  type OwnerEventTicketType,
} from '@/lib/api/owner-events';
import { fetchOwnerVenues } from '@/lib/api/owner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  CalendarClock,
  CheckCircle2,
  Crown,
  Edit3,
  ImageIcon,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

type TicketDraft = OwnerEventTicketType & {
  _id?: string;
  salesStartAt?: string;
  salesEndAt?: string;
};

const EVENT_TYPES = [
  { value: 'concert', label: 'Concert' },
  { value: 'standup', label: 'Stand-up' },
  { value: 'cinema', label: 'Cinema / Projection' },
  { value: 'sport', label: 'Sport' },
  { value: 'festival', label: 'Festival' },
  { value: 'private', label: 'Evenement prive' },
  { value: 'other', label: 'Autre' },
];

const RESERVATION_MODES = [
  { value: 'ticket', label: 'Billets simples', hint: 'Capacite globale par type de billet.' },
  { value: 'seat_zone', label: 'Zones VIP / Normal', hint: 'Parfait pour cinema, spectacle ou salle.' },
  { value: 'seat', label: 'Places numerotees', hint: 'Preparation pour plan de salle.' },
];

const DEFAULT_TICKETS: TicketDraft[] = [
  { name: 'Normal', price: 30, capacity: 1000, sold: 0, maxPerOrder: 10, isActive: true },
  { name: 'VIP', price: 90, capacity: 200, sold: 0, maxPerOrder: 6, isActive: true },
];

function formatLocalInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'border-zinc-700 bg-zinc-800 text-zinc-300',
    pending_review: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    changes_requested: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
    rejected: 'border-red-400/30 bg-red-400/10 text-red-200',
  };
  return map[status] ?? map.draft;
}

function venueName(venueId: OwnerEvent['venueId']) {
  return typeof venueId === 'object' ? venueId.name : 'Lieu';
}

function eventTotals(event: OwnerEvent) {
  return (event.ticketTypes ?? []).reduce(
    (acc, ticket) => {
      const capacity = Number(ticket.capacity || 0);
      const sold = Number(ticket.sold || 0);
      acc.capacity += capacity;
      acc.sold += sold;
      acc.revenue += sold * Number(ticket.price || 0);
      acc.potential += capacity * Number(ticket.price || 0);
      return acc;
    },
    { capacity: 0, sold: 0, revenue: 0, potential: 0 }
  );
}

export default function OwnerEventsPage() {
  const qc = useQueryClient();
  const { data: events = [], isLoading: eventsLoading } = useQuery({ queryKey: ['owner-events'], queryFn: fetchOwnerEvents });
  const { data: venues = [] } = useQuery({ queryKey: ['owner-venues'], queryFn: fetchOwnerVenues });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [venueId, setVenueId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('concert');
  const [reservationMode, setReservationMode] = useState<'ticket' | 'seat_zone' | 'seat' | 'table'>('ticket');
  const [coverImage, setCoverImage] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [description, setDescription] = useState('');
  const [termsFr, setTermsFr] = useState('');
  const [ageRestriction, setAgeRestriction] = useState('');
  const [tickets, setTickets] = useState<TicketDraft[]>(DEFAULT_TICKETS);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [events]
  );

  const formTotals = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc.capacity += Number(ticket.capacity || 0);
        acc.potential += Number(ticket.capacity || 0) * Number(ticket.price || 0);
        return acc;
      },
      { capacity: 0, potential: 0 }
    );
  }, [tickets]);

  const resetForm = () => {
    setEditingId(null);
    setVenueId('');
    setTitle('');
    setType('concert');
    setReservationMode('ticket');
    setCoverImage('');
    setStartAt('');
    setEndsAt('');
    setDescription('');
    setTermsFr('');
    setAgeRestriction('');
    setTickets(DEFAULT_TICKETS);
  };

  const loadEvent = (event: OwnerEvent) => {
    const resolvedVenueId = typeof event.venueId === 'object' ? event.venueId._id : event.venueId;
    setEditingId(event._id);
    setVenueId(resolvedVenueId || '');
    setTitle(event.title || '');
    setType(event.type || 'concert');
    setReservationMode(event.reservationMode || 'ticket');
    setCoverImage(event.coverImage || '');
    setStartAt(formatLocalInput(event.startAt));
    setEndsAt(formatLocalInput(event.endsAt));
    setDescription(event.description || '');
    setTermsFr(event.termsFr || '');
    setAgeRestriction(event.ageRestriction || '');
    setTickets(
      event.ticketTypes?.length
        ? event.ticketTypes.map((ticket) => ({
            ...ticket,
            salesStartAt: formatLocalInput(ticket.salesStartAt),
            salesEndAt: formatLocalInput(ticket.salesEndAt),
            maxPerOrder: ticket.maxPerOrder || 10,
            isActive: ticket.isActive !== false,
          }))
        : DEFAULT_TICKETS
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!venueId) throw new Error('Choisissez le lieu de l evenement.');
      if (!title.trim()) throw new Error('Ajoutez le titre.');
      if (!startAt) throw new Error('Ajoutez la date de debut.');
      const cleanTickets = tickets
        .filter((ticket) => ticket.name.trim() && Number(ticket.capacity || 0) > 0)
        .map((ticket) => ({
          _id: ticket._id,
          name: ticket.name.trim(),
          price: Number(ticket.price || 0),
          capacity: Number(ticket.capacity || 0),
          sold: Number(ticket.sold || 0),
          maxPerOrder: Number(ticket.maxPerOrder || 10),
          salesStartAt: ticket.salesStartAt || undefined,
          salesEndAt: ticket.salesEndAt || undefined,
          isActive: ticket.isActive !== false,
        }));
      if (!cleanTickets.length) throw new Error('Ajoutez au moins un type de billet.');
      const payload = {
        venueId,
        title: title.trim(),
        type,
        reservationMode,
        coverImage: coverImage.trim() || undefined,
        startAt,
        endsAt: endsAt || undefined,
        description: description.trim(),
        termsFr: termsFr.trim() || undefined,
        ageRestriction: ageRestriction.trim() || undefined,
        ticketTypes: cleanTickets,
      };
      return editingId ? updateOwnerEvent(editingId, payload) : createOwnerEvent(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Evenement mis a jour.' : 'Brouillon evenement cree.');
      qc.invalidateQueries({ queryKey: ['owner-events'] });
      if (!editingId) resetForm();
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur sauvegarde evenement.'),
  });

  const submitMutation = useMutation({
    mutationFn: submitOwnerEvent,
    onSuccess: () => {
      toast.success('Evenement envoye pour moderation.');
      qc.invalidateQueries({ queryKey: ['owner-events'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur envoi moderation.'),
  });

  const updateTicket = (index: number, patch: Partial<TicketDraft>) => {
    setTickets((current) => current.map((ticket, i) => (i === index ? { ...ticket, ...patch } : ticket)));
  };

  const removeTicket = (index: number) => {
    setTickets((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  };

  return (
    <div className="min-h-screen bg-[#080808] px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-zinc-800 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(24,24,27,0.9)_40%,rgba(8,8,8,1))] p-5 shadow-2xl shadow-black/30 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
                <Sparkles className="size-3.5" />
                Event studio
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Vendez vos billets comme une grande plateforme.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
                Creez un evenement, separez vos billets Normal / VIP / Early Bird, envoyez en moderation, puis suivez la capacite et les ventes.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[380px]">
              <div className="rounded-2xl border border-zinc-800 bg-black/35 p-4">
                <p className="text-2xl font-black text-white">{events.length}</p>
                <p className="text-xs text-zinc-500">evenements</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/35 p-4">
                <p className="text-2xl font-black text-white">{sortedEvents.filter((e) => e.approvalStatus === 'approved').length}</p>
                <p className="text-xs text-zinc-500">approuves</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black/35 p-4">
                <p className="text-2xl font-black text-amber-300">{formTotals.capacity}</p>
                <p className="text-xs text-zinc-500">billets draft</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-xl shadow-black/20 md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Configuration</p>
                <h2 className="mt-1 text-2xl font-black">{editingId ? 'Modifier evenement' : 'Creer un evenement'}</h2>
              </div>
              {editingId ? (
                <Button variant="outline" className="rounded-full border-zinc-700 text-zinc-200" onClick={resetForm}>
                  Nouveau brouillon
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-zinc-300">Lieu organisateur</Label>
                <select
                  className="h-12 w-full rounded-2xl border border-zinc-800 bg-black px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                >
                  <option value="">Choisir un lieu</option>
                  {venues.map((venue: any) => (
                    <option key={venue._id} value={venue._id}>
                      {venue.name} {venue.city ? `- ${venue.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Titre</Label>
                <Input className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Gala d'ouverture" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Categorie</Label>
                <select
                  className="h-12 w-full rounded-2xl border border-zinc-800 bg-black px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {EVENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Image affiche / cover</Label>
                <div className="relative">
                  <ImageIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                  <Input className="h-12 rounded-2xl border-zinc-800 bg-black pl-11 text-zinc-100" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Debut</Label>
                <Input type="datetime-local" className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Fin</Label>
                <Input type="datetime-local" className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Label className="text-zinc-300">Mode de reservation</Label>
              <div className="grid gap-3 md:grid-cols-3">
                {RESERVATION_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setReservationMode(mode.value as any)}
                    className={cn(
                      'min-h-[92px] rounded-2xl border p-4 text-left transition',
                      reservationMode === mode.value
                        ? 'border-amber-400 bg-amber-400 text-black shadow-lg shadow-amber-400/15'
                        : 'border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600'
                    )}
                  >
                    <span className="block text-sm font-black">{mode.label}</span>
                    <span className={cn('mt-1 block text-xs leading-5', reservationMode === mode.value ? 'text-black/70' : 'text-zinc-500')}>{mode.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-zinc-300">Description client</Label>
                <textarea
                  className="min-h-[130px] w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Programme, ambiance, artistes, conditions d'entree..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Restriction age</Label>
                <Input className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={ageRestriction} onChange={(e) => setAgeRestriction(e.target.value)} placeholder="Ex. +18, familial..." />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Conditions billets</Label>
                <Input className="h-12 rounded-2xl border-zinc-800 bg-black text-zinc-100" value={termsFr} onChange={(e) => setTermsFr(e.target.value)} placeholder="Ex. Billets non remboursables sauf annulation" />
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-xl shadow-black/20 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Inventaire</p>
                <h2 className="mt-1 text-xl font-black">Billets & zones</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-zinc-700 text-zinc-200"
                onClick={() => setTickets((current) => [...current, { name: 'Early Bird', price: 20, capacity: 100, sold: 0, maxPerOrder: 4, isActive: true }])}
              >
                <Plus className="mr-2 size-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {tickets.map((ticket, index) => (
                <div key={`${ticket._id || 'ticket'}-${index}`} className="rounded-2xl border border-zinc-800 bg-black/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid size-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
                        {ticket.name.toLowerCase().includes('vip') ? <Crown className="size-4" /> : <Ticket className="size-4" />}
                      </div>
                      <div>
                        <Input
                          className="h-9 rounded-xl border-zinc-800 bg-zinc-950 text-sm font-bold text-zinc-100"
                          value={ticket.name}
                          onChange={(e) => updateTicket(index, { name: e.target.value })}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Supprimer ce type de billet"
                      className="grid size-10 place-items-center rounded-xl border border-zinc-800 text-zinc-500 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
                      disabled={tickets.length <= 1}
                      onClick={() => removeTicket(index)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">Prix TND</Label>
                      <Input type="number" min={0} className="h-11 rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100" value={ticket.price} onChange={(e) => updateTicket(index, { price: Number(e.target.value || 0) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">Capacite</Label>
                      <Input type="number" min={1} className="h-11 rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100" value={ticket.capacity} onChange={(e) => updateTicket(index, { capacity: Number(e.target.value || 0) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">Max / commande</Label>
                      <Input type="number" min={1} max={20} className="h-11 rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100" value={ticket.maxPerOrder ?? 10} onChange={(e) => updateTicket(index, { maxPerOrder: Number(e.target.value || 1) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">Vendues</Label>
                      <div className="flex h-11 items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-400">{ticket.sold || 0}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">Debut vente</Label>
                      <Input type="datetime-local" className="h-11 rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100" value={ticket.salesStartAt || ''} onChange={(e) => updateTicket(index, { salesStartAt: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">Fin vente</Label>
                      <Input type="datetime-local" className="h-11 rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100" value={ticket.salesEndAt || ''} onChange={(e) => updateTicket(index, { salesEndAt: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-xs text-zinc-500">Capacite totale</p>
                <p className="mt-1 text-2xl font-black text-white">{formTotals.capacity}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <p className="text-xs text-zinc-500">Potentiel brut</p>
                <p className="mt-1 text-2xl font-black text-amber-300">{formTotals.potential} TND</p>
              </div>
            </div>

            <Button
              className="mt-4 h-12 w-full rounded-2xl bg-amber-400 font-black text-black hover:bg-amber-300"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
              {editingId ? 'Sauvegarder les modifications' : 'Creer le brouillon'}
            </Button>
          </aside>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-xl shadow-black/20 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Production</p>
              <h2 className="mt-1 text-2xl font-black">Mes evenements</h2>
            </div>
            {eventsLoading ? <Loader2 className="size-5 animate-spin text-zinc-500" /> : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {sortedEvents.map((event) => {
              const totals = eventTotals(event);
              const remaining = Math.max(0, totals.capacity - totals.sold);
              return (
                <article key={event._id} className="overflow-hidden rounded-3xl border border-zinc-800 bg-black/55">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row">
                    <div className="relative h-32 rounded-2xl bg-zinc-900 sm:w-44">
                      {event.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.coverImage} alt="" className="h-full w-full rounded-2xl object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-zinc-700">
                          <CalendarClock className="size-10" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="line-clamp-1 text-lg font-black text-white">{event.title}</h3>
                          <p className="mt-1 text-xs text-zinc-500">{venueName(event.venueId)} - {new Date(event.startAt).toLocaleString('fr-FR')}</p>
                        </div>
                        <span className={cn('rounded-full border px-3 py-1 text-xs font-bold', statusBadge(event.approvalStatus))}>
                          {event.approvalStatus}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                          <p className="text-[11px] text-zinc-500">Capacite</p>
                          <p className="font-black text-white">{totals.capacity}</p>
                        </div>
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                          <p className="text-[11px] text-zinc-500">Vendues</p>
                          <p className="font-black text-emerald-300">{totals.sold}</p>
                        </div>
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                          <p className="text-[11px] text-zinc-500">Restantes</p>
                          <p className="font-black text-amber-300">{remaining}</p>
                        </div>
                      </div>
                      {event.adminNote ? <p className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-xs text-sky-200">Note admin: {event.adminNote}</p> : null}
                      {event.rejectionReason ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">Refus: {event.rejectionReason}</p> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 p-4">
                    <div className="flex flex-wrap gap-2">
                      {(event.ticketTypes ?? []).slice(0, 3).map((ticket) => (
                        <span key={String(ticket._id || ticket.name)} className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                          {ticket.name}: {ticket.price} TND
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-full border-zinc-700 text-zinc-200" onClick={() => loadEvent(event)}>
                        <Edit3 className="mr-2 size-4" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-full bg-amber-400 font-bold text-black hover:bg-amber-300"
                        disabled={submitMutation.isPending || event.approvalStatus === 'pending_review' || event.approvalStatus === 'approved'}
                        onClick={() => submitMutation.mutate(event._id)}
                      >
                        <Send className="mr-2 size-4" />
                        Soumettre
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!sortedEvents.length ? (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-black/40 p-10 text-center">
              <Ticket className="mx-auto mb-3 size-10 text-zinc-700" />
              <p className="font-semibold text-zinc-300">Aucun evenement pour le moment.</p>
              <p className="mt-1 text-sm text-zinc-500">Creez votre premier brouillon avec Normal et VIP, puis envoyez-le en moderation.</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
