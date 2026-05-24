'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Calendar, Clock, Sparkles, AlertCircle, List, ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchVenueScenes, fetchVenueTablePlacements, type PublicTablePlacement } from '@/lib/api/venues';
import { fetchScenes } from '@/lib/api/scenes';
import type { Venue } from '@/lib/api/types';
import { StepReservationModal } from '@/components/reservation/StepReservationModal';
import { TablePickerSheet } from '@/components/reservation/TablePickerSheet';
import { toast } from 'sonner';

const PanoramaEngine = dynamic(() => import('@/components/immersive/PanoramaEngine'), { ssr: false });

interface ImmersiveTableReservationProps {
  venue: Venue;
  onClassicReserve?: () => void;
  initialDate?: string;
  initialTime?: string;
}

export default function ImmersiveTableReservation({
  venue,
  onClassicReserve,
  initialDate,
  initialTime,
}: ImmersiveTableReservationProps) {
  const [selectedDate, setSelectedDate] = useState(() => initialDate ?? new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState(() => initialTime ?? '19:00');
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [selectedPlacement, setSelectedPlacement] = useState<PublicTablePlacement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  const startAtIso = useMemo(() => {
    try {
      return new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }, [selectedDate, selectedTime]);

  const endAtIso = useMemo(() => {
    try {
      return new Date(new Date(startAtIso).getTime() + 2 * 60 * 60 * 1000).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }, [startAtIso]);

  // Fetch scenes & tour hotspots
  const { data: tourData, isLoading: tourLoading } = useQuery({
    queryKey: ['venue-tour-immersive', venue._id],
    queryFn: () => fetchVenueScenes(venue._id),
    enabled: !!venue._id,
  });
  const tourScenes = tourData?.scenes ?? [];
  const tourHotspots = tourData?.hotspots ?? [];

  const { data: adminScenes = [], isLoading: adminScenesLoading } = useQuery({
    queryKey: ['venue-scenes-immersive', venue._id],
    queryFn: () => fetchScenes(venue._id),
    enabled: !!venue._id,
  });

  // Fetch placements based on date and time (live availability)
  const { data: placements = [], isLoading: placementsLoading, refetch: refetchPlacements } = useQuery({
    queryKey: ['venue-placements-immersive', venue._id, startAtIso],
    queryFn: () => fetchVenueTablePlacements(venue._id, { startAt: startAtIso, endAt: endAtIso }),
    enabled: !!venue._id,
    staleTime: 15_000,
  });

  // Build unified scene list
  const immersiveSceneList = useMemo<
    { id: string; name: string; image: string; description?: string }[]
  >(() => {
    if (tourScenes.length > 0) {
      return tourScenes.map((s) => ({ id: s._id, name: s.name, image: s.image, description: s.description }));
    }
    if (adminScenes.length > 0 && adminScenes[0]?.image) {
      return adminScenes.map((s) => ({ id: s._id, name: s.name, image: s.image ?? '' }));
    }
    if (venue.immersiveFile) {
      return [{ id: '__single__', name: venue.name ?? 'Vue 360°', image: venue.immersiveFile }];
    }
    return [];
  }, [tourScenes, adminScenes, venue]);

  const currentScene = immersiveSceneList[activeSceneIdx] ?? immersiveSceneList[0];
  const activeSceneId = currentScene?.id ?? null;

  // Sync index if scenes change
  useEffect(() => {
    if (activeSceneIdx >= immersiveSceneList.length && immersiveSceneList.length > 0) {
      setActiveSceneIdx(0);
    }
  }, [immersiveSceneList, activeSceneIdx]);

  // Filter placements to active scene
  const scenePlacements = useMemo(() => {
    if (immersiveSceneList.length === 0 || !activeSceneId) return placements;
    return placements.filter((p) => p.sceneId === activeSceneId);
  }, [placements, immersiveSceneList, activeSceneId]);

  // Map to table markers for PanoramaEngine
  const panoramaMarkers = useMemo(() => {
    return scenePlacements
      .filter((p) => p.positionType === 'yaw_pitch' && p.yaw != null && p.pitch != null)
      .map((p) => ({
        placement: {
          _id: p._id,
          venueId: p.venueId,
          tableId: p.tableId,
          sceneId: p.sceneId,
          positionType: p.positionType as 'yaw_pitch',
          yaw: p.yaw,
          pitch: p.pitch,
          createdAt: '',
          updatedAt: '',
        },
        table: p.table ? {
          _id: p.table._id,
          venueId: p.venueId,
          tableNumber: p.table.tableNumber,
          name: p.table.name,
          capacity: p.table.capacity,
          locationLabel: p.table.locationLabel || '',
          price: p.table.price,
          minimumSpend: p.table.minimumSpend,
          defaultStatus: p.table.status, // set defaultStatus to live status
          isVip: p.table.isVip,
          isActive: true,
        } : undefined,
      }));
  }, [scenePlacements]);

  // Hotspots
  const activeNavHotspots = useMemo(() => {
    return tourHotspots.filter((h) => currentScene && h.virtualTourId === currentScene.id);
  }, [tourHotspots, currentScene]);

  const psvNavHotspots = useMemo(() => {
    return activeNavHotspots
      .map((h) => {
        const target = immersiveSceneList.find((s) => s.id === h.targetId);
        if (!target) return null;
        return {
          id: h._id,
          yaw: (h.xPercent / 100 - 0.5) * 2 * Math.PI,
          pitch: -(h.yPercent / 100 - 0.5) * Math.PI,
          label: target.name,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null);
  }, [activeNavHotspots, immersiveSceneList]);

  // Event handlers
  const handleMarkerClick = (placementId: string) => {
    const p = placements.find((pl) => pl._id === placementId);
    if (p) {
      if (p.table.status === 'available') {
        setSelectedPlacement(p);
      } else {
        const statusLabel = p.table.status === 'blocked' ? 'bloquée / en maintenance' : 'déjà réservée';
        toast.error(`La table ${p.table.name || p.table.tableNumber} est ${statusLabel} pour ce créneau.`);
      }
    }
  };

  const handleNavHotspotClick = (hotspotId: string) => {
    const hotspot = activeNavHotspots.find((h) => h._id === hotspotId);
    if (!hotspot) return;
    const targetIdx = immersiveSceneList.findIndex((s) => s.id === hotspot.targetId);
    if (targetIdx !== -1) {
      setActiveSceneIdx(targetIdx);
    }
  };

  const handleSceneChange = (sceneId: string) => {
    const targetIdx = immersiveSceneList.findIndex((s) => s.id === sceneId);
    if (targetIdx !== -1) {
      setActiveSceneIdx(targetIdx);
    }
  };

  const totalTables = scenePlacements.length;
  const availableTables = scenePlacements.filter((p) => p.table?.status === 'available').length;

  const isDataLoading = tourLoading || adminScenesLoading;

  if (isDataLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center bg-zinc-950/20 rounded-2xl border border-white/[0.05]">
        <div className="size-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin mb-3" />
        <span className="text-sm text-neutral-400">Chargement de la visite immersive...</span>
      </div>
    );
  }

  if (immersiveSceneList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-zinc-950/40 p-12 text-center">
        <AlertCircle className="size-10 text-neutral-600 mb-3" />
        <h3 className="text-base font-bold text-neutral-300">Vue 360° non disponible</h3>
        <p className="mt-1 text-sm text-neutral-500 max-w-sm">
          Ce lieu n&apos;a pas encore de visite immersive 360°. Revenez bientôt ou contactez l&apos;établissement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── DATE/TIME BAR ABOVE VIEWER ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.02] pl-9 pr-3 text-xs font-semibold text-neutral-200 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
            />
          </div>

          {/* Time Picker */}
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400" />
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.02] pl-9 pr-3 text-xs font-semibold text-neutral-200 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/20 transition-all"
            />
          </div>

          {/* Status counters */}
          <div className="hidden items-center gap-2 rounded-xl bg-white/[0.02] px-3 py-2 text-[11px] font-medium border border-white/[0.04] md:flex">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {availableTables} dispo{availableTables !== 1 ? 's' : ''}
            </span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-400">{totalTables} table{totalTables !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* List view fallback */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-xs font-semibold text-neutral-300 transition-all hover:border-amber-400/30 hover:bg-amber-400/[0.03] hover:text-amber-300"
          >
            <List className="size-3.5" />
            Vue liste
          </button>

          {/* Fullscreen toggle (desktop) */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="hidden sm:flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-xs font-semibold text-neutral-300 transition-all hover:border-amber-400/30 hover:bg-amber-400/[0.03] hover:text-amber-300"
          >
            <Maximize2 className="size-3.5" />
            Plein écran
          </button>
        </div>
      </div>

      {/* ── 360° VIEWER WINDOW ── */}
      <div className={cn(
        "relative w-full overflow-hidden bg-zinc-950 shadow-2xl transition-all duration-300",
        isFullscreen
          ? "fixed inset-0 z-[9999] rounded-none border-0"
          : "aspect-video rounded-3xl border border-white/[0.08]"
      )}>
        {currentScene ? (
          <div className="absolute inset-0">
            <PanoramaEngine
              imageUrl={currentScene.image}
              markers={panoramaMarkers}
              selectedMarkerId={null}
              mode="navigate"
              scenes={[]}
              activeSceneId={activeSceneId}
              onSceneChange={handleSceneChange}
              navHotspots={psvNavHotspots}
              onNavHotspotClick={handleNavHotspotClick}
              onMarkerClick={handleMarkerClick}
            />

            {/* Scene Name */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg">
                <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                {immersiveSceneList.length > 1
                  ? `Scène ${activeSceneIdx + 1} / ${immersiveSceneList.length}`
                  : 'Vue 360°'}
              </span>
              {isFullscreen && currentScene.description && (
                <span className="text-[10px] text-neutral-400 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md self-start border border-white/[0.03]">
                  {currentScene.description}
                </span>
              )}
            </div>

            {/* Legend (top-right) — hidden in fullscreen to give more space */}
            {!isFullscreen && (
              <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-3 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-3.5 py-1.5 text-[10px] font-semibold text-neutral-300 shadow-lg">
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#22c55e]" /> Dispo</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#ef4444]" /> Réservée</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#f59e0b]" /> VIP</span>
              </div>
            )}

            {/* Fullscreen: legend + close button */}
            {isFullscreen && (
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <div className="flex items-center gap-3 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm px-3.5 py-1.5 text-[10px] font-semibold text-neutral-300 shadow-lg">
                  <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#22c55e]" /> Dispo</span>
                  <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#ef4444]" /> Réservée</span>
                  <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#f59e0b]" /> VIP</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  aria-label="Quitter le plein écran"
                  className="flex size-9 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-red-500/20 hover:border-red-400/30 transition-all"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            {/* Fullscreen toggle button (bottom-right, always visible on desktop) */}
            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              className="absolute bottom-4 right-4 z-20 hidden sm:flex size-9 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            {/* Mobile fullscreen button (bottom-right, mobile only) */}
            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              className="absolute bottom-4 right-4 z-20 sm:hidden flex size-10 items-center justify-center rounded-full bg-black/70 border border-white/15 text-white transition-all active:scale-95"
            >
              {isFullscreen ? <Minimize2 className="size-4.5" /> : <Maximize2 className="size-4.5" />}
            </button>

            {/* Prev/Next arrows — desktop only (hidden on mobile, swipe is natural) */}
            {immersiveSceneList.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Scène précédente"
                  onClick={() => setActiveSceneIdx((i) => (i - 1 + immersiveSceneList.length) % immersiveSceneList.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex size-10 rounded-full bg-black/55 border border-white/10 items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all focus-visible:outline-none"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Scène suivante"
                  onClick={() => setActiveSceneIdx((i) => (i + 1) % immersiveSceneList.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex size-10 rounded-full bg-black/55 border border-white/10 items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all focus-visible:outline-none"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}

            {/* Mobile: scene dots strip at bottom (when multiple scenes) */}
            {isFullscreen && immersiveSceneList.length > 1 && (
              <div className="absolute bottom-14 sm:hidden inset-x-0 z-20 flex justify-center gap-2 px-4">
                {immersiveSceneList.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSceneIdx(i)}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      i === activeSceneIdx ? 'w-6 h-2 bg-amber-400' : 'size-2 bg-white/25'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Aucun média disponible
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 mt-2">
        <Sparkles className="size-3.5 text-amber-500" />
        Faites glisser la vue 360° pour explorer la pièce, puis cliquez sur une table verte ou jaune pour la réserver.
      </div>

      {/* ── STEP RESERVATION MODAL ── */}
      {selectedPlacement && (
        <StepReservationModal
          open={!!selectedPlacement}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedPlacement(null);
              // Refetch table placements to reflect any new reservations/holds
              refetchPlacements();
            }
          }}
          placement={selectedPlacement}
          venue={venue}
          imageUrl={venue.coverImage}
          initialStartAt={startAtIso}
          initialEndAt={endAtIso}
        />
      )}

      {/* ── TABLE PICKER SHEET LIST VIEW FALLBACK ── */}
      <TablePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        venue={venue}
        imageUrl={venue.coverImage}
        initialStartAt={startAtIso}
      />
    </div>
  );
}
