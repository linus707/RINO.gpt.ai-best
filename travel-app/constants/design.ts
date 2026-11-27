/**
 * 디자인 토큰 — 모든 화면은 이 값만 쓴다. (설계서 10장, D안: 레드 배너 & 블루 버튼)
 * 규칙: 빨강(brand)은 브랜드 포인트·잠금·오류에만, 모든 행동 버튼은 파랑(action).
 * 카드는 그림자 없이 평평하게, 썸네일과 글자로만 구분한다.
 */
export const color = {
  bg: '#FFFFFF',
  surface: '#F5F5F5', // 입력창·카드 바탕
  line: '#E6E6E6',
  ink: '#222222', // 본문 글자
  sub: '#8B8B8B', // 보조 글자
  faint: '#BBBBBB',
  brand: '#F7323F', // 브랜드 빨강 — 배너·강조 단어
  brandSoft: '#FFF5F5',
  action: '#1D8BFF', // 버튼·선택 상태
  actionPressed: '#006CE0',
  actionSoft: '#F2F8FF',
  danger: '#F94239', // 오류·잠금·할인
  rating: '#FFB803',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

/** 글자 크기(pt): 제목 22 / 소제목 17 / 본문 15 / 보조 13. display는 홈 헤드라인 전용 */
export const font = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.4 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.2 },
  bodyBold: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, letterSpacing: -0.1 },
} as const;
// 글꼴: 제목 잘난체 / 본문 Pretendard 예정. assets/fonts에 넣고 expo-font로 불러오면 된다(라이선스 확인 후).

/** 간격은 4의 배수만 */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 } as const;

/** 넓은 화면(PC 웹) 기준 폭 — 이보다 넓으면 사이드바 + 가운데 정렬 콘텐츠 */
export const layout = { wideBreakpoint: 900, contentMaxWidth: 960 } as const;
