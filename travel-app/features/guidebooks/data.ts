/**
 * 가이드북 — 첫 상품은 오사카 3박 4일 (확정). 가격은 미정이라 넣지 않는다.
 * Phase 1: 카드·목차·미리보기 틀만. 실제 코스 내용과 상품 ID는 Phase 4에서 guidebooks 테이블로.
 */
export type Guidebook = {
  id: string; city: string; title: string; theme: string; days: number;
  previewDays: number; // 무료로 열리는 일수
  toc: string[];
  previewPlaceIds: string[]; // 1일차 미리보기
  iosProductId: string | null; androidProductId: string | null;
  isSample: boolean;
};

export const GUIDEBOOKS: Guidebook[] = [
  {
    id: 'osaka-3n4d', city: '오사카', title: '오사카 3박 4일', theme: '먹고 걷고 찍는 첫 오사카', days: 4, previewDays: 1,
    toc: ['난바 도착과 도톤보리 밤', '오사카성과 강변 산책', '우메다 전망과 신세카이 네온', '시장 아침 후 출국'],
    previewPlaceIds: ['osk-namba-stay', 'osk-dotonbori', 'osk-shinsaibashi'],
    iosProductId: null, androidProductId: null, isSample: true,
  },
];

export const guidebookById = (id: string) => GUIDEBOOKS.find((g) => g.id === id);
