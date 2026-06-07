'use client';

import { useRef, useCallback, useState } from 'react';
import type { AdminTablePlacement, AdminTableRow } from '@/lib/api/admin';

export interface TableMarker {
  placement: AdminTablePlacement;
  table?: AdminTableRow;
}

export interface EmbedEngineProps {
  embedUrl: string;
  markers: TableMarker[];
  selectedMarkerId?: string | null;
  mode: 'navigate' | 'place' | 'move';
  onPositionClick?: (yaw: number, pitch: number) => void;
  onMarkerClick?: (placementId: string) => void;
  onMarkerMoved?: (placementId: string, yaw: number, pitch: number) => void;
}

function yawPitchToPercent(yaw: number, pitch: number) {
  const xPercent = 50 + (yaw / (2 * Math.PI)) * 100;
  const yPercent = 50 - (pitch / Math.PI) * 100;
  return { xPercent, yPercent };
}

function percentToYawPitch(xPct: number, yPct: number) {
  const yaw = ((xPct - 50) / 100) * (2 * Math.PI);
  const pitch = ((50 - yPct) / 100) * Math.PI;
  return { yaw, pitch };
}

function getMarkerColor(marker: TableMarker): string {
  if (!marker.table) return '#888';
  if (marker.table.defaultStatus === 'blocked') return '#ef4444';
  if (marker.table.isVip) return '#f59e0b';
  return '#22c55e';
}

export default function EmbedEngine({
  embedUrl,
  markers,
  selectedMarkerId,
  mode,
  onPositionClick,
  onMarkerClick,
  onMarkerMoved,
}: EmbedEngineProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragging] = useState<string | null>(null);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      const { yaw, pitch } = percentToYawPitch(xPct, yPct);

      if (mode === 'place') {
        onPositionClick?.(yaw, pitch);
      } else if (mode === 'move' && selectedMarkerId) {
        onMarkerMoved?.(selectedMarkerId, yaw, pitch);
      }
    },
    [mode, onPositionClick, onMarkerMoved, selectedMarkerId, dragging]
  );

  const handleMarkerPointerDown = useCallback(
    (e: React.PointerEvent, placementId: string) => {
      e.stopPropagation();
      e.preventDefault();
      onMarkerClick?.(placementId);
    },
    [onMarkerClick]
  );

  // In navigate mode, let the iframe handle all interactions
  const overlayActive = mode === 'place' || mode === 'move';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <iframe
        src={embedUrl}
        title="Vue immersive"
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
      />
      {overlayActive && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-10"
          onClick={handleOverlayClick}
        >
          {markers.map((m) => {
            if (m.placement.positionType !== 'yaw_pitch' || m.placement.yaw == null || m.placement.pitch == null) return null;
            const { xPercent, yPercent } = yawPitchToPercent(m.placement.yaw, m.placement.pitch);
            const color = getMarkerColor(m);
            const isSelected = m.placement._id === selectedMarkerId;
            const label = m.table?.name || `T${m.table?.tableNumber ?? '?'}`;
            const size = isSelected ? 36 : 28;

            return (
              <div
                key={m.placement._id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  cursor: 'pointer',
                  zIndex: isSelected ? 20 : 10,
                }}
                onPointerDown={(e) => handleMarkerPointerDown(e, m.placement._id)}
              >
                <div
                  className="rounded-full flex items-center justify-center text-white font-bold transition-all"
                  style={{
                    width: size,
                    height: size,
                    background: color,
                    border: `2px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.6)'}`,
                    boxShadow: `0 2px 8px rgba(0,0,0,0.4)${isSelected ? ',0 0 0 3px rgba(212,175,55,0.6)' : ''}`,
                    fontSize: isSelected ? 12 : 10,
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* In navigate mode, render markers but don't block the iframe */}
      {!overlayActive && markers.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {markers.map((m) => {
            if (m.placement.positionType !== 'yaw_pitch' || m.placement.yaw == null || m.placement.pitch == null) return null;
            const { xPercent, yPercent } = yawPitchToPercent(m.placement.yaw, m.placement.pitch);
            const color = getMarkerColor(m);
            const isSelected = m.placement._id === selectedMarkerId;
            const label = m.table?.name || `T${m.table?.tableNumber ?? '?'}`;

            return (
              <div
                key={m.placement._id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  cursor: 'pointer',
                }}
                onClick={(e) => { e.stopPropagation(); onMarkerClick?.(m.placement._id); }}
              >
                <div
                  className="rounded-full flex items-center justify-center text-white font-bold"
                  style={{
                    width: isSelected ? 36 : 28,
                    height: isSelected ? 36 : 28,
                    background: color,
                    border: `2px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.6)'}`,
                    boxShadow: `0 2px 8px rgba(0,0,0,0.4)${isSelected ? ',0 0 0 3px rgba(212,175,55,0.6)' : ''}`,
                    fontSize: isSelected ? 12 : 10,
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {mode === 'place' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-black text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
          Cliquez pour placer une table
        </div>
      )}
      {mode === 'move' && selectedMarkerId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-black text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
          Cliquez pour repositionner la table
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 z-20 pointer-events-none">
        <div className="bg-zinc-950/90 backdrop-blur-sm text-zinc-400 text-[11px] leading-tight px-3 py-2 rounded-lg border border-zinc-800 shadow-md">
          <strong>Note :</strong> Les marqueurs sur une visite virtuelle embarquee (iframe) sont positionnes de maniere approximative.
          Pour un ancrage precis, utilisez une image 360° uploadee ou un modele Matterport avec SDK.
        </div>
      </div>
    </div>
  );
}
