import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapPin } from '../../lib/api';
import { brand, formatPrice } from '../../theme/tokens';

/* Vite default marker icon fix */
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Props = {
  center: { lat: number; lng: number; label?: string };
  pins: MapPin[];
  onBboxChange?: (bbox: { north: number; south: number; east: number; west: number }) => void;
  className?: string;
};

/** Phase A FR-SRCH-007 — interactive map SDK (Leaflet/OSM) + search-on-move. */
export function SearchLeafletMap({ center, pins, onBboxChange, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (onBboxChange) {
      const emitBbox = () => {
        const b = map.getBounds();
        onBboxChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      };
      map.on('moveend', () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(emitBbox, 300);
      });
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [center.lat, center.lng, onBboxChange]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds = L.latLngBounds([]);

    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng], { icon: defaultIcon });
      marker.bindPopup(
        `<strong>${pin.code}</strong><br/>${formatPrice(pin.basePrice)}<br/><a href="/public/units/${pin.unitId}">Xem căn</a>`,
      );
      marker.addTo(layer);
      bounds.extend([pin.lat, pin.lng]);
    }

    if (pins.length > 1) {
      map.fitBounds(bounds.pad(0.12));
    } else if (pins.length === 1) {
      map.setView([pins[0]!.lat, pins[0]!.lng], 15);
    } else {
      map.setView([center.lat, center.lng], 14);
    }
  }, [pins, center.lat, center.lng]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: 280, border: `1px solid ${brand.border}` }}
    />
  );
}
