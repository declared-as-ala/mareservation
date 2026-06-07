'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BedDouble,
  Plus,
  X,
  Hotel,
  Ban,
  UserPlus,
  Loader2,
  Trash2,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGetRaw } from '@/lib/api/client';
import { fetchOwnerDashboard } from '@/lib/api/owner';
import { fetchVenueRooms } from '@/lib/api/rooms';
import {
  fetchBlocks,
  createBlock,
  deleteBlock,
  createManualReservation,
  type RoomBlock,
  type RoomBlockReason,
  type ManualReservationPayload,
} from '@/lib/api/owner-hotel';
import type { HotelRoom, Reservation, Venue } from '@/lib/api/types';

/* ─── helpers ─────────────────────────────────────────────────────── */

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayDiff(a: Date, b: Date) {
  const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() -
    new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  return Math.round(ms / 86_400_000);
}

const REASON_LABELS: Record<RoomBlockReason, string> = {
  maintenance: 'Maintenance',
  private_event: 'Événement privé',
  owner_hold: 'Réservation propriétaire',
  cleaning: 'Ménage',
  renovation: 'Rénovation',
  staff_use: 'Usage interne',
  offline_booking: 'Réservation hors-ligne',
  emergency: 'Urgence',
  other: 'Autre',
};

/* ─── page ────────────────────────────────────────────────────────── */

