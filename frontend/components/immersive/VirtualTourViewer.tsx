'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Navigation,
  Maximize2,
  X,
  ImageOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VirtualScene, VirtualHotspot } from '@/lib/api/venues';

interface VirtualTourViewerProps {
  scenes: VirtualScene[];
  hotspots: VirtualHotspot[];
  initialSceneId?: string;
  className?: string;
}

// ── Hotspot dot overlaid on the panorama ────────────────────────────────────

function HotspotDot({
  hotspot,
  target,
  onNavigate,
  disabled,
}: {
  hotspot: VirtualHotspot;
  target: VirtualScene;
  onNavigate: () => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      aria-label={`Aller vers ${target.name}`}
      disabled={disabled}
      onClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 focus:outline-none disabled:pointer-events-none"
      style={{ left: `${hotspot.xPercent}%`, top: `${hotspot.yPercent}%` }}
    >
      {/* Outer pulsing ring */}
      <span
        className={cn(
          'absolute inset-0 rounded-full bg-[#D4AF37]/25 transition-transform duration-300',
          hovered ? 'scale-[2.2]' : 'scale-[1.8] animate-ping'
        )}
      />
      {/* Inner dot */}
      <span
        className={cn(
          'relative flex size-9 items-center justify-center rounded-full border-2 border-white/90 shadow-xl shadow-black/50 transition-all duration-200',
          hovered
            ? 'bg-[#D4AF37] scale-110 shadow-[#D4AF37]/50'
            : 'bg-[#D4AF37]/90'
        )}
      >
        <ArrowRight className="size-4 text-black" aria-hidden="true" />
      </span>
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, x: -4, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white shadow-xl"
          >
            <span className="text-[#D4AF37] mr-1">→</span>
            {target.name}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

// ── Scene thumbnail strip ────────────────────────────────────────────────────

function SceneStrip({
  scenes,
  activeSceneId,
  onSelect,
}: {
  scenes: VirtualScene[];
  activeSceneId: string;
  onSelect: (id: string, idx: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeIdx = scenes.findIndex((s) => s._id === activeSceneId);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLButtonElement>(
      `[data-scene-id="${activeSceneId}"]`
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeSceneId]);

  return (
    <div className="relative bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800/60">
      <div
        ref={stripRef}
        className="flex gap-2 p-2.5 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
        role="list"
        aria-label="Scènes de la visite"
      >
        {scenes.map((scene, idx) => {
          const isActive = scene._id === activeSceneId;
          return (
            <button
              key={scene._id}
              type="button"
              role="listitem"
              data-scene-id={scene._id}
              aria-label={`${scene.name}${isActive ? ' (actuelle)' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onSelect(scene._id, idx)}
              className={cn(
                'relative shrink-0 h-[60px] w-[90px] rounded-lg overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]',
                isActive
                  ? 'border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.45)]'
                  : 'border-transparent opacity-55 hover:opacity-90 hover:border-zinc-600'
              )}
            >
              <Image
                src={scene.image}
                alt={scene.name}
                fill
                className="object-cover"
                sizes="90px"
              />
              {/* Active overlay */}
              {isActive && (
                <div className="absolute inset-0 bg-[#D4AF37]/10" />
              )}
              {/* Scene name label */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-3 pb-0.5 px-1">
                <p className="text-[9px] text-white font-medium truncate text-center leading-tight">
                  {scene.name}
                </p>
              </div>
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#D4AF37]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main VirtualTourViewer ───────────────────────────────────────────────────

export function VirtualTourViewer({
  scenes,
  hotspots,
  initialSceneId,
  className,
}: VirtualTourViewerProps) {
  const [activeSceneId, setActiveSceneId] = useState(
    initialSceneId ?? scenes[0]?._id ?? ''
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeScene = scenes.find((s) => s._id === activeSceneId) ?? scenes[0];
  const activeIdx = scenes.findIndex((s) => s._id === activeSceneId);

  const prevScene = activeIdx > 0 ? scenes[activeIdx - 1] : null;
  const nextScene = activeIdx < scenes.length - 1 ? scenes[activeIdx + 1] : null;

  // Hotspots that belong to the current scene
  const activeHotspots = hotspots.filter((h) => h.virtualTourId === activeSceneId);

  const navigateTo = useCallback(
    (targetId: string) => {
      if (isTransitioning || targetId === activeSceneId) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveSceneId(targetId);
        setIsTransitioning(false);
      }, 320);
    },
    [isTransitioning, activeSceneId]
  );

  // Keyboard navigation (left/right arrows)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevScene) navigateTo(prevScene._id);
      if (e.key === 'ArrowRight' && nextScene) navigateTo(nextScene._id);
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevScene, nextScene, navigateTo, fullscreen]);

  if (!activeScene) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="size-8" />
          <p className="text-sm">Aucune scène disponible</p>
        </div>
      </div>
    );
  }

  const viewer = (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl border border-zinc-800/60',
        fullscreen && 'fixed inset-0 z-[100] rounded-none border-0',
        className
      )}
    >
      {/* ── Panorama viewer ─────────────────────────────────────────── */}
      <div className="relative w-full" style={{ paddingBottom: '50%' }}>
        {/* AnimatePresence handles the crossfade */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeSceneId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={activeScene.image}
              alt={activeScene.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 900px"
              priority
            />
            {/* Gradient overlays for HUD legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-zinc-950/50 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/30 via-transparent to-zinc-950/30 pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* ── Top HUD ─────────────────────────────────────────────── */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-start justify-between p-3 sm:p-4">
          {/* Scene info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">
                <Navigation className="size-2.5" aria-hidden="true" />
                360°
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {activeIdx + 1} / {scenes.length}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight drop-shadow-md">
              {activeScene.name}
            </h3>
            {activeScene.description && (
              <p className="text-[11px] text-zinc-300/80 mt-0.5 max-w-xs truncate">
                {activeScene.description}
              </p>
            )}
          </div>

          {/* Fullscreen toggle */}
          <button
            type="button"
            aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            onClick={() => setFullscreen((f) => !f)}
            className="size-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            {fullscreen ? <X className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>

        {/* ── Navigation hotspots ─────────────────────────────────── */}
        {activeHotspots.map((hotspot) => {
          const target = scenes.find((s) => s._id === hotspot.targetId);
          if (!target) return null;
          return (
            <HotspotDot
              key={hotspot._id}
              hotspot={hotspot}
              target={target}
              onNavigate={() => navigateTo(hotspot.targetId)}
              disabled={isTransitioning}
            />
          );
        })}

        {/* ── Prev / Next scene arrows ─────────────────────────────── */}
        {prevScene && (
          <button
            type="button"
            aria-label={`Scène précédente: ${prevScene.name}`}
            onClick={() => navigateTo(prevScene._id)}
            disabled={isTransitioning}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        {nextScene && (
          <button
            type="button"
            aria-label={`Scène suivante: ${nextScene.name}`}
            onClick={() => navigateTo(nextScene._id)}
            disabled={isTransitioning}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-black/55 border border-white/10 flex items-center justify-center text-white hover:bg-amber-400/20 hover:border-amber-400/30 transition-all duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        )}

        {/* ── Progress bar ─────────────────────────────────────────── */}
        {scenes.length > 1 && (
          <div className="absolute bottom-0 inset-x-0 z-20 h-0.5 bg-zinc-800/60">
            <motion.div
              className="h-full bg-[#D4AF37]"
              animate={{ width: `${((activeIdx + 1) / scenes.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* ── Scene thumbnail strip ─────────────────────────────────────── */}
      {scenes.length > 1 && (
        <SceneStrip
          scenes={scenes}
          activeSceneId={activeSceneId}
          onSelect={(id) => navigateTo(id)}
        />
      )}
    </div>
  );

  return viewer;
}
