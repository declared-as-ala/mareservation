'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Ban, CalendarDays, CheckCircle2, Clock3, Loader2, LockKeyhole, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from './Modal';
import { Card, EmptyState, FormField, SectionTitle, StatusBadge, dashInput } from './primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createOwnerTableBlock, type TableBlock } from '@/lib/api/owner-table';
import { createOwnerCoworkingBlock, type CoworkingBlock } from '@/lib/api/owner-coworking';

export type BlockableUnit = {
  id: string;
  label: string;
};

export type SchedulerBlock = TableBlock | CoworkingBlock;

type DurationMode = 'hour' | 'day' | 'days';
type UiReason = 'maintenance' | 'private_event' | 'holiday' | 'other';

const REASONS: Array<{ value: UiReason; label: string }> = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'private_event', label: 'Evenement prive' },
  { value: 'holiday', label: 'Fermeture' },
  { value: 'other', label: 'Autre' },
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function localDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDateTimeInput(date: Date) {
  return `${localDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function reasonForMode(mode: 'tables', reason: UiReason): UiReason;
function reasonForMode(mode: 'units', reason: UiReason): CoworkingBlock['reason'];
function reasonForMode(mode: 'tables' | 'units', reason: UiReason): UiReason | CoworkingBlock['reason'] {
  if (mode === 'tables') return reason;
  if (reason === 'private_event') return 'private_booking';
  if (reason === 'holiday') return 'owner_hold';
  return reason === 'maintenance' || reason === 'other' ? reason : 'other';
}

export function getBlockTargetId(block: SchedulerBlock): string | null {
  if ('reservableUnitId' in block) {
    const unit = block.reservableUnitId;
    if (!unit) return null;
    return typeof unit === 'string' ? unit : unit._id;
  }
  const tableBlock = block as TableBlock;
  return tableBlock.tableId ? String(tableBlock.tableId) : null;
}

export function getBlockLabel(block: SchedulerBlock, units: BlockableUnit[], mode: 'tables' | 'units') {
  const id = getBlockTargetId(block);
  if (!id) return mode === 'tables' ? 'Toutes les tables' : 'Tout l espace';
  if ('reservableUnitId' in block && typeof block.reservableUnitId === 'object') {
    return block.reservableUnitId.label || block.reservableUnitId.code || 'Unite';
  }
  return units.find((unit) => unit.id === id)?.label ?? (mode === 'tables' ? 'Table' : 'Unite');
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWholeDay(start: Date, end: Date) {
  return start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() >= 50;
}

export function formatBlockPeriod(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const today = new Date();
  const dayLabel = isSameDay(start, today)
    ? "Aujourd'hui"
    : `Le ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  if (isSameDay(start, end)) {
    if (isWholeDay(start, end)) return `${dayLabel} toute la journee`;
    return `${dayLabel}, ${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}-${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `Du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

export function isBlockCurrent(block: SchedulerBlock, from = new Date(), to = new Date(Date.now() + 60 * 60 * 1000)) {
  return block.isActive !== false && new Date(block.startsAt) < to && new Date(block.endsAt) > from;
}

export function ActiveBlocksList({
  blocks,
  units,
  mode,
  onDelete,
  deletingId,
}: {
  blocks: SchedulerBlock[];
  units: BlockableUnit[];
  mode: 'tables' | 'units';
  onDelete: (id: string) => void;
  deletingId?: string | null;
}) {
  const visible = blocks
    .filter((block) => block.isActive !== false && new Date(block.endsAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <Card className="p-4">
      <SectionTitle
        title="Blocages actifs"
        subtitle="Tables ou places indisponibles maintenant et prochainement."
        icon={LockKeyhole}
      />
      {visible.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Aucun blocage actif"
          description="Tout est disponible sur les prochains creneaux."
        />
      ) : (
        <div className="space-y-2">
          {visible.map((block) => (
            <div
              key={block._id}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-neutral-100">{getBlockLabel(block, units, mode)}</p>
                  <StatusBadge status="suspended" label={String(block.reason).replace('_', ' ')} />
                </div>
                <p className="mt-1 text-sm text-neutral-400">{formatBlockPeriod(block.startsAt, block.endsAt)}</p>
                {block.note && <p className="mt-1 text-xs text-neutral-600">{block.note}</p>}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 rounded-xl border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10"
                disabled={deletingId === block._id}
                onClick={() => onDelete(block._id)}
              >
                {deletingId === block._id ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Trash2 className="mr-1.5 size-4" />}
                Debloquer
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function BlockScheduler({
  open,
  onClose,
  venueId,
  units,
  mode,
  onCreated,
  initialSelectedIds = [],
}: {
  open: boolean;
  onClose: () => void;
  venueId: string;
  units: BlockableUnit[];
  mode: 'tables' | 'units';
  onCreated: () => void;
  initialSelectedIds?: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [durationMode, setDurationMode] = useState<DurationMode>('day');
  const [startDateTime, setStartDateTime] = useState(() => localDateTimeInput(new Date()));
  const [dayDate, setDayDate] = useState(() => localDateInput(new Date()));
  const [rangeStart, setRangeStart] = useState(() => localDateInput(new Date()));
  const [rangeEnd, setRangeEnd] = useState(() => localDateInput(new Date()));
  const [reason, setReason] = useState<UiReason>('maintenance');
  const [note, setNote] = useState('');
  const initialSelectedKey = initialSelectedIds.join('|');

  useEffect(() => {
    if (!open) return;
    setSelectedIds(initialSelectedKey ? initialSelectedKey.split('|').filter(Boolean) : []);
    const now = new Date();
    setStartDateTime(localDateTimeInput(now));
    setDayDate(localDateInput(now));
    setRangeStart(localDateInput(now));
    setRangeEnd(localDateInput(now));
    setReason('maintenance');
    setNote('');
    setDurationMode('day');
  }, [open, initialSelectedKey]);

  const windowRange = useMemo(() => {
    if (durationMode === 'hour') {
      const start = new Date(startDateTime);
      return { startsAt: start, endsAt: new Date(start.getTime() + 60 * 60 * 1000) };
    }
    if (durationMode === 'day') {
      const date = new Date(`${dayDate}T12:00:00`);
      return { startsAt: startOfDay(date), endsAt: endOfDay(date) };
    }
    const start = new Date(`${rangeStart}T12:00:00`);
    const end = new Date(`${rangeEnd}T12:00:00`);
    return { startsAt: startOfDay(start), endsAt: endOfDay(end) };
  }, [dayDate, durationMode, rangeEnd, rangeStart, startDateTime]);
  const periodPreview = useMemo(
    () => formatBlockPeriod(windowRange.startsAt.toISOString(), windowRange.endsAt.toISOString()),
    [windowRange.endsAt, windowRange.startsAt]
  );
  const selectedUnits = units.filter((unit) => selectedIds.includes(unit.id));

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selectedIds.length) throw new Error(mode === 'tables' ? 'Choisissez au moins une table.' : 'Choisissez au moins une place.');
      if (!(windowRange.startsAt < windowRange.endsAt)) throw new Error('La periode choisie est invalide.');
      const payloads = selectedIds.map((id) => {
        if (mode === 'tables') {
          return createOwnerTableBlock(venueId, {
            tableId: id,
            startsAt: windowRange.startsAt.toISOString(),
            endsAt: windowRange.endsAt.toISOString(),
            reason: reasonForMode(mode, reason),
            note: note.trim() || undefined,
          });
        }
        return createOwnerCoworkingBlock(venueId, {
          scope: 'unit',
          reservableUnitId: id,
          startsAt: windowRange.startsAt.toISOString(),
          endsAt: windowRange.endsAt.toISOString(),
          reason: reasonForMode(mode, reason),
          note: note.trim() || undefined,
        });
      });
      await Promise.all(payloads);
    },
    onSuccess: () => {
      toast.success(selectedIds.length > 1 ? 'Blocages crees.' : 'Blocage cree.');
      onCreated();
      onClose();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erreur creation blocage.'),
  });

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!createMut.isPending) onClose();
      }}
      title={mode === 'tables' ? 'Bloquer une table' : 'Bloquer une place'}
      subtitle="Choisissez quoi bloquer, la duree, puis confirmez. La disponibilite se met a jour automatiquement."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" className="h-11 rounded-xl border-white/[0.1]" disabled={createMut.isPending} onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" className="h-11 rounded-xl" disabled={createMut.isPending || !selectedIds.length} onClick={() => createMut.mutate()}>
            {createMut.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Ban className="mr-1.5 size-4" />}
            Bloquer
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section>
          <SectionTitle
            title={mode === 'tables' ? '1. Quelle table ?' : '1. Quelle place ?'}
            subtitle="Cliquez une fois pour selectionner. Vous pouvez en choisir plusieurs."
            icon={Ban}
          />
          {units.length === 0 ? (
            <EmptyState
              icon={Ban}
              title={mode === 'tables' ? 'Aucune table disponible' : 'Aucune place disponible'}
              description={
                mode === 'tables'
                  ? 'Creez d abord vos tables dans le studio 360 ou la gestion des tables.'
                  : 'Creez d abord vos unites coworking.'
              }
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {units.map((unit) => {
                const active = selectedIds.includes(unit.id);
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => toggle(unit.id)}
                    className={cn(
                      'min-h-12 cursor-pointer rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/30',
                      active
                        ? 'border-amber-400/45 bg-amber-400/15 text-amber-200 shadow-lg shadow-amber-400/10'
                        : 'border-white/[0.08] bg-white/[0.03] text-neutral-300 hover:border-white/[0.18]'
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">{unit.label}</span>
                      {active && <CheckCircle2 className="size-4 shrink-0 text-amber-300" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="2. Combien de temps ?" subtitle="Les presets couvrent les cas les plus frequents." icon={Clock3} />
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { id: 'hour' as DurationMode, label: '1 heure', hint: 'Depuis une heure choisie' },
              { id: 'day' as DurationMode, label: 'Toute la journee', hint: '00:00 a 23:59' },
              { id: 'days' as DurationMode, label: 'Plusieurs jours', hint: 'Plage de dates' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDurationMode(item.id)}
                className={cn(
                  'min-h-20 rounded-2xl border p-3 text-left transition-all',
                  durationMode === item.id
                    ? 'border-amber-400/45 bg-amber-400/15'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.18]'
                )}
              >
                <span className="block font-bold text-neutral-100">{item.label}</span>
                <span className="mt-1 block text-xs text-neutral-500">{item.hint}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {durationMode === 'hour' && (
              <FormField label="Debut">
                <input type="datetime-local" className={dashInput} value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} />
              </FormField>
            )}
            {durationMode === 'day' && (
              <FormField label="Jour">
                <input type="date" className={dashInput} value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
              </FormField>
            )}
            {durationMode === 'days' && (
              <>
                <FormField label="Premier jour">
                  <input type="date" className={dashInput} value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                </FormField>
                <FormField label="Dernier jour">
                  <input type="date" className={dashInput} value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                </FormField>
              </>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-amber-300">Disponibilite choisie</p>
                <p className="mt-1 text-sm font-semibold text-neutral-100">{periodPreview}</p>
              </div>
              <StatusBadge
                status={selectedIds.length ? 'pending' : 'draft'}
                label={selectedIds.length ? `${selectedIds.length} selection` : 'Aucune selection'}
              />
            </div>
            {selectedUnits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedUnits.map((unit) => (
                  <span key={unit.id} className="rounded-full border border-white/[0.08] bg-black/20 px-2 py-1 text-[11px] text-neutral-300">
                    {unit.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionTitle title="3. Pourquoi ?" subtitle="Optionnel, mais utile pour l equipe." icon={CalendarDays} />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Raison">
              <select className={dashInput} value={reason} onChange={(e) => setReason(e.target.value as UiReason)}>
                {REASONS.map((item) => (
                  <option key={item.value} value={item.value} className="bg-[#0D0D0D]">
                    {item.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Note interne">
              <input className={dashInput} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. anniversaire prive, nettoyage..." />
            </FormField>
          </div>
        </section>
      </div>
    </Modal>
  );
}
