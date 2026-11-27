import type { CategoryKey } from '@/constants/categories';

/**
 * 오사카 샘플 장소 — 화면 확인용. Phase 3에서 장소 API와 places 테이블로 바뀐다.
 * 영업시간·입장료는 공식 출처로 확인한 값만 확인일과 함께 저장한다(지금은 없음).
 */
export type Place = {
  id: string; city: string; name: string; category: CategoryKey; area: string; lat: number; lng: number;
  note: string; source: 'sample' | 'official'; verifiedAt: string | null;
};

export const SAMPLE_PLACES: Place[] = [
  { city: '오사카', id: 'osk-dotonbori', name: '도톤보리', category: 'attraction', area: '난바', lat: 34.6687, lng: 135.5013, note: '공식 일정 확인 전', source: 'sample', verifiedAt: null },
  { city: '오사카', id: 'osk-kuromon', name: '구로몬 시장', category: 'food', area: '닛폰바시', lat: 34.6652, lng: 135.5066, note: '대표 메뉴: 해산물 꼬치', source: 'sample', verifiedAt: null },
  { city: '오사카', id: 'osk-shinsaibashi', name: '신사이바시스지', category: 'shop', area: '신사이바시', lat: 34.6748, lng: 135.5012, note: '일정 근처 쇼핑 거리', source: 'sample', verifiedAt: null },
  { city: '오사카', id: 'osk-castle', name: '오사카성 공원', category: 'attraction', area: '모리노미야', lat: 34.6873, lng: 135.5262, note: '공식 일정 확인 전', source: 'sample', verifiedAt: null },
  { city: '오사카', id: 'osk-umeda-sky', name: '우메다 스카이빌딩', category: 'photo', area: '우메다', lat: 34.7053, lng: 135.4896, note: '촬영 팁: 해 질 녘 전망대', source: 'sample', verifiedAt: null },
  { city: '오사카', id: 'osk-nakazakicho', name: '나카자키초 골목 카페', category: 'cafe', area: '나카자키초', lat: 34.7088, lng: 135.504, note: '동선 중 휴식 지점', source: 'sample', verifiedAt: null },
  { city: '오사카', id: 'osk-namba-stay', name: '난바 권역 숙소', category: 'stay', area: '난바', lat: 34.6655, lng: 135.501, note: '교통 중심, 첫날·마지막 날 이동이 짧음', source: 'sample', verifiedAt: null },
  { city: '오사카', id: 'osk-shinsekai', name: '츠텐카쿠·신세카이', category: 'photo', area: '신세카이', lat: 34.6525, lng: 135.5063, note: '촬영 팁: 네온 간판, 야간 모드', source: 'sample', verifiedAt: null },
];

export const placeById = (id: string) => SAMPLE_PLACES.find((p) => p.id === id);
