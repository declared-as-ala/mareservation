'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { AdminTablePlacement, AdminTableRow } from '@/lib/api/admin';
import type { MpSdk, MatterportVector3 } from '@/types/matterport';

export interface TableMarker {
  placement: AdminTablePlacement;
  table?: AdminTableRow;
}

export interface MatterportEngineProps {
  embedUrl: string;
  markers: TableMarker[];
  selectedMarkerId?: string | null;
  mode: 'navigate' | 'place' | 'move';
  onPositionClick?: (anchorPosition: MatterportVector3, stemVector: MatterportVector3, floorIndex: number) => void;
  onMarkerClick?: (placementId: string) => void;
  onMarkerMoved?: (placementId: string, anchorPosition: MatterportVector3, stemVector: MatterportVector3, floorIndex: number) => void;
}

const SDK_SCRIPT_URL = 'https://static.matterport.com/showcase-sdk/latest.js';
const SDK_VERSION = '3.10';
const STEM_LENGTH = 0.3;

function getMarkerColor(marker: TableMarker): { r: number; g: number; b: number } {
  if (!marker.table) return { r: 0.53, g: 0.53, b: 0.53 };
  if (marker.table.defaultStatus === 'blocked') return { r: 0.94, g: 0.27, b: 0.27 };
  if (marker.table.isVip) return { r: 0.96, g: 0.62, b: 0.04 };
  return { r: 0.13, g: 0.77, b: 0.37 };
}

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
    if (window.MP_SDK) {
      resolve();
      return;
    }
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

