/** 두 지점 사이 직선 거리(km) — 이동 시간이 아니라 '얼마나 가까운지' 비교용 */
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 숙소에서 그날 장소들까지 평균 직선 거리 */
export function avgKm(stay: { lat: number; lng: number }, points: { lat: number; lng: number }[]) {
  if (!points.length) return null;
  return points.reduce((sum, p) => sum + km(stay, p), 0) / points.length;
}

export const fmtKm = (v: number) => (v < 1 ? `${Math.round(v * 1000)}m` : `${v.toFixed(1)}km`);
