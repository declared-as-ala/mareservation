'use client';

import dynamic from 'next/dynamic';
import type { AdminTablePlacement, AdminTableRow } from '@/lib/api/admin';

const PanoramaEngine = dynamic(() => import('./PanoramaEngine'), { ssr: false });
const EmbedEngine = dynamic(() => import('./EmbedEngine'), { ssr: false });

export interface TableMarker {
  placement: AdminTablePlacement;
  table?: AdminTableRow;
}

export type EditorMode = 'navigate' | 'place' | 'move';

export interface ImmersiveViewerProps {
  sourceType: 'url' | 'upload';
  url: string;
  markers: TableMarker[];
  selectedMarkerId?: string | null;
  mode: EditorMode;
  onPositionClick?: (yaw: number, pitch: number) => void;
  onMarkerClick?: (placementId: string) => void;
  onMarkerMoved?: (placementId: string, yaw: number, pitch: number) => void;
}

export default function ImmersiveViewer({
  sourceType,
  url,
  markers,
  selectedMarkerId,
  mode,
  onPositionClick,
  onMarkerClick,
  onMarkerMoved,
}: ImmersiveViewerProps) {
  const DEFAULT_360 = '/default-360.jpg';

  if (sourceType === 'upload' || !url) {
    return (
      <PanoramaEngine
        imageUrl={url || DEFAULT_360}
        markers={markers}
        selectedMarkerId={selectedMarkerId}
        mode={mode}
        onPositionClick={onPositionClick}
        onMarkerClick={onMarkerClick}
        onMarkerMoved={onMarkerMoved}
      />
    );
  }

  return (
    <EmbedEngine
      embedUrl={url}
      markers={markers}
      selectedMarkerId={selectedMarkerId}
      mode={mode}
      onPositionClick={onPositionClick}
      onMarkerClick={onMarkerClick}
      onMarkerMoved={onMarkerMoved}
    />
  );
}