export default function MatterportEngine({
  embedUrl,
  markers,
  selectedMarkerId,
  mode,
  onPositionClick,
  onMarkerClick,
  onMarkerMoved,
}: MatterportEngineProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sdkRef = useRef<MpSdk | null>(null);
  const tagMapRef = useRef<Map<string, string>>(new Map());
  const intersectionRef = useRef<{ position: MatterportVector3; normal: MatterportVector3; floorIndex?: number } | null>(null);
  const modeRef = useRef(mode);
  const selectedRef = useRef(selectedMarkerId);
  const markersRef = useRef(markers);
  const callbacksRef = useRef({ onPositionClick, onMarkerClick, onMarkerMoved });

  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  modeRef.current = mode;
  selectedRef.current = selectedMarkerId;
  markersRef.current = markers;
  callbacksRef.current = { onPositionClick, onMarkerClick, onMarkerMoved };

  const sdkKey = process.env.NEXT_PUBLIC_MATTERPORT_SDK_KEY || '';
  const modelId = extractModelId(embedUrl);

  const iframeSrc = modelId && sdkKey
    ? `https://my.matterport.com/show/?m=${modelId}&play=1&applicationKey=${sdkKey}&title=0&qs=1&hr=0&brand=0&help=0`
    : embedUrl;

  // Connect to SDK once iframe loads
  const handleIframeLoad = useCallback(async () => {
    if (!sdkKey || !modelId || sdkRef.current || connecting) return;
    setConnecting(true);

    try {
      await loadSdkScript();
      if (!window.MP_SDK) throw new Error('MP_SDK not available');
      if (!iframeRef.current) throw new Error('iframe not ready');

      const sdk = await window.MP_SDK.connect(iframeRef.current, sdkKey, SDK_VERSION);
      sdkRef.current = sdk;

      // Subscribe to pointer intersection for place/move modes
      sdk.Pointer.intersection.subscribe((data) => {
        intersectionRef.current = {
          position: { ...data.position },
          normal: { ...data.normal },
          floorIndex: data.floorIndex,
        };
      });

      // Listen for mattertag clicks
      sdk.on(sdk.Mattertag.Event.CLICK, (tagSid: unknown) => {
        const sid = tagSid as string;
        const placementId = findPlacementBySid(sid);
        if (placementId) {
          callbacksRef.current.onMarkerClick?.(placementId);
        }
      });

      setSdkReady(true);
      setSdkError(null);
    } catch (err) {
      console.error('Matterport SDK connection error:', err);
      setSdkError(err instanceof Error ? err.message : 'SDK connection failed');
    } finally {
      setConnecting(false);
    }
  }, [sdkKey, modelId, connecting]);

  function findPlacementBySid(sid: string): string | undefined {
    for (const [placementId, tagSid] of tagMapRef.current.entries()) {
      if (tagSid === sid) return placementId;
    }
    return undefined;
  }

  // Sync markers with Mattertags
  useEffect(() => {
    const sdk = sdkRef.current;
    if (!sdk || !sdkReady) return;

    const syncMarkers = async () => {
      const currentIds = new Set(markers.map((m) => m.placement._id));
      const existingIds = new Set(tagMapRef.current.keys());

      // Remove tags for placements that no longer exist
      for (const placementId of existingIds) {
        if (!currentIds.has(placementId)) {
          const sid = tagMapRef.current.get(placementId);
          if (sid) {
            try { await sdk.Mattertag.remove(sid); } catch { /* already removed */ }
          }
          tagMapRef.current.delete(placementId);
        }
      }

      // Add or update tags
      for (const marker of markers) {
        const { placement, table } = marker;
        if (placement.positionType !== 'matterport_anchor' || !placement.anchorPosition) continue;

        const existingSid = tagMapRef.current.get(placement._id);
        const color = getMarkerColor(marker);
        const label = table?.name || `T${table?.tableNumber ?? '?'}`;

        if (existingSid) {
          try {
            await sdk.Mattertag.editPosition(existingSid, {
              anchorPosition: placement.anchorPosition,
              stemVector: placement.stemVector || { x: 0, y: STEM_LENGTH, z: 0 },
              floorIndex: placement.floorIndex ?? 0,
            });
            await sdk.Mattertag.editColor(existingSid, color);
          } catch { /* tag may have been removed externally */ }
        } else {
          try {
            const [sid] = await sdk.Mattertag.add([{
              label,
              description: table
                ? `${table.capacity} pers. · ${table.price} TND${table.isVip ? ' · VIP' : ''}`
                : '',
              anchorPosition: placement.anchorPosition,
              stemVector: placement.stemVector || { x: 0, y: STEM_LENGTH, z: 0 },
              floorIndex: placement.floorIndex ?? 0,
              color,
              stemVisible: true,
            }]);
            tagMapRef.current.set(placement._id, sid);
          } catch (err) {
            console.error('Failed to add Mattertag:', err);
          }
        }
      }
    };

    syncMarkers();
  }, [markers, sdkReady]);

  // Handle click for place / move modes
  const handleOverlayClick = useCallback(() => {
    const intersection = intersectionRef.current;
    if (!intersection) return;

    const anchorPosition = { ...intersection.position };
    const stemVector = {
      x: intersection.normal.x * STEM_LENGTH,
      y: intersection.normal.y * STEM_LENGTH,
      z: intersection.normal.z * STEM_LENGTH,
    };
    const floorIndex = intersection.floorIndex ?? 0;

    if (modeRef.current === 'place') {
      callbacksRef.current.onPositionClick?.(anchorPosition, stemVector, floorIndex);
    } else if (modeRef.current === 'move' && selectedRef.current) {
      callbacksRef.current.onMarkerMoved?.(selectedRef.current, anchorPosition, stemVector, floorIndex);
    }
  }, []);

  // Cleanup SDK on unmount
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

  if (!sdkKey) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 p-6">
        <div className="text-center space-y-3 max-w-md">
          <div className="size-16 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto">
            <svg className="size-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-100">Clé SDK Matterport requise</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Pour placer des marqueurs 3D ancrés dans la visite Matterport, une clé SDK est nécessaire.
            Ajoutez <code className="text-amber-400 bg-zinc-800 px-1 rounded">NEXT_PUBLIC_MATTERPORT_SDK_KEY</code> dans
            votre fichier <code className="text-amber-400 bg-zinc-800 px-1 rounded">.env.local</code>.
          </p>
          <a
            href="https://developer.matterport.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-[#D4AF37] underline hover:text-[#C4A030]"
          >
            Obtenir une clé gratuite sur developer.matterport.com
          </a>
        </div>
      </div>
    );
  }

  const overlayActive = mode === 'place' || mode === 'move';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Visite Matterport"
        className="absolute inset-0 w-full h-full border-0"
        allow="xr-spatial-tracking"
        allowFullScreen
        onLoad={handleIframeLoad}
      />

      {/* Transparent overlay to capture clicks in place/move modes */}
      {overlayActive && sdkReady && (
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: mode === 'place' ? 'crosshair' : 'move' }}
          onClick={handleOverlayClick}
        />
      )}

      {sdkError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-red-600/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
          Erreur SDK : {sdkError}
        </div>
      )}

      {connecting && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-zinc-950/90 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none flex items-center gap-2">
          <div className="size-3 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
          Connexion au SDK Matterport...
        </div>
      )}

      {mode === 'place' && sdkReady && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-black text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
          Cliquez sur une surface pour placer une table
        </div>
      )}

      {mode === 'move' && selectedMarkerId && sdkReady && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-black text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
          Cliquez pour repositionner la table sélectionnée
        </div>
      )}
    </div>
  );
}
