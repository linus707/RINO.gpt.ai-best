/** 여행 만들기에서 고르는 도시와 지도 기본 중심 (핀이 없을 때) */
export const CITIES = [
  { name: '오사카', lat: 34.6687, lng: 135.5013 },
  { name: '도쿄', lat: 35.6812, lng: 139.7671 },
  { name: '후쿠오카', lat: 33.5902, lng: 130.4017 },
  { name: '방콕', lat: 13.7563, lng: 100.5018 },
  { name: '파리', lat: 48.8566, lng: 2.3522 },
] as const;

export const cityCenter = (name: string) => CITIES.find((c) => c.name === name) ?? CITIES[0];
