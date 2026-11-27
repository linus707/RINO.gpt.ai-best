import type { CategoryKey } from '@/constants/categories';

/**
 * 장소는 두 군데서 온다.
 * - our: 리노가 공식 출처로 확인해 우리 DB에 저장한 장소 (가이드북·추천)
 * - google: 사용자가 검색한 Google 장소 — DB에는 place_id만 저장하고, 이름·주소·좌표는 열 때마다 받아 온다
 */
export type PlaceSource = 'our' | 'google';
export type PlaceRef = { source: PlaceSource; id: string };

export type ResolvedPlace = PlaceRef & {
  key: string;
  name: string;
  category: CategoryKey;
  area: string; // 우리 장소: 동네 / Google: 주소
  lat: number | null;
  lng: number | null;
  note?: string;
  mapsUri?: string | null;
  city?: string;
};

export const refKey = (r: PlaceRef) => `${r.source}:${r.id}`;

/** 화면 주소의 장소 id: 우리 장소는 그대로, Google 장소는 'google:' 접두어 */
export const routeId = (r: PlaceRef) => (r.source === 'our' ? r.id : `google:${r.id}`);
export const fromRouteId = (raw: string): PlaceRef =>
  raw.startsWith('google:') ? { source: 'google', id: raw.slice(7) } : { source: 'our', id: raw };
