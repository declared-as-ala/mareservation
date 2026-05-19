'use client';

import { useEffect, useRef, useState } from 'react';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import type { AdminTablePlacement, AdminTableRow } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

export interface TableMarker {
  placement: AdminTablePlacement;
  table?: AdminTableRow;
}

export interface PanoramaScene {
  _id: string;
  name: string;
  image: string;
}

export interface NavHotspot {
  id: string;
  /** yaw in radians (-π to π) */
  yaw: number;
  /** pitch in radians (-π/2 to π/2) */
  pitch: number;
  /** Label shown in tooltip */
  label: string;
}

export interface PanoramaEngineProps {
  imageUrl: string;
  markers: TableMarker[];
  selectedMarkerId?: string | null;
  mode: 'navigate' | 'place' | 'move';
  onPositionClick?: (yaw: number, pitch: number) => void;
  onMarkerClick?: (placementId: string) => void;
  onMarkerMoved?: (placementId: string, yaw: number, pitch: number) => void;
  /** Navigation hotspots linking to other scenes */
  navHotspots?: NavHotspot[];
  onNavHotspotClick?: (hotspotId: string) => void;
  /** Optional multi-scene support */
  scenes?: PanoramaScene[];
  activeSceneId?: string | null;
  onSceneChange?: (sceneId: string) => void;
}

function getMarkerColor(marker: TableMarker): string {
  if (!marker.table) return '#888';
  const status = marker.table.defaultStatus;
  if (status === 'reserved' || status === 'blocked') return '#ef4444';
  if (status === 'available' && marker.table.isVip) return '#f59e0b';
  return '#22c55e';
}

function buildMarkerHtml(marker: TableMarker, isSelected: boolean): string {
  const isAvailable = marker.table?.defaultStatus === 'available';
  const isVip = marker.table?.isVip;
  const size = isSelected ? 44 : 36;

  const circleColor = isAvailable
    ? isVip ? '#f59e0b' : '#22c55e'
    : '#ef4444';

  const badgeBg = isAvailable
    ? isVip ? 'rgba(245,158,11,0.95)' : 'rgba(34,197,94,0.95)'
    : 'rgba(239,68,68,0.90)';

  const badgeText = isAvailable
    ? (isVip ? '★ VIP' : '✓ Disponible')
    : '✗ Réservée';

  const rawLabel = marker.table?.name && marker.table.name.length <= 4
    ? marker.table.name
    : String(marker.table?.tableNumber ?? '?');

  const opacity = isAvailable ? '1' : '0.65';
  const cursor = isAvailable ? 'pointer' : 'default';

  // Outer glow ring (pulse effect for available tables)
  const pulseRing = isAvailable && !isSelected
    ? `<div style="
        position:absolute;inset:-6px;border-radius:50%;
        border:2px solid ${circleColor};
        opacity:0.4;
        animation:psv-pulse 2s ease-in-out infinite;
      "></div>`
    : '';

  // Selected ring
  const selectedRingStyle = isSelected
    ? `box-shadow:0 0 0 3px rgba(251,191,36,0.9),0 4px 20px rgba(0,0,0,0.6);`
    : `box-shadow:0 3px 14px rgba(0,0,0,0.6);`;

  return `<div style="position:relative;width:${size}px;height:${size + 32}px;cursor:${cursor};display:flex;flex-direction:column;align-items:center;gap:4px;">
  <div style="
    background:${badgeBg};
    color:#fff;
    font-family:system-ui,-apple-system,sans-serif;
    font-size:9px;
    font-weight:800;
    padding:3px 9px;
    border-radius:20px;
    white-space:nowrap;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    letter-spacing:0.3px;
    pointer-events:none;
    user-select:none;
    flex-shrink:0;
  ">${badgeText}</div>
  <div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0;opacity:${opacity};">
    ${pulseRing}
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${circleColor};
      border:2.5px solid ${isSelected ? '#fbbf24' : 'rgba(255,255,255,0.85)'};
      ${selectedRingStyle}
      display:flex;align-items:center;justify-content:center;
      font-family:system-ui,-apple-system,sans-serif;
      font-size:${size >= 40 ? 15 : 12}px;font-weight:900;color:#fff;
      user-select:none;
      text-shadow:0 1px 4px rgba(0,0,0,0.5);
      transition:transform 0.15s ease;
    ">${rawLabel}</div>
  </div>
</div>`;
}

