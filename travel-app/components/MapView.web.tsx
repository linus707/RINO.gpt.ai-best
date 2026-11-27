import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { color, radius } from '@/constants/design';
import { DEFAULT_CENTER, ROUTE_DASH, type MapViewProps } from '@/lib/maps';

/**
 * 웹 지도 — Leaflet + OpenStreetMap 타일. 화면 코드는 앱과 같은 props만 넘긴다.
 * OpenStreetMap 공개 타일은 개발·소량용이다. 정식 공개 전에는 지도 제공자를 정해 타일 주소만 바꾼다.
 */
export function MapView({ pins, onPinPress, height = 320, emptyCenter = DEFAULT_CENTER }: MapViewProps) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const press = useRef(onPinPress);
  press.current = onPinPress;

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([emptyCenter.lat, emptyCenter.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = pins.map((p) => `${p.id}:${p.order}`).join(',');
  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const latlngs = pins.map((p) => L.latLng(p.lat, p.lng));
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: color.action, weight: 3, dashArray: ROUTE_DASH.join(' '), lineCap: 'round' }).addTo(g);
    }
    pins.forEach((p) => {
      const icon = L.divIcon({
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        // 숫자와 정해진 색만 들어간다 (사용자 입력 없음)
        html: `<div style="width:28px;height:28px;border-radius:14px;border:2.5px solid #fff;box-sizing:border-box;background:${p.color};color:#fff;font:700 12px/23px system-ui,sans-serif;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.25)">${Number(p.order)}</div>`,
      });
      L.marker([p.lat, p.lng], { icon, title: `${p.order}번 ${p.label}`, keyboard: true })
        .on('click', () => press.current?.(p.id))
        .addTo(g);
    });
    if (latlngs.length > 1) m.fitBounds(L.latLngBounds(latlngs), { padding: [48, 48], maxZoom: 16 });
    else if (latlngs.length === 1) m.setView(latlngs[0], 15);
    else m.setView([emptyCenter.lat, emptyCenter.lng], 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div
      ref={box}
      data-testid="route-map"
      style={{ height, borderRadius: radius.lg, overflow: 'hidden', background: color.surface, position: 'relative', zIndex: 0 }}
    />
  );
}
