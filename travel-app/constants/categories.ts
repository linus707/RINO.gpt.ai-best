/** 장소 카테고리 6개 — 일정·지도·탐색 전 화면에서 같은 아이콘·색을 쓴다 (설계서 6장) */
export type CategoryKey = 'attraction' | 'food' | 'stay' | 'cafe' | 'shop' | 'photo';

export const CATEGORIES: { key: CategoryKey; label: string; color: string; icon: string }[] = [
  { key: 'attraction', label: '관광지', color: '#376DFA', icon: 'M12 1c.6 5.6 4.4 10.4 11 11-6.6.6-10.4 5.4-11 11-.6-5.6-4.4-10.4-11-11 6.6-.6 10.4-5.4 11-11Z' },
  { key: 'food', label: '맛집', color: '#FF7A00', icon: 'M2 11h20a10 10 0 0 1-20 0Zm5-8c1 2-1 3 0 5m5-5c1 2-1 3 0 5m5-5c1 2-1 3 0 5' },
  { key: 'stay', label: '숙소', color: '#8B5CF6', icon: 'M2 11 12 3l10 8v10a1 1 0 0 1-1 1h-6v-7H9v7H3a1 1 0 0 1-1-1Z' },
  { key: 'cafe', label: '카페', color: '#A0522D', icon: 'M3 7h14v8a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6Zm14 2h2a3 3 0 0 1 0 6h-2' },
  { key: 'shop', label: '쇼핑', color: '#0CA954', icon: 'M4 7h16l-1 14H5Zm4 0a4 4 0 0 1 8 0' },
  { key: 'photo', label: '촬영 스팟', color: '#E83E8C', icon: 'M3 8h4l2-3h6l2 3h4v12H3Zm9 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z' },
];

export const categoryOf = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)!;
