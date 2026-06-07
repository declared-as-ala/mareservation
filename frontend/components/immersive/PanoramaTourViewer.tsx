'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2, Navigation, ScanLine } from 'lucide-react';
import PanoramaEngine, { type NavHotspot } from './PanoramaEngine';
import type { VirtualHotspot, VirtualScene } from '@/lib/api/venues';
import { cn } from '@/lib/utils';

interface PanoramaTourViewerProps {
  scenes: VirtualScene[];
  hotspots?: VirtualHotspot[];
  title?: string;
  className?: string;
}

function hotspotYaw(hotspot: VirtualHotspot): number {
  return hotspot.yaw ?? ((hotspot.xPercent / 100) - 0.5) * Math.PI * 2;
}

function hotspotPitch(hotspot: VirtualHotspot): number {
  return hotspot.pitch ?? (0.5 - (hotspot.yPercent / 100)) * Math.PI;
}

export function PanoramaTourViewer({
  scenes,
  hotspots = [],
  title = 'Visite virtuelle 360',
  className,
}: PanoramaTourViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSceneId, setActiveSceneId] = useState(scenes[0]?._id ?? '');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!scenes.some((scene) => scene._id === activeSceneId)) {
      setActiveSceneId(scenes[0]?._id ?? '');
    }
  }, [activeSceneId, scenes]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const activeScene = scenes.find((scene) => scene._id === activeSceneId) ?? scenes[0];
  const activeIndex = scenes.findIndex((scene) => scene._id === activeScene?._id);
  const activeHotspots = useMemo(
    () => hotspots.filter((hotspot) => hotspot.virtualTourId === activeScene?._id),
    [activeScene?._id, hotspots]
  );
  const navHotspots: NavHotspot[] = activeHotspots.map((hotspot) => ({
    id: hotspot._id,
    yaw: hotspotYaw(hotspot),
    pitch: hotspotPitch(hotspot),
    label: hotspot.label,
  }));

  function navigateFromHotspot(hotspotId: string) {
    const hotspot = activeHotspots.find((item) => item._id === hotspotId);
    if (hotspot && scenes.some((scene) => scene._id === hotspot.targetId)) {
      setActiveSceneId(hotspot.targetId);
    }
  }

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  }

  if (!activeScene) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative min-h-[420px] overflow-hidden rounded-2xl border border-white/[0.1] bg-black shadow-2xl',
        fullscreen && 'rounded-none border-0',
        className
      )}
    >
      <PanoramaEngine
        imageUrl={activeScene.image}
        markers={[]}
        mode="navigate"
        navHotspots={navHotspots}
        onNavHotspotClick={navigateFromHotspot}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/75 to-transparent p-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300 backdrop-blur-md">
            <ScanLine className="size-3" /> {title}
          </span>
          <h3 className="mt-2 text-base font-semibold text-white">{activeScene.name}</h3>
          {activeScene.description && (
            <p className="mt-0.5 max-w-lg text-xs text-white/60">{activeScene.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Quitter le plein ecran' : 'Ouvrir en plein ecran'}
          className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition-colors hover:border-amber-400/40 hover:bg-amber-400/15"
        >
          {fullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-3 pt-12 sm:px-4 sm:pb-4">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <Navigation className="size-3" />
            Choisir un espace
          </span>
          <span>{activeIndex + 1} / {scenes.length}</span>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {scenes.map((scene) => {
            const active = scene._id === activeScene._id;
            return (
              <button
                key={scene._id}
                type="button"
                onClick={() => setActiveSceneId(scene._id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'relative aspect-[3/2] w-28 shrink-0 overflow-hidden rounded-xl border text-left transition-all',
                  active
                    ? 'border-amber-400 ring-2 ring-amber-400/35'
                    : 'border-white/15 opacity-70 hover:border-white/35 hover:opacity-100'
                )}
              >
                <Image src={scene.image} alt={scene.name} fill sizes="112px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                <span className="absolute inset-x-2 bottom-1.5 truncate text-[10px] font-semibold text-white">
                  {scene.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