export default function OwnerAvailabilityPage() {
  const qc = useQueryClient();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const [drawer, setDrawer] = useState<{
    open: boolean;
    roomId: string | null;
    date: Date | null;
    mode: 'block' | 'reservation';
  }>({ open: false, roomId: null, date: null, mode: 'block' });

  // Owner venues
  const { data: ownerData } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: fetchOwnerDashboard,
  });

  useEffect(() => {
    if (!selectedVenueId && ownerData?.venues?.length) {
      const firstHotel = ownerData.venues.find((v) => v.type === 'HOTEL') ?? ownerData.venues[0];
      setSelectedVenueId(firstHotel._id);
    }
  }, [ownerData, selectedVenueId]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const daysInMonth = monthEnd.getDate();

  // Rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['owner-availability-rooms', selectedVenueId],
    queryFn: () => fetchVenueRooms(selectedVenueId!),
    enabled: !!selectedVenueId,
  });

  // Reservations
  const { data: allReservations = [] } = useQuery({
    queryKey: ['owner-availability-reservations'],
    queryFn: async () => {
      const data = await apiGetRaw<Reservation[]>('/owner/reservations');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedVenueId,
  });

  const reservations = useMemo(
    () =>
      allReservations.filter((r) => {
        const vId = typeof r.venueId === 'object' ? (r.venueId as { _id?: string })?._id : r.venueId;
        if (vId !== selectedVenueId) return false;
        const status = String(r.status).toLowerCase();
        if (['cancelled', 'no_show'].includes(status)) return false;
        const s = new Date(r.startAt);
        const e = new Date(r.endAt);
        return s <= monthEnd && e >= monthStart;
      }),
    [allReservations, selectedVenueId, monthStart, monthEnd]
  );

  // Blocks
  const { data: blocks = [] } = useQuery({
    queryKey: ['owner-availability-blocks', selectedVenueId, ymd(monthStart), ymd(monthEnd)],
    queryFn: () =>
      fetchBlocks(selectedVenueId!, {
        from: monthStart.toISOString(),
        to: new Date(monthEnd.getTime() + 86_400_000).toISOString(),
      }),
    enabled: !!selectedVenueId,
  });

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1));
  }, [daysInMonth, viewMonth]);

  const selectedVenue: Venue | undefined = ownerData?.venues?.find((v) => v._id === selectedVenueId);

  const deleteBlockMut = useMutation({
    mutationFn: (id: string) => deleteBlock(id),
    onSuccess: () => {
      toast.success('Blocage supprimé');
      qc.invalidateQueries({ queryKey: ['owner-availability-blocks'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Échec'),
  });

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.06] bg-[#080808]/85 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-4 py-4 flex flex-wrap items-center gap-3">
          <Link
            href="/owner"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-amber-400 hover:border-amber-400/40 transition-all"
          >
            <ArrowLeft className="size-3.5" />
            Espace propriétaire
          </Link>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">Espace propriétaire</p>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">Disponibilités & blocages</h1>
          </div>

          {/* Venue picker */}
          {ownerData?.venues && ownerData.venues.length > 1 && (
            <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm">
              <Building2 className="size-4 text-neutral-500" />
              <select
                value={selectedVenueId ?? ''}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="bg-transparent text-neutral-100 focus:outline-none text-xs"
              >
                {ownerData.venues.map((v) => (
                  <option key={v._id} value={v._id} className="bg-[#0C0C0C]">{v.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* Month nav */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              type="button"
              aria-label="Mois précédent"
              onClick={() =>
                setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
              }
              className="size-7 grid place-items-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="px-3 text-sm font-semibold tabular-nums min-w-[140px] text-center">
              {MONTHS_FR[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </div>
            <button
              type="button"
              aria-label="Mois suivant"
              onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="size-7 grid place-items-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMonth(startOfMonth(new Date()))}
              className="ml-1 px-2 h-7 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-amber-400 hover:bg-white/5 transition"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mx-auto max-w-[1400px] px-4 pb-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
          <LegendDot color="bg-amber-400/70" label="Réservation" />
          <LegendDot color="bg-emerald-400/70" label="En attente" />
          <LegendDot color="bg-red-500/70" label="Blocage" />
          <LegendDot color="bg-white/[0.06] border border-white/10" label="Disponible" hollow />
          <span className="ml-auto text-neutral-600">Cliquez sur une journée pour bloquer ou créer une réservation manuelle</span>
        </div>
      </header>

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!selectedVenueId ? (
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <Hotel className="size-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Aucun hôtel rattaché à votre compte.</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <BedDouble className="size-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Ajoutez d'abord des chambres pour gérer leur disponibilité.</p>
        </div>
      ) : (
        <main className="mx-auto max-w-[1400px] px-4 py-6 overflow-x-auto">
          {/* Day header row */}
          <div className="min-w-[900px]">
            <div
              className="grid items-center pb-2"
              style={{ gridTemplateColumns: `180px repeat(${daysInMonth}, minmax(28px, 1fr))` }}
            >
              <div className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">Chambre</div>
              {days.map((d) => {
                const isToday = sameDay(d, new Date());
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={ymd(d)}
                    className={cn(
                      'text-center text-[10px] font-medium tabular-nums',
                      isToday ? 'text-amber-400' : isWeekend ? 'text-neutral-500' : 'text-neutral-600'
                    )}
                  >
                    <div>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              {rooms.map((room) => (
                <RoomRow
                  key={room._id}
                  room={room}
                  days={days}
                  reservations={reservations}
                  blocks={blocks}
                  onCellClick={(date) =>
                    setDrawer({ open: true, roomId: room._id, date, mode: 'block' })
                  }
                  onDeleteBlock={(id) => deleteBlockMut.mutate(id)}
                />
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ── Drawer ─────────────────────────────────────────────── */}
      {drawer.open && selectedVenueId && (
        <ActionDrawer
          venueId={selectedVenueId}
          venueName={selectedVenue?.name}
          rooms={rooms}
          roomId={drawer.roomId ?? rooms[0]?._id ?? ''}
          initialDate={drawer.date ?? new Date()}
          initialMode={drawer.mode}
          onClose={() => setDrawer((p) => ({ ...p, open: false }))}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['owner-availability-blocks'] });
            qc.invalidateQueries({ queryKey: ['owner-availability-reservations'] });
          }}
        />
      )}
    </div>
  );
}

/* ─── room row with bars ──────────────────────────────────────────── */

function RoomRow({
  room,
  days,
  reservations,
  blocks,
  onCellClick,
  onDeleteBlock,
}: {
  room: HotelRoom;
  days: Date[];
  reservations: Reservation[];
  blocks: RoomBlock[];
  onCellClick: (date: Date) => void;
  onDeleteBlock: (id: string) => void;
}) {
  const monthFirst = days[0];
  const monthLast = days[days.length - 1];
  const daysInMonth = days.length;

  const reservationBars = reservations
    .filter((r) => {
      const rId = typeof r.roomId === 'object' ? (r.roomId as { _id?: string })?._id : r.roomId;
      return rId === room._id;
    })
    .map((r) => barFromRange(new Date(r.startAt), new Date(r.endAt), monthFirst, monthLast, daysInMonth));

  const blockBars = blocks
    .filter((b) => b.scope === 'venue' || b.roomId === room._id)
    .map((b) => ({
      block: b,
      ...barFromRange(new Date(b.startsAt), new Date(b.endsAt), monthFirst, monthLast, daysInMonth),
    }));

  return (
    <div
      className="grid items-center rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.025] transition relative"
      style={{ gridTemplateColumns: `180px repeat(${daysInMonth}, minmax(28px, 1fr))` }}
    >
      {/* Room label */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-r border-white/[0.05]">
        <BedDouble className="size-4 text-neutral-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-100 truncate">{room.name ?? `Chambre ${room.roomNumber}`}</p>
          <p className="text-[10px] text-neutral-500 truncate">{room.roomType}</p>
        </div>
      </div>

      {/* Day cells */}
      {days.map((d) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        return (
          <button
            type="button"
            key={ymd(d)}
            onClick={() => onCellClick(d)}
            className={cn(
              'h-12 border-r border-white/[0.04] last:border-r-0 transition-colors',
              isWeekend ? 'bg-white/[0.01]' : 'bg-transparent',
              'hover:bg-amber-400/[0.06]'
            )}
            aria-label={`Bloquer le ${ymd(d)}`}
          />
        );
      })}

      {/* Bars overlay */}
      <div className="pointer-events-none absolute inset-0 pl-[180px] py-2 pr-2 flex flex-col justify-center gap-1">
        {reservationBars.map((bar, i) => (
          bar.visible && (
            <div
              key={`r-${i}`}
              className={cn(
                'rounded-md text-[10px] font-medium text-black px-2 py-1 truncate shadow-sm',
                'bg-amber-400/85'
              )}
              style={{ marginLeft: `${(bar.startCol / daysInMonth) * 100}%`, width: `${(bar.span / daysInMonth) * 100}%` }}
            >
              {bar.label}
            </div>
          )
        ))}
        {blockBars.map((bar, i) => (
          bar.visible && (
            <div
              key={`b-${i}`}
              className="pointer-events-auto group rounded-md text-[10px] font-medium text-red-50 px-2 py-1 bg-red-500/70 border border-red-500/40 truncate shadow-sm flex items-center justify-between gap-1"
              style={{ marginLeft: `${(bar.startCol / daysInMonth) * 100}%`, width: `${(bar.span / daysInMonth) * 100}%` }}
              title={`${REASON_LABELS[bar.block.reason]}${bar.block.note ? ' — ' + bar.block.note : ''}`}
            >
              <span className="truncate">
                <Ban className="size-3 inline -mt-0.5 mr-1" />
                {REASON_LABELS[bar.block.reason]}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Supprimer ce blocage ?')) onDeleteBlock(bar.block._id);
                }}
                className="opacity-0 group-hover:opacity-100 transition shrink-0 text-red-100 hover:text-white"
                aria-label="Supprimer le blocage"
              >
                <X className="size-3" />
              </button>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function barFromRange(start: Date, end: Date, monthFirst: Date, monthLast: Date, daysInMonth: number) {
  // Clip to month
  const clipStart = start < monthFirst ? monthFirst : start;
  // End is exclusive (checkout day); subtract one day for visible span
  const visualEnd = new Date(end.getTime() - 86_400_000);
  const clipEnd = visualEnd > monthLast ? monthLast : visualEnd;
  if (clipEnd < monthFirst || clipStart > monthLast) return { visible: false as const, startCol: 0, span: 0, label: '' };
  const startCol = dayDiff(monthFirst, clipStart);
  const span = Math.max(1, dayDiff(clipStart, clipEnd) + 1);
  const label =
    clipStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' → ' +
    clipEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return { visible: true as const, startCol, span, label };
}

function LegendDot({ color, label, hollow }: { color: string; label: string; hollow?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-block size-3 rounded', color, hollow && 'border border-white/15')} />
      {label}
    </span>
  );
}

/* ─── drawer (Block / Manual reservation) ─────────────────────────── */

function ActionDrawer({
  venueId,
  venueName,
  rooms,
  roomId: initialRoomId,
  initialDate,
  initialMode,
  onClose,
  onSaved,
}: {
  venueId: string;
  venueName?: string;
  rooms: HotelRoom[];
  roomId: string;
  initialDate: Date;
  initialMode: 'block' | 'reservation';
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'block' | 'reservation'>(initialMode);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [startsAt, setStartsAt] = useState(ymd(initialDate));
  const [endsAt, setEndsAt] = useState(ymd(new Date(initialDate.getTime() + 86_400_000)));

  // Block fields
  const [reason, setReason] = useState<RoomBlockReason>('maintenance');
  const [note, setNote] = useState('');
  const [scope, setScope] = useState<'room' | 'venue'>('room');
  const [autoReopen, setAutoReopen] = useState(true);

  // Manual reservation fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [price, setPrice] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [source, setSource] = useState<ManualReservationPayload['source']>('phone');
  const [notes, setNotes] = useState('');

  const blockMut = useMutation({
    mutationFn: () =>
      createBlock(venueId, {
        roomId: scope === 'room' ? roomId : undefined,
        scope,
        startsAt: new Date(startsAt + 'T00:00:00').toISOString(),
        endsAt: new Date(endsAt + 'T00:00:00').toISOString(),
        reason,
        note: note || undefined,
        autoReopen,
      }),
    onSuccess: () => {
      toast.success('Blocage créé');
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const reservationMut = useMutation({
    mutationFn: () =>
      createManualReservation(venueId, {
        roomId,
        checkIn: new Date(startsAt + 'T00:00:00').toISOString(),
        checkOut: new Date(endsAt + 'T00:00:00').toISOString(),
        adults,
        children,
        firstName,
        lastName,
        phone,
        email: email || undefined,
        price: price ? Number(price) : undefined,
        depositAmount: depositAmount ? Number(depositAmount) : 0,
        source,
        notes: notes || undefined,
      }),
    onSuccess: (data) => {
      toast.success(`Réservation créée — ${data.reservationCode ?? ''}`);
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec'),
  });

  const submitting = blockMut.isPending || reservationMut.isPending;
  const reservationValid = roomId && firstName.trim() && lastName.trim() && phone.replace(/\s/g, '').length >= 8;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Fermer"
        className="flex-1 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="w-full max-w-md h-full overflow-y-auto bg-[#0B0B0B] border-l border-white/[0.07]">
        <header className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur border-b border-white/[0.06] p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">
              {venueName ?? 'Hôtel'}
            </p>
            <h2 className="font-serif text-lg font-bold text-white">
              {mode === 'block' ? 'Bloquer la disponibilité' : 'Réservation manuelle'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 grid place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Mode tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <ModeTab active={mode === 'block'} icon={Ban} label="Blocage" onClick={() => setMode('block')} />
            <ModeTab active={mode === 'reservation'} icon={UserPlus} label="Réservation" onClick={() => setMode('reservation')} />
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Common: room + dates */}
          {mode === 'reservation' ? (
            <DrawerField label="Chambre" required>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className={drawerInputCls}
              >
                {rooms.map((r) => (
                  <option key={r._id} value={r._id} className="bg-[#0C0C0C]">
                    {r.name ?? `Chambre ${r.roomNumber}`} · {r.roomType}
                  </option>
                ))}
              </select>
            </DrawerField>
          ) : (
            <>
              <DrawerField label="Portée">
                <div className="grid grid-cols-2 gap-2">
                  <RadioCard active={scope === 'room'} onClick={() => setScope('room')} label="Une chambre" />
                  <RadioCard active={scope === 'venue'} onClick={() => setScope('venue')} label="Tout l'hôtel" />
                </div>
              </DrawerField>
              {scope === 'room' && (
                <DrawerField label="Chambre" required>
                  <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={drawerInputCls}>
                    {rooms.map((r) => (
                      <option key={r._id} value={r._id} className="bg-[#0C0C0C]">
                        {r.name ?? `Chambre ${r.roomNumber}`}
                      </option>
                    ))}
                  </select>
                </DrawerField>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <DrawerField label={mode === 'block' ? 'Du' : 'Arrivée'} required>
              <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={drawerInputCls} />
            </DrawerField>
            <DrawerField label={mode === 'block' ? 'Au' : 'Départ'} required>
              <input type="date" value={endsAt} min={startsAt} onChange={(e) => setEndsAt(e.target.value)} className={drawerInputCls} />
            </DrawerField>
          </div>

          {mode === 'block' ? (
            <>
              <DrawerField label="Motif" required>
                <select value={reason} onChange={(e) => setReason(e.target.value as RoomBlockReason)} className={drawerInputCls}>
                  {(Object.entries(REASON_LABELS) as [RoomBlockReason, string][]).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#0C0C0C]">{v}</option>
                  ))}
                </select>
              </DrawerField>
              <DrawerField label="Note interne (facultatif)">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={cn(drawerInputCls, 'resize-y min-h-[72px]')}
                  placeholder="Ex. réparation climatisation"
                />
              </DrawerField>
              <DrawerCheckbox
                checked={autoReopen}
                onChange={setAutoReopen}
                label="Réouvrir automatiquement après la fin"
                description="La chambre redevient réservable une fois la plage écoulée."
              />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <DrawerField label="Prénom client" required>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={drawerInputCls} placeholder="Mohamed" />
                </DrawerField>
                <DrawerField label="Nom client" required>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={drawerInputCls} placeholder="Ben Ali" />
                </DrawerField>
                <DrawerField label="Téléphone" required>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={drawerInputCls} placeholder="+216 ..." />
                </DrawerField>
                <DrawerField label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={drawerInputCls} />
                </DrawerField>
                <DrawerField label="Adultes">
                  <input type="number" min={1} max={10} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))} className={drawerInputCls} />
                </DrawerField>
                <DrawerField label="Enfants">
                  <input type="number" min={0} max={6} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))} className={drawerInputCls} />
                </DrawerField>
                <DrawerField label="Prix total (DT)">
                  <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={drawerInputCls} placeholder="Auto-calculé" />
                </DrawerField>
                <DrawerField label="Acompte (DT)">
                  <input type="number" min={0} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className={drawerInputCls} placeholder="0" />
                </DrawerField>
              </div>
              <DrawerField label="Source">
                <select value={source} onChange={(e) => setSource(e.target.value as ManualReservationPayload['source'])} className={drawerInputCls}>
                  <option value="phone" className="bg-[#0C0C0C]">Téléphone</option>
                  <option value="walk_in" className="bg-[#0C0C0C]">Walk-in</option>
                  <option value="whatsapp" className="bg-[#0C0C0C]">WhatsApp</option>
                  <option value="agency" className="bg-[#0C0C0C]">Agence</option>
                  <option value="other" className="bg-[#0C0C0C]">Autre</option>
                </select>
              </DrawerField>
              <DrawerField label="Notes internes (facultatif)">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cn(drawerInputCls, 'resize-y')} />
              </DrawerField>
            </>
          )}
        </div>

        <footer className="sticky bottom-0 bg-[#0B0B0B]/95 backdrop-blur border-t border-white/[0.06] p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/[0.08] text-sm font-medium text-neutral-400 hover:text-white hover:border-white/20 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={submitting || (mode === 'reservation' && !reservationValid)}
            onClick={() => (mode === 'block' ? blockMut.mutate() : reservationMut.mutate())}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-amber-400/25"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {mode === 'block' ? 'Créer le blocage' : 'Créer la réservation'}
          </button>
        </footer>
      </aside>
    </div>
  );
}

/* ─── drawer atoms ────────────────────────────────────────────────── */

const drawerInputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all';

function DrawerField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-400">
        {label}
        {required && <span className="ml-1 text-amber-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function ModeTab({
  active, icon: Icon, label, onClick,
}: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all',
        active ? 'bg-amber-400 text-black shadow' : 'text-neutral-400 hover:text-white'
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function RadioCard({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-2 text-xs font-medium transition',
        active
          ? 'border-amber-400/50 bg-amber-400/[0.07] text-amber-300'
          : 'border-white/[0.08] bg-white/[0.02] text-neutral-400 hover:border-white/20'
      )}
    >
      {label}
    </button>
  );
}

function DrawerCheckbox({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <span
        className={cn(
          'mt-0.5 inline-flex size-5 items-center justify-center rounded-md border transition',
          checked ? 'border-amber-400 bg-amber-400' : 'border-white/20 bg-white/[0.02]'
        )}
      >
        {checked && <span className="text-black text-[10px] font-bold">✓</span>}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex-1">
        <span className="block text-sm text-neutral-200">{label}</span>
        {description && <span className="block text-[11px] text-neutral-600 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}
