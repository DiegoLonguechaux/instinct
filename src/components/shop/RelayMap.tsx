'use client';

import * as maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';

export type MapPoint = {
  code: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

type RelayMapProps = {
  points: MapPoint[];
  selectedCode: string | null;
  center: { lat: number; lng: number } | null;
  onSelect: (code: string) => void;
};

// Épingles dessinées en CSS : pas d'image à servir, et la couleur suit la charte du site.
function stylePin(element: HTMLElement, selected: boolean) {
  const size = selected ? 30 : 22;
  Object.assign(element.style, {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '9999px',
    border: '3px solid #fff',
    background: selected ? '#9D75A6' : '#111',
    boxShadow: `0 0 0 ${selected ? 3 : 1}px #9D75A6, 0 2px 8px rgba(0,0,0,.8)`,
    cursor: 'pointer',
    zIndex: selected ? '2' : '1',
  });
}

function popupContent(point: MapPoint) {
  // textContent : les noms viennent du transporteur, jamais injectés en HTML.
  const root = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = point.name;
  const address = document.createElement('div');
  address.textContent = `${point.street}, ${point.postalCode} ${point.city}`;
  root.append(name, address);
  return root;
}

const positionsOf = (points: MapPoint[]) =>
  points.filter((point) => point.latitude !== null && point.longitude !== null);

export default function RelayMap({ points, selectedCode, center, onSelect }: RelayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; element: HTMLElement }>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Création de la carte (une seule fois).
  useEffect(() => {
    let cancelled = false;
    let map: maplibregl.Map | null = null;

    (async () => {
      try {
        const response = await fetch('/map/dark-matter.json');
        const style = (await response.json()) as StyleSpecification;
        // Le sprite doit être une URL absolue ; il est servi depuis /public/map.
        style.sprite = `${window.location.origin}/map/sprite`;
        if (cancelled || !containerRef.current) return;

        // Le bundler ne sait pas résoudre le worker de MapLibre 6 : on le sert depuis /public/map
        // (copié par scripts/copy-maplibre-worker.mjs).
        maplibregl.setWorkerUrl(`${window.location.origin}/map/maplibre-gl-worker.mjs`);

        map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: [2.35, 46.6],
          zoom: 5,
          attributionControl: false,
          // Sur mobile : deux doigts pour la carte, un doigt fait défiler la page.
          cooperativeGestures: true,
          locale: { 'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + molette pour zoomer', 'CooperativeGesturesHandler.MacHelpText': '⌘ + molette pour zoomer', 'CooperativeGesturesHandler.MobileHelpText': 'Utilisez deux doigts pour déplacer la carte' },
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
        map.addControl(
          new maplibregl.AttributionControl({
            compact: true,
            customAttribution:
              '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
          }),
          'bottom-right'
        );
        map.on('load', () => {
          if (!cancelled) {
            mapRef.current = map;
            setMapReady(true);
          }
        });
      } catch {
        // Pas de WebGL ou style injoignable : la liste suffit, on masque simplement la carte.
        if (!cancelled) setFailed(true);
      }
    })();

    const markers = markersRef.current;
    return () => {
      cancelled = true;
      markers.clear();
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  // Épingles + cadrage sur tous les points.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const markers = markersRef.current;
    markers.forEach(({ marker }) => marker.remove());
    markers.clear();

    const bounds = new maplibregl.LngLatBounds();
    const created: maplibregl.Marker[] = [];

    for (const point of positionsOf(points)) {
      const lngLat: [number, number] = [point.longitude as number, point.latitude as number];
      const element = document.createElement('button');
      element.type = 'button';
      element.setAttribute('aria-label', `${point.name}, ${point.street}, ${point.city}`);
      stylePin(element, false);

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 18, className: 'relay-popup' }).setDOMContent(
        popupContent(point)
      );
      element.addEventListener('mouseenter', () => popup.setLngLat(lngLat).addTo(map));
      element.addEventListener('mouseleave', () => popup.remove());
      element.addEventListener('click', (event) => {
        event.preventDefault();
        onSelectRef.current(point.code);
      });

      const marker = new maplibregl.Marker({ element }).setLngLat(lngLat).addTo(map);
      markers.set(point.code, { marker, element });
      created.push(marker);
      bounds.extend(lngLat);
    }

    let userMarker: maplibregl.Marker | null = null;
    if (center) {
      const dot = document.createElement('div');
      Object.assign(dot.style, {
        width: '16px',
        height: '16px',
        borderRadius: '9999px',
        background: '#3b82f6',
        border: '3px solid #fff',
        boxShadow: '0 0 0 4px rgba(59,130,246,.35)',
      });
      dot.title = 'Vous êtes ici';
      userMarker = new maplibregl.Marker({ element: dot }).setLngLat([center.lng, center.lat]).addTo(map);
      bounds.extend([center.lng, center.lat]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 0 });
    }

    return () => {
      created.forEach((marker) => marker.remove());
      userMarker?.remove();
    };
  }, [mapReady, points, center]);

  // Point choisi : mis en évidence et recentré.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    markersRef.current.forEach(({ element }, code) => stylePin(element, code === selectedCode));
    const selected = positionsOf(points).find((point) => point.code === selectedCode);
    if (selected) {
      map.easeTo({ center: [selected.longitude as number, selected.latitude as number], duration: 400 });
    }
  }, [mapReady, points, selectedCode]);

  if (failed || positionsOf(points).length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Carte des points relais"
      className="relay-map h-72 w-full border border-instinct-foreground/30 md:h-[30rem]"
    />
  );
}
