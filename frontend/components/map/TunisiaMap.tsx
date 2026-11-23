'use client';

/**
 * Interactive map of Tunisia (Leaflet + marker clustering, OpenStreetMap tiles — no API key).
 * Markers are built ONLY from real coordinates supplied by the API; nothing is ever geocoded or guessed.
 * Leaflet is loaded on the client only (dynamic import), so the map costs nothing on the server render.
 */
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string; // short text in the pill (price or name)
  title: string;
  href?: string;
}

export const TUNISIA_CENTER: [number, number] = [34.0, 9.6];
export const TUNISIA_BOUNDS: [[number, number], [number, number]] = [[30.1, 7.4], [37.6, 11.7]];

type Props = {
  markers: MapMarker[];
  highlightedId?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** west,south,east,north — fired after the user pans/zooms (not on programmatic fits). */
  onBoundsChange?: (bbox: string) => void;
  /** Single-point mode for detail pages / pickers. */
  single?: boolean;
  /** Picker mode: click places the marker and reports coordinates. */
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  ariaLabel?: string;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function TunisiaMap({ markers, highlightedId, selectedId, onSelect, onBoundsChange, single, onPick, className, ariaLabel }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const markerById = useRef<Map<string, any>>(new Map());
  const userMoved = useRef(false);
  const cb = useRef({ onSelect, onBoundsChange, onPick });
  cb.current = { onSelect, onBoundsChange, onPick };
  // Latest props for code running after the async Leaflet import (avoids stale closures).
  const latest = useRef({ markers, selectedId, highlightedId });
  latest.current = { markers, selectedId, highlightedId };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      (window as any).L = L; // markercluster augments the global L
      await import('leaflet.markercluster');
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current, {
        center: TUNISIA_CENTER,
        zoom: 6,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: L.latLngBounds([[28.5, 5.5], [39, 13.5]]),
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: !single,
      });
      // OpenStreetMap standard tiles: no API key. Darkened with a CSS filter (.ex-osm-dark) to fit the theme.
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'ex-osm-dark',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }).addTo(map);
      if (!single) map.fitBounds(TUNISIA_BOUNDS, { padding: [10, 10] });
      map.on('dragend zoomend', () => {
        if (!userMoved.current) return;
        const b = map.getBounds();
        cb.current.onBoundsChange?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(4)).join(','));
      });
      map.on('mousedown touchstart wheel', () => {
        userMoved.current = true;
      });
      map.on('click', (e: any) => {
        if (cb.current.onPick) cb.current.onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
        else cb.current.onSelect?.(null);
      });
      mapRef.current = map;
      renderMarkers();
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function icon(m: MapMarker, state: 'idle' | 'hover' | 'selected') {
    const L = LRef.current;
    return L.divIcon({
      className: 'ex-pin-wrap',
      html: `<span class="ex-pin ex-pin--${state}" title="${esc(m.title)}">${esc(m.label)}</span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }

  function renderMarkers() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const { markers, selectedId } = latest.current;
    layerRef.current?.remove();
    markerById.current.clear();
    const group = single
      ? L.layerGroup()
      : (L as any).markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 48,
          iconCreateFunction: (c: any) => L.divIcon({ className: 'ex-pin-wrap', html: `<span class="ex-cluster">${c.getChildCount()}</span>`, iconSize: [0, 0] }),
        });
    for (const m of markers) {
      const mk = L.marker([m.lat, m.lng], { icon: icon(m, m.id === selectedId ? 'selected' : 'idle'), keyboard: true, title: m.title, alt: m.title, riseOnHover: true });
      mk.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        cb.current.onSelect?.(m.id);
      });
      markerById.current.set(m.id, mk);
      group.addLayer(mk);
    }
    group.addTo(map);
    layerRef.current = group;
    if (markers.length && !userMoved.current) {
      if (single || markers.length === 1) map.setView([markers[0].lat, markers[0].lng], single ? 13 : 10);
      else map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), { padding: [40, 40], maxZoom: 11 });
    }
  }

  useEffect(() => {
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  // Highlight / selection without rebuilding the layer.
  useEffect(() => {
    if (!LRef.current) return;
    for (const m of markers) {
      const mk = markerById.current.get(m.id);
      if (!mk) continue;
      const state = m.id === selectedId ? 'selected' : m.id === highlightedId ? 'hover' : 'idle';
      mk.setIcon(icon(m, state));
      mk.setZIndexOffset(state === 'idle' ? 0 : 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedId, selectedId, markers]);

  return <div ref={el} role="region" aria-label={ariaLabel ?? 'Carte de la Tunisie'} className={className} style={{ background: '#0b0b0c' }} />;
}
