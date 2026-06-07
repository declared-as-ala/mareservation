'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveAdminEvent, fetchAdminEventModeration, rejectAdminEvent, requestAdminEventChanges } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock3, Loader2, Search, ShieldAlert, Ticket, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type AdminEventRow = {
  _id: string;
  title: string;
  type?: string;
  description?: string;
  startAt: string;
  approvalStatus: string;
  venueId?: { name?: string; city?: string } | string;
  ticketTypes?: Array<{ name: string; price: number; capacity: number; sold?: number }>;
};

function eventTotals(event: AdminEventRow) {
  return (event.ticketTypes ?? []).reduce(
    (acc, ticket) => {
      acc.capacity += Number(ticket.capacity || 0);
      acc.sold += Number(ticket.sold || 0);
      acc.minPrice = acc.minPrice == null ? Number(ticket.price || 0) : Math.min(acc.minPrice, Number(ticket.price || 0));
      return acc;
    },
    { capacity: 0, sold: 0, minPrice: null as number | null }
  );
}

function venueName(event: AdminEventRow) {
  const venue = event.venueId;
  if (typeof venue === 'object' && venue?.name) return [venue.name, venue.city].filter(Boolean).join(' - ');
  return 'Lieu non renseigne';
}

export default function AdminEventsModerationPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending_review');
  const [q, setQ] = useState('');
  const { data: rawEvents = [], isLoading } = useQuery({
    queryKey: ['admin-event-moderation', status, q],
    queryFn: () => fetchAdminEventModeration({ status, q }),
  });
  const events = rawEvents as AdminEventRow[];

  const stats = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        const totals = eventTotals(event);
        acc.capacity += totals.capacity;
        acc.sold += totals.sold;
        if (event.approvalStatus === 'pending_review') acc.pending += 1;
        return acc;
      },
      { pending: 0, capacity: 0, sold: 0 }
    );
  }, [events]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-event-moderation'] });
  const approve = useMutation({
    mutationFn: approveAdminEvent,
    onSuccess: () => { toast.success('Evenement approuve.'); refresh(); },
    onError: (e: any) => toast.error(e?.message || 'Erreur approbation.'),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAdminEvent(id, reason),
    onSuccess: () => { toast.success('Evenement rejete.'); refresh(); },
    onError: (e: any) => toast.error(e?.message || 'Erreur rejet.'),
  });
  const changes = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => requestAdminEventChanges(id, note),
    onSuccess: () => { toast.success('Demande de corrections envoyee.'); refresh(); },
    onError: (e: any) => toast.error(e?.message || 'Erreur moderation.'),
  });

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-zinc-800 bg-[linear-gradient(135deg,rgba(251,191,36,0.14),rgba(24,24,27,0.78)_42%,rgba(8,8,8,1))] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Moderation marketplace</p>
            <h1 className="mt-2 text-3xl font-black text-white">Evenements a publier</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Controlez la qualite, la capacite billets, les prix VIP/Normal et publiez seulement les evenements complets.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
              <p className="text-2xl font-black text-amber-300">{stats.pending}</p>
              <p className="text-xs text-zinc-500">en attente</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
              <p className="text-2xl font-black text-white">{stats.capacity}</p>
              <p className="text-xs text-zinc-500">capacite</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
              <p className="text-2xl font-black text-emerald-300">{stats.sold}</p>
              <p className="text-xs text-zinc-500">vendus</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4 md:flex-row md:items-center">
        <select
          className="h-12 rounded-2xl border border-zinc-800 bg-black px-4 text-sm text-zinc-100 outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="pending_review">En attente</option>
          <option value="changes_requested">Corrections demandees</option>
          <option value="approved">Approuves</option>
          <option value="rejected">Rejetes</option>
        </select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Rechercher par titre..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 rounded-2xl border-zinc-800 bg-black pl-11 text-zinc-100"
          />
        </div>
        {isLoading ? <Loader2 className="size-5 animate-spin text-zinc-500" /> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {events.map((event) => {
          const totals = eventTotals(event);
          const remaining = Math.max(0, totals.capacity - totals.sold);
          const disabled = approve.isPending || reject.isPending || changes.isPending;
          return (
            <article key={event._id} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-xl shadow-black/20">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                    <Clock3 className="size-3.5" />
                    {event.approvalStatus}
                  </div>
                  <h2 className="line-clamp-1 text-xl font-black text-white">{event.title}</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {venueName(event)} - {new Date(event.startAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-right">
                  <p className="text-xs text-zinc-500">A partir de</p>
                  <p className="text-lg font-black text-amber-300">{totals.minPrice ?? 0} TND</p>
                </div>
              </div>

              <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">{event.description || 'Sans description'}</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-zinc-800 bg-black p-3">
                  <Ticket className="mb-2 size-4 text-amber-300" />
                  <p className="text-xs text-zinc-500">Capacite</p>
                  <p className="font-black text-white">{totals.capacity}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black p-3">
                  <CheckCircle2 className="mb-2 size-4 text-emerald-300" />
                  <p className="text-xs text-zinc-500">Vendus</p>
                  <p className="font-black text-emerald-300">{totals.sold}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black p-3">
                  <ShieldAlert className="mb-2 size-4 text-sky-300" />
                  <p className="text-xs text-zinc-500">Restants</p>
                  <p className="font-black text-sky-300">{remaining}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(event.ticketTypes ?? []).map((ticket) => (
                  <span key={ticket.name} className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-300">
                    {ticket.name}: {ticket.price} TND / {ticket.capacity}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full bg-amber-400 font-bold text-black hover:bg-amber-300" disabled={disabled} onClick={() => approve.mutate(event._id)}>
                  <CheckCircle2 className="mr-2 size-4" />
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-zinc-700 text-zinc-200"
                  disabled={disabled}
                  onClick={() => changes.mutate({ id: event._id, note: 'Merci de completer les informations, visuels, prix ou capacites avant publication.' })}
                >
                  Demander corrections
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-full"
                  disabled={disabled}
                  onClick={() => reject.mutate({ id: event._id, reason: 'Non conforme a la politique de publication.' })}
                >
                  <XCircle className="mr-2 size-4" />
                  Rejeter
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {!events.length && !isLoading ? (
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/60 p-10 text-center">
          <ShieldAlert className="mx-auto mb-3 size-10 text-zinc-700" />
          <p className="font-semibold text-zinc-300">Aucun evenement dans cette file.</p>
          <p className="mt-1 text-sm text-zinc-500">Changez le statut ou attendez une nouvelle soumission proprietaire.</p>
        </div>
      ) : null}
    </div>
  );
}
