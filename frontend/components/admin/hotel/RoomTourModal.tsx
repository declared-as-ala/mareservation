'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ScanLine, Loader2, BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAdminRoomScenes, type AdminHotelRoom } from '@/lib/api/admin';
import dynamic from 'next/dynamic';

const VirtualTourBuilder = dynamic(
  () => import('./VirtualTourBuilder').then((m) => ({ default: m.VirtualTourBuilder })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-64 text-zinc-400">
      <Loader2 className="size-6 animate-spin mr-2" /> Chargement...
    </div>
  )}
);

interface RoomTourModalProps {
  venueId: string;
  room: AdminHotelRoom;
  onClose: () => void;
}

export function RoomTourModal({ venueId, room, onClose }: RoomTourModalProps) {
  const roomId = room._id;
  const roomLabel = room.name ?? `Chambre ${room.roomNumber}`;

  const { data: tourData, refetch, isLoading } = useQuery({
    queryKey: ['admin-room-tour', roomId],
    queryFn: () => fetchAdminRoomScenes(roomId),
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col bg-zinc-950"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
            <ScanLine className="size-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">
              Visite virtuelle 360°
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <BedDouble className="size-3 shrink-0" />
              <span className="truncate">{roomLabel}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-amber-400/80 font-medium">{room.roomType}</span>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg gap-1.5"
        >
          <X className="size-4" /> Fermer
        </Button>
      </div>

      {/* Builder */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-zinc-400 gap-2">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Chargement des scènes...</span>
          </div>
        ) : (
          <VirtualTourBuilder
            venueId={venueId}
            roomId={roomId}
            initialScenes={tourData?.scenes ?? []}
            initialHotspots={tourData?.hotspots ?? []}
            fallbackImages={room.panoramicImages ?? []}
            onUpdated={() => refetch()}
          />
        )}
      </div>
    </motion.div>
  );
}
