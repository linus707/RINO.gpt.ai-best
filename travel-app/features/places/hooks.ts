import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryKey } from '@/constants/categories';
import { placeById, type Place } from './data';
import { googleDetails, searchGoogle } from './google';
import { refKey, type PlaceRef, type ResolvedPlace } from './types';

export const ourToResolved = (p: Place): ResolvedPlace => ({
  source: 'our', id: p.id, key: `our:${p.id}`, name: p.name, category: p.category, area: p.area,
  lat: p.lat, lng: p.lng, note: p.note, city: p.city,
});

const gKey = (id: string) => ['gplace', id] as const;
// Google 장소 정보는 앱이 켜져 있는 동안 메모리에만 둔다(기기·DB에 저장하지 않음)
const G_STALE = 30 * 60 * 1000;

/** Google 검색 — 검색 버튼·카테고리를 눌렀을 때만 (글자마다 부르지 않아 비용 절약) */
export function useGoogleSearch(p: { query: string; category?: CategoryKey; center: { lat: number; lng: number }; cityName: string } | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['gsearch', p],
    enabled: !!p,
    staleTime: G_STALE,
    gcTime: G_STALE,
    retry: false,
    queryFn: async () => {
      const list = await searchGoogle(p!);
      // 검색 결과로 받은 정보는 상세 조회 없이 바로 쓴다 (호출 수 절약)
      list.forEach((g) => qc.setQueryData(gKey(g.id), g));
      return list;
    },
  });
}

/** 장소 목록을 화면용 정보로 — 우리 장소는 바로, Google 장소는 메모리에 없을 때만 한꺼번에 불러온다 */
export function useResolvedPlaces(refs: PlaceRef[]) {
  const qc = useQueryClient();
  const googleIds = [...new Set(refs.filter((r) => r.source === 'google').map((r) => r.id))].sort();
  const q = useQuery({
    queryKey: ['gplaces', googleIds.join(',')],
    enabled: googleIds.length > 0,
    staleTime: G_STALE,
    gcTime: G_STALE,
    retry: false,
    queryFn: async () => {
      const missing = googleIds.filter((id) => !qc.getQueryData(gKey(id)));
      if (missing.length) (await googleDetails(missing)).forEach((g) => qc.setQueryData(gKey(g.id), g));
      return Date.now();
    },
  });
  const byKey = new Map<string, ResolvedPlace>();
  for (const r of refs) {
    if (r.source === 'our') {
      const p = placeById(r.id);
      if (p) byKey.set(refKey(r), ourToResolved(p));
    } else {
      const g = qc.getQueryData<ResolvedPlace>(gKey(r.id));
      if (g) byKey.set(refKey(r), g);
    }
  }
  return { byKey, loading: q.isFetching, error: q.error };
}
