'use client';

/**
 * Interactive map of Tunisia (Leaflet + marker clustering, OpenStreetMap tiles — no API key).
 * Markers are built ONLY from real coordinates supplied by the API; nothing is ever geocoded or guessed.
 * Leaflet is loaded on the client only (dynamic import), so the map costs nothing on the server render.
 */
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'maplibre-gl/dist/maplibre-gl.css';

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

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const OFM_ATTR = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM_ATTR;

/** Labels in French / Latin script (the default style prints Latin + Arabic side by side). */
function frenchLabels(style: any) {
  for (const layer of style.layers ?? []) {
    const tf = layer.layout?.['text-field'];
    if (tf && JSON.stringify(tf).includes('name')) {
      layer.layout['text-field'] = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']];
    }
  }
  return style;
}

let styleCache: Promise<any> | null = null;

/**
 * Basemap: OpenFreeMap "Liberty" vector tiles (free, no API key, commercial use allowed) rendered by MapLibre
 * inside Leaflet. Falls back to OpenStreetMap raster tiles if WebGL or the style is unavailable.
 */
async function addBasemap(L: any, map: any) {
  try {
    const hasWebGL = (() => {
      try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
      } catch {
        return false;
      }
    })();
    if (!hasWebGL) throw new Error('no webgl');
    const mod: any = await import('maplibre-gl');
    const maplibregl = mod.default ?? mod;
    (window as any).maplibregl = maplibregl;
    await import('@maplibre/maplibre-gl-leaflet');
    styleCache ??= fetch('https://tiles.openfreemap.org/styles/liberty').then((r) => {
      if (!r.ok) throw new Error('style');
      return r.json();
    });
    const style = frenchLabels(structuredClone(await styleCache));
    (L as any).maplibreGL({ style, attributionControl: false }).addTo(map);
    map.attributionControl.addAttribution(OFM_ATTR);
  } catch {
    styleCache = null;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: OSM_ATTR }).addTo(map);
  }
}

/** "Ma position" control: asks the browser for the visitor's location and shows it (never stored or sent). */
function addLocateControl(L: any, map: any) {
  let dot: any = null;
  let ring: any = null;
  const Ctl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const wrap = L.DomUtil.create('div', 'leaflet-bar ex-locate');
      const btn = L.DomUtil.create('a', '', wrap);
      btn.href = '#';
      btn.title = 'Afficher ma position';
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-label', 'Afficher ma position');
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/></svg>';
      L.DomEvent.disableClickPropagation(wrap);
      L.DomEvent.on(btn, 'click', (e: Event) => {
        L.DomEvent.preventDefault(e);
        if (!navigator.geolocation) return alertless(btn, 'Géolocalisation indisponible');
        btn.classList.add('ex-locate--busy');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            btn.classList.remove('ex-locate--busy');
            const ll = [pos.coords.latitude, pos.coords.longitude];
            dot?.remove();
            ring?.remove();
            ring = L.circle(ll, { radius: Math.min(pos.coords.accuracy, 3000), color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12, interactive: false }).addTo(map);
            dot = L.circleMarker(ll, { radius: 7, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map).bindTooltip('Vous êtes ici', { direction: 'top', offset: [0, -8] });
            map.setMaxBounds(null);
            map.flyTo(ll, Math.max(map.getZoom(), 11), { duration: 0.8 });
          },
          (err) => {
            btn.classList.remove('ex-locate--busy');
            alertless(btn, err.code === 1 ? 'Autorisez la localisation dans votre navigateur' : 'Position introuvable');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });
      return wrap;
    },
  });
  new Ctl().addTo(map);
}

/** Small inline message next to the control (no blocking browser dialogs). */
function alertless(btn: HTMLElement, text: string) {
  btn.title = text;
  btn.setAttribute('aria-label', text);
  btn.classList.add('ex-locate--error');
  setTimeout(() => btn.classList.remove('ex-locate--error'), 2500);
}

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
      // Register immediately so an unmount during the async basemap load still removes this map.
      mapRef.current = map;
      await addBasemap(L, map);
      if (cancelled) return;
      addLocateControl(L, map);
      if (!single) map.fitBounds(TUNISIA_BOUNDS, { padding: [10, 10] });
      // The container may not have its final size yet (sticky / hidden panels): re-measure, then re-fit.
      const refit = () => {
        if (cancelled || mapRef.current !== map) return;
        map.invalidateSize();
        if (!userMoved.current && !latest.current.markers.length && !single) map.fitBounds(TUNISIA_BOUNDS, { padding: [10, 10] });
      };
      setTimeout(refit, 250);
      if (typeof ResizeObserver !== 'undefined' && el.current) {
        let wasHidden = el.current.clientWidth === 0 || el.current.clientHeight === 0;
        const ro = new ResizeObserver(() => {
          if (cancelled || mapRef.current !== map) return;
          map.invalidateSize();
          const hidden = !el.current || el.current.clientWidth === 0 || el.current.clientHeight === 0;
          // Shown after being hidden (mobile "Voir la carte", layout toggle): re-frame on the markers.
          if (wasHidden && !hidden && !userMoved.current) renderMarkers();
          wasHidden = hidden;
        });
        ro.observe(el.current);
        map.on('unload', () => ro.disconnect());
      }
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
