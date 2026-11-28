/**
 * 가이드북 — 첫 상품은 오사카 3박 4일 (확정). 가격은 미정이라 넣지 않는다.
 * 서버가 연결되면 guidebooks·guidebook_days(목차)·guidebook_stops(코스, 잠금)에서 불러오고,
 * 이 파일의 내용은 데모 모드와 서버가 비었을 때의 기본값으로만 쓴다.
 */
export type GuidebookStop = { day: number; order: number; placeId: string; tip: string };
export type Guidebook = {
  id: string; city: string; title: string; theme: string; days: number;
  previewDays: number; // 무료로 열리는 일수
  toc: string[]; // 일차별 제목 (누구나 보임)
  stops: GuidebookStop[]; // 볼 수 있는 코스 장소 (미보유면 미리보기 일차만)
  iosProductId: string | null; androidProductId: string | null;
  isSample: boolean;
};

const OSAKA_STOPS: GuidebookStop[] = [
  { day: 1, order: 0, placeId: 'osk-namba-stay', tip: '첫날은 난바 권역에 짐을 풀면 공항 열차와 저녁 동선이 짧아져요.' },
  { day: 1, order: 1, placeId: 'osk-dotonbori', tip: '해가 진 뒤 강 건너편 다리에서 간판이 물에 비치는 구도로 찍어 보세요.' },
  { day: 1, order: 2, placeId: 'osk-shinsaibashi', tip: '아케이드라 비 오는 날 대체 코스로도 좋아요.' },
  { day: 2, order: 0, placeId: 'osk-castle', tip: '천수각 입장 여부와 시간은 방문 전 공식 사이트에서 확인하세요.' },
  { day: 2, order: 1, placeId: 'osk-nakazakicho', tip: '골목 카페가 모여 있어 오후 휴식 지점으로 넣었어요.' },
  { day: 3, order: 0, placeId: 'osk-umeda-sky', tip: '해 질 녘 30분 전에 올라가면 낮·노을·야경을 한 번에 담을 수 있어요.' },
  { day: 3, order: 1, placeId: 'osk-shinsekai', tip: '네온 간판은 아이폰 야간 모드보다 노출을 살짝 낮추는 편이 선명해요.' },
  { day: 4, order: 0, placeId: 'osk-kuromon', tip: '출국 전 아침 식사 코스. 공항 가는 열차 시간을 먼저 정하고 움직이세요.' },
];

export const GUIDEBOOKS: Guidebook[] = [
  {
    id: 'osaka-3n4d', city: '오사카', title: '오사카 3박 4일', theme: '먹고 걷고 찍는 첫 오사카', days: 4, previewDays: 1,
    toc: ['난바 도착과 도톤보리 밤', '오사카성과 강변 산책', '우메다 전망과 신세카이 네온', '시장 아침 후 출국'],
    stops: OSAKA_STOPS,
    iosProductId: null, androidProductId: null, isSample: true,
  },
];

export const guidebookById = (id: string) => GUIDEBOOKS.find((g) => g.id === id);

/** 데모에서 쓰는 이용권 코드 (서버 모드에서는 관리자가 만든 코드만 통함) */
export const DEMO_CODE = 'DEMO-OSAKA';
