# 리노 트립 — 여행 앱 뼈대 (Phase 1)

아이폰 · 안드로이드 · 웹을 **코드 하나**로 만드는 여행 앱의 뼈대예요.
구조 설계서(`travel-app-architecture.docx`) 11장 Phase 1 범위를 그대로 옮겼고, 디자인은 **D안(레드 배너 & 블루 버튼)**, 홈 화면 배치는 참고 코드(가운데 큰 헤드라인 + 버튼 하나 + 카테고리 줄 + 썸네일 카드)를 따랐어요.

> 앱 이름 "리노 트립"은 임시예요(설계서 13장: 앱 이름·아이콘 미정).

## 바로 실행해 보기

```bash
cd travel-app
npm install
npx expo start
```

- **아이폰·안드로이드**: 폰에 Expo Go 앱을 깔고, 터미널에 뜬 QR 코드를 찍으면 열려요.
- **웹**: 터미널에서 `w` 키를 누르면 브라우저에서 열려요.
- `.env`가 없으면 **데모 모드**로 동작해요. 서버 없이 이 기기에만 저장되고, 무료 5회 차감까지 그대로 체험할 수 있어요.

## 서버(Supabase) 연결하기

1. [supabase.com](https://supabase.com)에서 프로젝트를 만들어요.
2. SQL Editor에서 `supabase/migrations/20261127000000_init.sql`을 실행하고, 이어서 `supabase/seed.sql`(오사카 샘플)을 실행해요.
3. Authentication → Sign In / Providers에서 **Anonymous sign-ins**를 켜요. 로그인 전에도 사용자별로 무료 횟수를 세기 위해서예요.
4. `.env.example`을 복사해 `.env`를 만들고, Project URL과 anon(공개) 키를 넣어요.
5. `npx expo start`를 다시 실행하면 데모 모드 표시가 사라져요.

> 비밀 키(service_role 키, 결제 검증 키)는 앱 코드나 `.env`에 넣지 말고 Supabase Edge Functions에만 두세요.

## Phase 1 완료 기준 체크리스트

| 항목 | 상태 | 확인 방법 |
|---|---|---|
| 프로젝트·환경 (Expo + TS + Router, 폴더 구조, .env.example) | ✅ | iOS·Android 번들, 웹 빌드 성공 |
| 네비게이션 (하단 탭 5개, 넓은 화면은 사이드바) | ✅ | 폭 900px 이상이면 왼쪽 사이드바 |
| 화면 틀 7개 + 빈 상태 | ✅ | 모든 화면에 제목·빈 상태·다음 버튼 |
| 디자인 토큰 (`constants/design.ts`) | ✅ | 색·글자·간격은 토큰만 사용 |
| 데이터 틀 (Supabase 연결, 테이블 SQL, 로그인 틀) | ✅ | SQL은 PostgreSQL 16에서 실행 검증 |
| 무료 5회 틀 (서버 판정, 차감, 0회 안내) | ✅ | 5회 뒤 6번째 생성은 서버가 거절 |
| 오사카 샘플 자리 (카드, 잠금, 첫날 미리보기) | ✅ | 샘플 표시 포함 |

## 폴더 구조 (설계서 9장)

```
app/                  화면 (Expo Router, 파일 이름 = 주소)
  (tabs)/             index(홈) itinerary(일정) map(지도) store(가이드북) mypage(마이페이지)
  trip/new.tsx        여행 만들기 (무료 1회 차감 지점)
  place/search.tsx    장소 탐색        place/[id].tsx  장소 상세
  guidebook/[id]/     index(상세·미리보기) course(구매 후 코스)
  login.tsx           로그인 틀
components/           공통 UI (버튼, 카드, 횟수 배지, 빈 상태, 잠금, 지도 자리, 여행 가방 그림)
features/             기능 로직 (trips, places, guidebooks, usage, purchases)
lib/                  supabase.ts, maps.ts, iap.ts, env.ts
stores/               Zustand (선택한 여행·일차, 데모 저장소)
constants/            design.ts(토큰), categories.ts(장소 카테고리 6개)
supabase/             migrations(테이블 SQL), seed.sql(오사카 샘플)
```

## 핵심 규칙 (코드에 반영됨)

- **무료 횟수는 서버가 판정**해요. 앱은 `create_trip` 서버 함수만 부르고, 횟수 확인·차감·저장은 서버에서 한 번에 처리해요. 앱에서 직접 여행을 추가할 수 없게 막아 두었어요.
- **가이드북 열람 권한**도 서버(`purchases`, 검증된 영수증)로만 판정해요. 미리보기(1일차)는 로그인 없이 볼 수 있어요.
- **빨강은 브랜드·잠금·오류에만** 쓰고, 버튼과 선택 상태는 모두 파랑이에요.
- 장소의 영업시간·입장료는 **공식 출처 확인값과 확인일**이 있을 때만 보여 줘요. 지금 장소는 모두 샘플이에요.

## 다음 단계

- **Phase 2**: 일정에 장소 담기, 드래그로 순서 바꾸기, `components/MapView`를 실제 지도로 교체(`MapView.web.tsx` 분리)
- **Phase 3**: 장소 검색 API, 카테고리 6개 검색, 저장(하트), 숙소 후보 비교
- **Phase 4**: 가이드북 인앱결제(앱) / 외부 결제(웹), 영수증 서버 검증, 내 일정으로 불러오기
- **폰트**: 제목 잘난체, 본문 Pretendard 파일을 `assets/fonts`에 넣고 `expo-font`로 불러오기. 잘난체는 상업용 라이선스 조건을 먼저 확인해 주세요.

## 자주 쓰는 명령

```bash
npm run typecheck     # 타입 검사
npm run export:web    # 웹 정적 빌드 (dist/)
npx expo-doctor       # 설정 점검
```
