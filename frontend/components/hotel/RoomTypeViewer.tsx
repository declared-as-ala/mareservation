'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Crown,
  BedDouble,
  Users,
  Maximize2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HotelRoom, HotelTourHotspot } from '@/lib/api/types';
import { ROOM_TYPE_LABELS } from '@/lib/api/rooms';
import type { RoomTypeGroup } from './RoomTypeCard';

const PanoramaEngine = dynamic(
  () => import('@/components/immersive/PanoramaEngine'),
  { ssr: false }
);

interface SceneEntry {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  embedUrl?: string;
  room: HotelRoom;
  hotspots: HotelTourHotspot[];
}

interface RoomTypeViewerProps {
  group: RoomTypeGroup | null;
  open: boolean;
  onClose: () => void;
}

function isPanoramaImage(url?: string): url is string {
  if (!url) return false;
  const value = url.toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].some((extension) => value.includes(extension));
}

export function RoomTypeViewer({ group, open, onClose }: RoomTypeViewerProps) {
  const typeLabel = ROOM_TYPE_LABELS[group?.roomType?.toUpperCase?.() ?? ''] ?? group?.roomType ?? 'Chambre';

  const scenes: SceneEntry[] = useMemo(() => {
    if (!group) return [];
    return group.rooms.flatMap((room) => {
      const roomLabel = `Ch. ${room.roomNumber}`;
      if (room.tourScenes?.length) {
        return room.tourScenes.map((scene) => ({
          _id: scene._id,
          name: `${typeLabel} ${roomLabel} — ${scene.name}`,
          description: scene.description,
          image: scene.image,
          room,
          hotspots: room.tourHotspots ?? [],
        }));
      }

      const legacyImages = [...(room.panoramicImages ?? [])];
      if (isPanoramaImage(room.virtualTourUrl) && !legacyImages.includes(room.virtualTourUrl)) {
        legacyImages.push(room.virtualTourUrl);
      }
      const entries: SceneEntry[] = legacyImages.map((image, index) => ({
        _id: `${room._id}-panorama-${index}`,
        name: legacyImages.length > 1 ? `${typeLabel} ${roomLabel} — vue ${index + 1}` : `${typeLabel} ${roomLabel}`,
        description: undefined,
        image,
        room,
        hotspots: [] as HotelTourHotspot[],
      }));
      if (room.virtualTourUrl && !isPanoramaImage(room.virtualTourUrl)) {
        entries.push({
          _id: `${room._id}-embedded-tour`,
          name: `${typeLabel} ${roomLabel}`,
          embedUrl: room.virtualTourUrl,
          room,
          hotspots: [],
        });
      }
      return entries;
    });
  }, [group, typeLabel]);

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (open && scenes.length > 0 && !activeId) {
      setActiveId(scenes[0]._id);
    }
    if (!open) setActiveId(null);
  }, [open, scenes, activeId]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeId, scenes]);

  if (!group) return null;

  function navigate(delta: number) {
    if (!activeId || scenes.length < 2) return;
    const i = scenes.findIndex((s) => s._id === activeId);
    const next = (i + delta + scenes.length) % scenes.length;
    setActiveId(scenes[next]._id);
  }

  const activeScene = scenes.find((s) => s._id === activeId) ?? scenes[0];
  const activeImage = activeScene?.image;
  const activeRoom = activeScene?.room;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Visite 360° — ${typeLabel}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black"
        >
          {/* ── Top bar ── */}
          <div className="relative z-20 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-black/85 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm',
                  group.isVip
                    ? 'border-amber-400/45 bg-amber-400/[0.1] text-amber-300'
                    : 'border-white/15 bg-white/[0.05] text-white/85'
                )}
              >
                {group.isVip && <Crown className="size-3" />}
                {typeLabel}
              </span>
              <div className="hidden min-w-0 flex-col sm:flex">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Visite 360°
                </span>
                <span className="truncate text-sm font-semibold text-white">
                  {typeLabel} · Ch. {activeRoom?.roomNumber}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la visite"
              className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white/85 transition-all hover:border-white/30 hover:bg-white/[0.12]"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* ── Body — panorama + side info ── */}
          <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Panorama */}
            <div className="relative flex-1 overflow-hidden bg-black">
              {activeImage ? (
                <PanoramaEngine
                  imageUrl={activeImage}
                  markers={[]}
                  mode="navigate"
                  scenes={scenes
                    .filter((scene): scene is SceneEntry & { image: string } => !!scene.image)
                    .map(({ _id, name, image }) => ({ _id, name, image }))}
                  activeSceneId={activeId}
                  onSceneChange={(id) => setActiveId(id)}
                />
              ) : activeScene?.embedUrl ? (
                <iframe
                  src={activeScene.embedUrl}
                  title={`Visite 360° - ${activeScene.name}`}
                  className="h-full w-full border-0"
                  allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-600">
                  <Video className="size-14" />
                </div>
              )}

              {/* Scene navigation arrows (mobile-friendly large hitboxes) */}
              {scenes.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Chambre précédente"
                    onClick={() => navigate(-1)}
                    className="absolute left-3 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur-md transition-all hover:scale-105 hover:border-amber-400/40 hover:bg-amber-400/15 active:scale-95"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Chambre suivante"
                    onClick={() => navigate(1)}
                    className="absolute right-3 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur-md transition-all hover:scale-105 hover:border-amber-400/40 hover:bg-amber-400/15 active:scale-95"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}

              {/* Scene counter chip */}
              {scenes.length > 1 && (
                <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-md">
                  {scenes.findIndex((s) => s._id === activeId) + 1} / {scenes.length}
                </div>
              )}
            </div>

            {/* ── Side info (desktop) / bottom sheet (mobile) ── */}
            <aside className="relative shrink-0 border-t border-white/[0.06] bg-[#0B0B0B] md:w-[340px] md:border-l md:border-t-0">
              <div className="flex h-full flex-col">
                {/* Room info */}
                {activeRoom && (
                  <div className="space-y-3 p-4 sm:p-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/85">
                        Vous visitez
                      </p>
                      <h3 className="mt-1 font-serif text-lg font-bold leading-tight text-white">
                        {typeLabel}
                      </h3>
                      <p className="mt-0.5 text-[12px] text-neutral-500">
                        Ch. {activeRoom.roomNumber} · Étage {activeRoom.floor ?? '—'}
                      </p>
                    </div>

                    {/* Quick stats */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-neutral-400">
                      {activeRoom.bedType && (
                        <span className="flex items-center gap-1.5">
                          <BedDouble className="size-3.5 text-neutral-600" />
                          {activeRoom.bedType}
                        </span>
                      )}
                      {activeRoom.capacity > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-neutral-600" />
                          {activeRoom.capacityAdults ?? activeRoom.capacity} pers.
                        </span>
                      )}
                      {activeRoom.surface && (
                        <span className="flex items-center gap-1.5">
                          <Maximize2 className="size-3.5 text-neutral-600" />
                          {activeRoom.surface} m²
                        </span>
                      )}
                      {activeRoom.hasBalcony && (
                        <span className="flex items-center gap-1.5 text-amber-400/85">
                          <Eye className="size-3.5" />
                          Balcon
                        </span>
                      )}
                    </div>

                    {/* Note: type-level reservation */}
                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-[11px] leading-relaxed text-amber-200/80">
                      <strong className="font-bold">Vous réservez une {typeLabel.toLowerCase()}.</strong>
                      {' '}
                      Une chambre disponible vous sera attribuée à votre arrivée.
                    </div>
                  </div>
                )}

                {/* Thumbnail rail */}
                {scenes.length > 1 && (
                  <div className="border-t border-white/[0.06] p-3 sm:p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Autres vues 360 de ce type ({scenes.length})
                    </p>
                    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      {scenes.map((s) => (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => setActiveId(s._id)}
                          aria-label={`Voir ${s.name}`}
                          className={cn(
                            'group relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl border transition-all',
                            s._id === activeId
                              ? 'border-amber-400/65 ring-2 ring-amber-400/40'
                              : 'border-white/[0.08] hover:border-white/25'
                          )}
                        >
                          {s.image ? (
                            <Image
                              src={s.image}
                              alt={s.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-white/[0.04]">
                              <Video className="size-6 text-amber-400/70" />
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                          <div className="pointer-events-none absolute inset-x-1 bottom-1 truncate text-[9px] font-semibold text-white">
                            {s.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </aside>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