function buildNavHotspotHtml(label: string): string {
  return `<div style="position:relative;width:40px;height:40px;cursor:pointer;" title="${label.replace(/"/g, '&quot;')}">
  <div style="
    position:absolute;inset:-7px;border-radius:50%;
    border:2px solid #D4AF37;opacity:0.35;
    animation:psv-pulse 2s ease-in-out infinite;
  "></div>
  <div style="
    width:40px;height:40px;border-radius:50%;
    background:#D4AF37;
    border:2.5px solid rgba(255,255,255,0.9);
    box-shadow:0 3px 16px rgba(0,0,0,0.55),0 0 0 6px rgba(212,175,55,0.15);
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  </div>
</div>`;
}

export default function PanoramaEngine({
  imageUrl,
  markers,
  selectedMarkerId,
  mode,
  onPositionClick,
  onMarkerClick,
  onMarkerMoved,
  navHotspots,
  onNavHotspotClick,
  scenes,
  activeSceneId,
  onSceneChange,
}: PanoramaEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const markersPluginRef = useRef<unknown>(null);
  const [loaded, setLoaded] = useState(false);

  const callbackRefs = useRef({ onPositionClick, onMarkerClick, onMarkerMoved, onNavHotspotClick });
  callbackRefs.current = { onPositionClick, onMarkerClick, onMarkerMoved, onNavHotspotClick };
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const selectedRef = useRef(selectedMarkerId);
  selectedRef.current = selectedMarkerId;

  // Initialize / re-initialize when imageUrl changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    setLoaded(false);

    // Destroy previous viewer if it exists
    if (viewerRef.current) {
      try {
        (viewerRef.current as { destroy?: () => void }).destroy?.();
      } catch {}
      viewerRef.current = null;
      markersPluginRef.current = null;
    }

    (async () => {
      const [{ Viewer }, { MarkersPlugin }] = await Promise.all([
        import('@photo-sphere-viewer/core'),
        import('@photo-sphere-viewer/markers-plugin'),
      ]);

      if (cancelled || !containerRef.current) return;

      const viewer = new Viewer({
        container: containerRef.current,
        panorama: imageUrl,
        navbar: false,
        defaultYaw: 0,
        defaultPitch: 0,
        defaultZoomLvl: 0,
        maxFov: 95,
        minFov: 35,
        fisheye: false,
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        plugins: [[MarkersPlugin, {}]],
      });

      viewerRef.current = viewer;

      viewer.addEventListener('ready', () => {
        if (cancelled) return;
        markersPluginRef.current = viewer.getPlugin(MarkersPlugin);
        setLoaded(true);
      });

      viewer.addEventListener('click', (e: unknown) => {
        const data = (e as { data?: { yaw?: unknown; pitch?: unknown } }).data;
        if (!data) return;
        const { yaw, pitch } = data;
        const currentMode = modeRef.current;

        if (typeof yaw !== 'number' || typeof pitch !== 'number') return;

        if (currentMode === 'place') {
          callbackRefs.current.onPositionClick?.(yaw, pitch);
        } else if (currentMode === 'move' && selectedRef.current) {
          callbackRefs.current.onMarkerMoved?.(selectedRef.current, yaw, pitch);
        }
      });
    })();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try {
          (viewerRef.current as { destroy?: () => void }).destroy?.();
        } catch {}
        viewerRef.current = null;
        markersPluginRef.current = null;
      }
    };
  }, [imageUrl]);

  // Sync markers whenever data changes
  useEffect(() => {
    const mp = markersPluginRef.current as
      | { clearMarkers: () => void; addMarker: (marker: unknown) => void }
      | null;
    if (!mp || !loaded) return;

    mp.clearMarkers();

    // Table placement markers
    markers.forEach((m) => {
      if (m.placement.positionType !== 'yaw_pitch' || m.placement.yaw == null || m.placement.pitch == null) return;

      const isSelected = m.placement._id === selectedMarkerId;
      const isAvailable = m.table?.defaultStatus === 'available';
      const label = m.table?.name || `T${m.table?.tableNumber ?? '?'}`;
      const statusLabel = isAvailable ? 'Disponible' : m.table?.defaultStatus === 'reserved' ? 'Réservée' : 'Indisponible';

      mp.addMarker({
        id: m.placement._id,
        position: { yaw: m.placement.yaw, pitch: m.placement.pitch },
        html: buildMarkerHtml(m, isSelected),
        anchor: 'center center',
        tooltip: {
          content: `${label} · ${statusLabel} · ${m.table?.capacity ?? '?'} pers.${m.table?.price ? ' · ' + m.table.price + ' TND' : ''}`,
          position: 'top center',
        },
        data: { placementId: m.placement._id },
      });
    });

    // Navigation hotspot markers (scene-to-scene)
    navHotspots?.forEach((h) => {
      mp.addMarker({
        id: `__nav__${h.id}`,
        position: { yaw: h.yaw, pitch: h.pitch },
        html: buildNavHotspotHtml(h.label),
        anchor: 'center center',
        tooltip: { content: `→ ${h.label}`, position: 'top center' },
      });
    });
  }, [loaded, markers, selectedMarkerId, mode, navHotspots]);

  // Handle marker selection via PSV markers plugin
  useEffect(() => {
    const mp = markersPluginRef.current;
    if (!mp || !loaded) return;

    const handler = (e: unknown) => {
      const markerId = (e as { marker?: { id?: unknown } }).marker?.id;
      if (typeof markerId === 'string') {
        if (markerId.startsWith('__nav__')) {
          callbackRefs.current.onNavHotspotClick?.(markerId.slice(7));
        } else {
          callbackRefs.current.onMarkerClick?.(markerId);
        }
      }
    };

    (mp as { addEventListener?: (event: string, cb: (e: unknown) => void) => void }).addEventListener?.(
      'select-marker',
      handler
    );
    return () => {
      try {
        (mp as { removeEventListener?: (event: string, cb: (e: unknown) => void) => void }).removeEventListener?.(
          'select-marker',
          handler
        );
      } catch {}
    };
  }, [loaded]);

  // Force viewer resize when container layout settles
  useEffect(() => {
    if (!viewerRef.current || !loaded) return;
    const timer = setTimeout(() => {
      try { (viewerRef.current as unknown as { autoSize: () => void })?.autoSize(); } catch {}
    }, 100);
    return () => clearTimeout(timer);
  }, [loaded]);

  const modeLabel = mode === 'place'
    ? 'Cliquez pour placer une table'
    : mode === 'move' && selectedMarkerId
    ? 'Cliquez pour repositionner la table'
    : null;

  const hasScenes = scenes && scenes.length > 1;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <div className="size-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-sm">Chargement de la vue 360...</span>
          </div>
        </div>
      )}
      {modeLabel && loaded && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#D4AF37] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
          {modeLabel}
        </div>
      )}
      {/* Scene navigation strip */}
      {hasScenes && loaded && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-zinc-950/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-zinc-800">
          {scenes!.map((scene) => {
            const isActive = scene._id === activeSceneId;
            return (
              <button
                key={scene._id}
                type="button"
                onClick={() => onSceneChange?.(scene._id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-amber-400 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                )}
                title={scene.name}
              >
                <span className={cn('size-1.5 rounded-full shrink-0', isActive ? 'bg-zinc-950' : 'bg-zinc-600')} />
                {scene.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
