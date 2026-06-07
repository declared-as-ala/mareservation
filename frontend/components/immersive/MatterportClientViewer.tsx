'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { MpSdk } from '@/types/matterport';
import type { PublicTablePlacement } from '@/lib/api/venues';

export interface MatterportClientViewerProps {
  embedUrl: string;
  placements: PublicTablePlacement[];
  onTableSelect?: (placement: PublicTablePlacement) => void;
}

const SDK_SCRIPT_URL = 'https://static.matterport.com/showcase-sdk/latest.js';
const SDK_VERSION = '3.10';
const STEM_LENGTH = 0.3;

function extractModelId(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get('m');
  } catch {
    const match = url.match(/[?&]m=([^&]+)/);
    return match?.[1] ?? null;
  }
}

function loadSdkScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MP_SDK) { resolve(); return; }
    const existing = document.querySelector(`script[src="${SDK_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      if (window.MP_SDK) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Matterport SDK'));
    document.head.appendChild(script);
  });
}

function getStatusColor(status: string): { r: number; g: number; b: number } {
  switch (status) {
    case 'available': return { r: 0.13, g: 0.77, b: 0.37 };
    case 'reserved': return { r: 0.94, g: 0.27, b: 0.27 };
    case 'blocked': return { r: 0.53, g: 0.53, b: 0.53 };
    default: return { r: 0.53, g: 0.53, b: 0.53 };
  }
}

export default function MatterportClientViewer({
  embedUrl,
  placements,
  onTableSelect,
}: MatterportClientViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sdkRef = useRef<MpSdk | null>(null);
  const tagMapRef = useRef<Map<string, string>>(new Map());
  const placementsRef = useRef(placements);
  const callbackRef = useRef(onTableSelect);

  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);

  placementsRef.current = placements;
  callbackRef.current = onTableSelect;

  const sdkKey = process.env.NEXT_PUBLIC_MATTERPORT_SDK_KEY || '';
  const modelId = extractModelId(embedUrl);

  const iframeSrc = modelId && sdkKey
    ? `https://my.matterport.com/show/?m=${modelId}&play=1&applicationKey=${sdkKey}&title=0&qs=1&hr=0&brand=0&help=0`
    : embedUrl;

  function findPlacementBySid(sid: string): PublicTablePlacement | undefined {
    for (const [placementId, tagSid] of tagMapRef.current.entries()) {
      if (tagSid === sid) {
        return placementsRef.current.find((p) => p._id === placementId);
      }
    }
    return undefined;
  }

  const handleIframeLoad = useCallback(async () => {
    if (!sdkKey || !modelId || sdkRef.current || connecting) return;
    setConnecting(true);

    try {
      await loadSdkScript();
      if (!window.MP_SDK) throw new Error('MP_SDK not available');
      if (!iframeRef.current) throw new Error('iframe not ready');

      const sdk = await window.MP_SDK.connect(iframeRef.current, sdkKey, SDK_VERSION);
      sdkRef.current = sdk;

      sdk.on(sdk.Mattertag.Event.CLICK, (tagSid: unknown) => {
        const placement = findPlacementBySid(tagSid as string);
        if (placement && placement.table.status === 'available') {
          callbackRef.current?.(placement);
        }
      });

      setSdkReady(true);
    } catch (err) {
      console.error('Matterport SDK connection error:', err);
    } finally {
      setConnecting(false);
    }
  }, [sdkKey, modelId, connecting]);

  // Sync placements as Mattertags
  useEffect(() => {
    const sdk = sdkRef.current;
    if (!sdk || !sdkReady) return;

    const syncMarkers = async () => {
      const currentIds = new Set(placements.map((p) => p._id));
      const existingIds = new Set(tagMapRef.current.keys());

      for (const placementId of existingIds) {
        if (!currentIds.has(placementId)) {
          const sid = tagMapRef.current.get(placementId);
          if (sid) {
            try { await sdk.Mattertag.remove(sid); } catch { /* already removed */ }
          }
          tagMapRef.current.delete(placementId);
        }
      }

      for (const placement of placements) {
        if (placement.positionType !== 'matterport_anchor' || !placement.anchorPosition) continue;

        const existingSid = tagMapRef.current.get(placement._id);
        const { table } = placement;
        const color = getStatusColor(table.status);
        const isAvailable = table.status === 'available';
        const statusIcon = isAvailable ? '✓' : '✗';
        const statusLabel = isAvailable ? 'Disponible' : table.status === 'reserved' ? 'Réservée' : 'Indisponible';
        const tableName = table.name || `Table ${table.tableNumber}`;
        // Label shows in 3D space — include status so it's visible without clicking
        const label = `${statusIcon} ${tableName}`;

        if (existingSid) {
          try {
            await sdk.Mattertag.editColor(existingSid, color);
          } catch { /* tag may have been removed */ }
        } else {
          try {
            const [sid] = await sdk.Mattertag.add([{
              label,
              description: `${statusLabel} · ${table.capacity} pers. max · ${table.price} TND${table.isVip ? ' · VIP ★' : ''}`,
              anchorPosition: placement.anchorPosition,
              stemVector: placement.stemVector || { x: 0, y: STEM_LENGTH, z: 0 },
              floorIndex: placement.floorIndex ?? 0,
              color,
              stemVisible: true,
            }]);
            tagMapRef.current.set(placement._id, sid);
          } catch (err) {
            console.error('Failed to add client Mattertag:', err);
          }
        }
      }
    };

    syncMarkers();
  }, [placements, sdkReady]);

  // Cleanup on unmount
  useEffect(() => {
    const tagMap = tagMapRef.current;
    return () => {
      const sdk = sdkRef.current;
      if (sdk) {
        Array.from(tagMap.values()).forEach((sid) => {
          try { sdk.Mattertag.remove(sid); } catch { /* ignore */ }
        });
        tagMap.clear();
      }
      sdkRef.current = null;
    };
  }, []);

  // If no SDK key, render plain iframe
  if (!sdkKey) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
        <iframe
          src={embedUrl}
          title="Visite Matterport"
          className="h-full w-full"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Visite Matterport"
        className="h-full w-full"
        allow="xr-spatial-tracking"
        allowFullScreen
        onLoad={handleIframeLoad}
      />

      {connecting && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-zinc-950/90 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
          <div className="size-3 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
          Chargement des tables...
        </div>
      )}

      {/* Legend + status counts */}
      {sdkReady && placements.length > 0 && (() => {
        const availableCount = placements.filter((p) => p.table.status === 'available').length;
        const reservedCount = placements.filter((p) => p.table.status !== 'available').length;
        return (
          <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-2">
            {/* Count pills */}
            <div className="flex gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
                <span className="size-1.5 rounded-full bg-white/80" />
                {availableCount} disponible{availableCount !== 1 ? 's' : ''}
              </div>
              {reservedCount > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 shadow-lg">
                  <span className="size-1.5 rounded-full bg-white/80" />
                  {reservedCount} réservée{reservedCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="bg-zinc-950/90 backdrop-blur-sm text-zinc-300 text-[10px] px-3 py-2 rounded-lg shadow-lg space-y-1 border border-zinc-800">
              <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-medium">Tables · cliquez pour réserver</div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-emerald-500" />
                <span>✓ Disponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-red-500" />
                <span>✗ Réservée</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
