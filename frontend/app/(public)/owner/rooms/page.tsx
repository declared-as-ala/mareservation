'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, Plus, Edit2, Trash2, Crown, Users, Square,
  Loader2, Building2, AlertCircle, Image as ImageIcon, ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchOwnerVenues } from '@/lib/api/owner';
import {
  fetchOwnerRooms,
  createOwnerRoom,
  updateOwnerRoom,
  deleteOwnerRoom,
} from '@/lib/api/owner-rooms';
import type { AdminHotelRoom } from '@/lib/api/admin';
import type { Venue } from '@/lib/api/types';
import { RoomEditorModal } from '@/components/admin/hotel/RoomEditorModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ROOM_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard', SUPERIOR: 'Supérieure', DELUXE: 'Deluxe',
  SUITE: 'Suite', JUNIOR_SUITE: 'Junior Suite', PRESIDENTIAL: 'Présidentielle',
  VILLA: 'Villa', APARTMENT: 'Appartement', BUNGALOW: 'Bungalow', PENTHOUSE: 'Penthouse',
};

function RoomCard({ room, onEdit, onDelete }: { room: AdminHotelRoom; onEdit: () => void; onDelete: () => void }) {
  const typeLabel = ROOM_TYPE_LABELS[room.roomType] ?? room.roomType;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-all"
    >
      <div className="relative h-36 bg-zinc-800 overflow-hidden">
        {room.coverImage ? (
          <Image src={room.coverImage} alt={room.name ?? typeLabel} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="flex h-full items-center justify-center"><BedDouble className="size-10 text-zinc-600" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
            room.isVip
              ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
              : 'bg-zinc-900/80 border-zinc-700 text-zinc-300'
          )}>
            {room.isVip && <Crown className="inline size-2.5 mr-1" />}{typeLabel}
          </span>
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          {(room.gallery?.length ?? 0) > 0 && (
            <span className="rounded-full bg-black/70 border border-white/10 text-white px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
              <ImageIcon className="size-2.5" />{room.gallery!.length}
            </span>
          )}
          {(room.panoramicImages?.length ?? 0) > 0 && (
            <span className="rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
              <ScanLine className="size-2.5" />360°
            </span>
          )}
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="rounded-lg bg-black/80 border border-white/10 px-2 py-0.5 text-xs font-bold text-amber-300">
            {room.pricePerNight} DT/nuit
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3 flex-1">
        <div>
          <p className="text-sm font-semibold text-white leading-snug truncate">
            {room.name || `Chambre ${room.roomNumber}`}
          </p>
          <p className="text-xs text-zinc-500">N° {room.roomNumber}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {room.capacityAdults && <span className="flex items-center gap-1"><Users className="size-3" />{room.capacityAdults} ad.</span>}
          {room.surface && <span className="flex items-center gap-1"><Square className="size-3" />{room.surface} m²</span>}
          {room.bedType && <span className="flex items-center gap-1"><BedDouble className="size-3" />{room.bedType}</span>}
        </div>
        <div className="flex gap-2 mt-auto pt-2 border-t border-zinc-800">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-zinc-700 rounded-lg" onClick={onEdit}>
            <Edit2 className="size-3 mr-1" /> Modifier
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 border-zinc-700 text-red-500/70 hover:text-red-400 hover:border-red-500/30 rounded-lg" onClick={onDelete} aria-label="Supprimer">
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function OwnerRoomsPage() {
  const queryClient = useQueryClient();

  const { data: venues = [], isLoading: loadingVenues } = useQuery({
    queryKey: ['owner-venues'],
    queryFn: fetchOwnerVenues,
  });

  const hotels = useMemo(
    () => (venues as Venue[]).filter((v) => v.type === 'HOTEL'),
    [venues],
  );
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');

  useEffect(() => {
    if (!selectedHotelId && hotels.length > 0) setSelectedHotelId(hotels[0]._id);
  }, [hotels, selectedHotelId]);

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['owner-rooms', selectedHotelId],
    queryFn: () => fetchOwnerRooms(selectedHotelId),
    enabled: !!selectedHotelId,
  });

  const [editing, setEditing] = useState<AdminHotelRoom | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState<AdminHotelRoom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteOwnerRoom(deleting._id);
      toast.success(`${deleting.name ?? `Chambre ${deleting.roomNumber}`} supprimée.`);
      queryClient.invalidateQueries({ queryKey: ['owner-rooms', selectedHotelId] });
      setDeleting(null);
    } catch (err) {
      toast.error('Échec', { description: err instanceof Error ? err.message : 'Réessayez.' });
    } finally {
      setIsDeleting(false);
    }
  }

  const sorted = [...(rooms as AdminHotelRoom[])].sort((a, b) => a.pricePerNight - b.pricePerNight);
  const stats = {
    total: sorted.length,
    available: sorted.filter((r) => r.status === 'available').length,
    reserved: sorted.filter((r) => r.status === 'reserved').length,
    vip: sorted.filter((r) => r.isVip).length,
  };

  if (loadingVenues) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="size-7 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="size-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Building2 className="size-7 text-zinc-600" />
        </div>
        <p className="font-medium text-zinc-200">Aucun hôtel à gérer</p>
        <p className="text-sm text-zinc-500 max-w-md">
          Vous ne possédez actuellement aucun établissement de type Hôtel. Contactez un administrateur pour qu&apos;un hôtel vous soit attribué.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Page header */}
      <div className="border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <BedDouble className="size-6 text-amber-400" />
                Chambres & Suites
              </h1>
              <p className="text-sm text-zinc-400 mt-1.5">
                Gérez les chambres, suites, photos et expériences 360° de vos établissements.
              </p>
            </div>
            <Button
              onClick={() => setShowNew(true)}
              disabled={!selectedHotelId}
              className="bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-xl"
            >
              <Plus className="size-4 mr-1.5" /> Nouvelle chambre
            </Button>
          </div>

          {/* Hotel picker */}
          {hotels.length > 1 && (
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {hotels.map((h) => (
                <button
                  key={h._id}
                  type="button"
                  onClick={() => setSelectedHotelId(h._id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all',
                    selectedHotelId === h._id
                      ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  )}
                >
                  <Building2 className="size-3.5" />
                  {h.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-zinc-100', bg: 'bg-zinc-900' },
            { label: 'Disponibles', value: stats.available, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06]' },
            { label: 'Réservées', value: stats.reserved, color: 'text-amber-400', bg: 'bg-amber-500/[0.06]' },
            { label: 'VIP', value: stats.vip, color: 'text-amber-300', bg: 'bg-amber-400/[0.06]' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn('rounded-2xl border border-zinc-800 p-4', bg)}>
              <p className={cn('text-3xl font-bold tabular-nums', color)}>{value}</p>
              <p className="text-xs text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Grid */}
        {loadingRooms ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-zinc-800">
            <BedDouble className="size-10 text-zinc-600 mb-3" />
            <p className="text-base font-semibold text-zinc-300 mb-1">Aucune chambre</p>
            <p className="text-sm text-zinc-500 mb-4">Ajoutez les chambres et suites de cet hôtel.</p>
            <Button onClick={() => setShowNew(true)} className="bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-xl">
              <Plus className="size-4 mr-2" /> Ajouter la première chambre
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sorted.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  onEdit={() => setEditing(room)}
                  onDelete={() => setDeleting(room)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Editor (new) */}
      <AnimatePresence>
        {showNew && selectedHotelId && (
          <RoomEditorModal
            hotelId={selectedHotelId}
            room={null}
            onClose={() => setShowNew(false)}
            onSave={async (payload) => {
              const created = await createOwnerRoom(selectedHotelId, payload);
              queryClient.setQueryData<AdminHotelRoom[]>(
                ['owner-rooms', selectedHotelId],
                (current = []) => current.some((room) => room._id === created._id) ? current : [...current, created],
              );
              void queryClient.invalidateQueries({ queryKey: ['owner-rooms', selectedHotelId] })
                .catch((error) => console.error('Owner rooms refresh failed:', error));
              toast.success('Chambre créée.');
            }}
          />
        )}
      </AnimatePresence>

      {/* Editor (edit) */}
      <AnimatePresence>
        {editing && (
          <RoomEditorModal
            hotelId={selectedHotelId}
            room={editing}
            onClose={() => setEditing(null)}
            onSave={async (payload) => {
              const updated = await updateOwnerRoom(editing._id, payload);
              queryClient.setQueryData<AdminHotelRoom[]>(
                ['owner-rooms', selectedHotelId],
                (current = []) => current.map((room) => room._id === updated._id ? updated : room),
              );
              void queryClient.invalidateQueries({ queryKey: ['owner-rooms', selectedHotelId] })
                .catch((error) => console.error('Owner rooms refresh failed:', error));
              toast.success('Chambre mise à jour.');
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}>
        <AlertDialogContent className="border-zinc-800 bg-zinc-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100 flex items-center gap-2">
              <AlertCircle className="size-5 text-red-400" />
              Supprimer cette chambre ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <span className="font-semibold text-zinc-200">
                {deleting?.name ?? `Chambre ${deleting?.roomNumber ?? ''}`}
              </span>{' '}
              sera supprimée définitivement de votre hôtel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Suppression…</span>
              ) : (
                <span className="flex items-center gap-2"><Trash2 className="size-4" /> Supprimer</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
