# 리노 트립 — 여행 앱 (Phase 1 뼈대 · Phase 2 일정·동선 · Phase 3-1 로그인)

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
2. SQL Editor에서 `supabase/migrations/` 안의 파일을 **이름 순서대로** 실행하고(`..._init.sql` → `..._itinerary_reorder.sql` → `..._auth_accounts.sql`), 이어서 `supabase/seed.sql`(오사카 샘플)을 실행해요.
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

## Phase 3-1 로그인·가입

**흐름**: 처음엔 가입 없이 익명으로 쓰고 → 여행을 만들면 "가입하기"를 권하고 → 카카오·Apple·이메일을 **지금 계정에 연결**해요. 사용자 id가 그대로라 일정·순서·남은 무료 횟수가 그대로 남아요. 이미 가입된 수단이면 "그 계정으로 로그인할지" 따로 확인해요(이 기기의 가입 전 기록은 옮겨지지 않는다고 안내).

| 확인한 것 (로컬 Supabase 인증 서버 + DB로 실제 실행) | 결과 |
|---|---|
| 익명 → 이메일 코드로 가입, 같은 id 유지, 일정·순서·무료 횟수 그대로 | ✅ |
| 다른 기기에서 같은 이메일 연결 시 "이미 가입됨" 감지 → 기존 계정 로그인 | ✅ |
| 로그아웃하면 새 익명으로 시작, 다시 로그인하면 기록 복원 | ✅ |
| 계정 삭제 서버 함수: 로그인 없으면 거절, 본인 삭제, 기록 함께 삭제 | ✅ |
| 계정 삭제 후에도 결제 기록은 남고 개인 연결만 끊김 (전자상거래법 보관 의무) | ✅ |
| 카카오·Apple 로그인 | ⏳ 아래 콘솔 설정 후 실제 기기에서 확인 필요 |

### 리노가 직접 해야 하는 설정

**① Supabase 대시보드 → Authentication**
1. Sign In / Providers → **Allow anonymous sign-ins** 켜기
2. Sign In / Providers → **Allow manual linking** 켜기 (익명 계정에 카카오·Apple 연결)
3. URL Configuration → Redirect URLs에 추가: `rinotrip://auth/callback`, `exp://**`(Expo Go 개발용), `http://localhost:8081/auth/callback`, 정식 웹 주소의 `/auth/callback`
4. Emails → Templates → **Magic Link**와 **Change Email Address** 본문에 `{{ .Token }}`을 넣기 (예: `인증 코드: {{ .Token }}`) — 앱은 링크 대신 6자리 코드를 입력받아요
5. 정식 공개 전: Emails → SMTP Settings에서 자체 메일 발송 서비스 연결 (기본 메일은 시간당 발송 수가 아주 적어요)

**② 카카오 로그인** ([developers.kakao.com](https://developers.kakao.com))
1. 내 애플리케이션 → 앱 만들기 → REST API 키 확인
2. 카카오 로그인 → 활성화, Redirect URI에 `https://<프로젝트>.supabase.co/auth/v1/callback` 등록
3. 동의항목: 닉네임·프로필 사진, **카카오계정(이메일)** — 이메일 동의항목은 비즈 앱 전환이 필요할 수 있어요
4. 보안 → Client Secret 생성·사용 설정
5. Supabase → Providers → Kakao: Client ID = REST API 키, Secret = Client Secret

**③ Apple 로그인** (Apple Developer Program 가입 필요)
1. Certificates, Identifiers & Profiles → App ID `com.rino.trip`에 Sign in with Apple 켜기
2. 웹·Android용: Services ID 만들고 Return URL에 `https://<프로젝트>.supabase.co/auth/v1/callback`, 키(.p8) 생성
3. Supabase → Providers → Apple: Client IDs에 `com.rino.trip`(아이폰 앱)과 Services ID를 함께, Secret Key는 키로 만든 값
4. 아이폰의 Apple 기본 로그인 창은 개발 빌드(`eas build --profile development`)에서 확인해요

**④ 계정 삭제 서버 함수 배포**
```bash
npx supabase functions deploy delete-account
```

## Phase 2 완료 기준 체크리스트

| 항목 | 상태 | 확인 방법 |
|---|---|---|
| 일정에 장소 추가 | ✅ | 장소 탐색·장소 상세에서 "N일차에 담기", 같은 날 중복은 막음 |
| 끌어서 순서 바꾸기 | ✅ | 손잡이(⋮⋮)를 끌면 순서 변경, 화면 읽기 프로그램은 '위로/아래로 이동' |
| 껐다 켜도 일정이 남아 있다 | ✅ | 새로고침 후 같은 순서 유지 (데모: 기기 저장, 서버: Supabase) |
| 순서를 바꾸면 지도가 즉시 따라 바뀐다 | ✅ | 일정과 지도가 같은 데이터를 공유, 화면 먼저 반영 후 저장 |
| 날짜별 번호 핀과 동선 선 | ✅ | 날짜 탭을 바꾸면 그날 핀·선만 표시 |
| 웹에서도 같은 순서가 보인다 | ✅ | 웹은 Leaflet 지도, 앱은 react-native-maps — 같은 props |
| 남의 일정은 못 바꾼다 | ✅ | PostgreSQL에서 다른 사용자의 추가·삭제·순서 변경이 막히는 것 확인 |

이 단계에서 **하지 않은 것**(설계서 기준): 이동 시간 숫자 표시, 동선 자동 최적화 — 지도 제공자 조건·비용을 확인한 뒤 별도 단계로.

### 지도 설정
- **아이폰**: Apple 지도라 키가 필요 없어요.
- **Android**: Expo Go 개발 중에는 키 없이 열려요. 정식 빌드(EAS) 전에 Google Cloud에서 Maps SDK for Android 키를 만들고 패키지 이름(`com.rino.trip`)으로 제한한 뒤, `ANDROID_GOOGLE_MAPS_API_KEY`에 넣어요(`app.config.ts`가 읽어요).
- **웹**: Leaflet + OpenStreetMap 공개 타일이에요. 공개 타일은 개발·소량용이라, 정식 공개 전에 지도 제공자를 정해 `components/MapView.web.tsx`의 타일 주소만 바꾸면 돼요.

## 폴더 구조 (설계서 9장)

```
app/                  화면 (Expo Router, 파일 이름 = 주소) · login.tsx(로그인·가입), auth/callback.tsx(소셜 로그인 복귀)
  (tabs)/             index(홈) itinerary(일정) map(지도) store(가이드북) mypage(마이페이지)
  trip/new.tsx        여행 만들기 (무료 1회 차감 지점)
  place/search.tsx    장소 탐색        place/[id].tsx  장소 상세
  guidebook/[id]/     index(상세·미리보기) course(구매 후 코스)
  login.tsx           로그인 틀
components/           공통 UI (버튼, 카드, 횟수 배지, 빈 상태, 잠금, 여행 가방 그림)
                      MapView.tsx(앱 지도) / MapView.web.tsx(웹 지도), DraggableList(끌어서 순서 바꾸기)
features/             기능 로직 (trips, places, guidebooks, usage, purchases, auth)
lib/                  supabase.ts, maps.ts, iap.ts, env.ts
stores/               Zustand (선택한 여행·일차, 데모 저장소)
constants/            design.ts(토큰), categories.ts(장소 카테고리 6개)
supabase/             migrations(테이블·함수·가입 처리), seed.sql(오사카 샘플), functions/delete-account(계정 삭제)
```

## 핵심 규칙 (코드에 반영됨)

- **무료 횟수는 서버가 판정**해요. 앱은 `create_trip` 서버 함수만 부르고, 횟수 확인·차감·저장은 서버에서 한 번에 처리해요. 앱에서 직접 여행을 추가할 수 없게 막아 두었어요.
- **가이드북 열람 권한**도 서버(`purchases`, 검증된 영수증)로만 판정해요. 미리보기(1일차)는 로그인 없이 볼 수 있어요.
- **빨강은 브랜드·잠금·오류에만** 쓰고, 버튼과 선택 상태는 모두 파랑이에요.
- 장소의 영업시간·입장료는 **공식 출처 확인값과 확인일**이 있을 때만 보여 줘요. 지금 장소는 모두 샘플이에요.

## 다음 단계

- **Phase 3**: 장소 검색 API, 카테고리 6개 검색, 저장(하트), 숙소 후보 비교
- **Phase 4**: 가이드북 인앱결제(앱) / 외부 결제(웹), 영수증 서버 검증, 내 일정으로 불러오기
- **폰트**: 제목 잘난체, 본문 Pretendard 파일을 `assets/fonts`에 넣고 `expo-font`로 불러오기. 잘난체는 상업용 라이선스 조건을 먼저 확인해 주세요.

## 자주 쓰는 명령

```bash
npm run typecheck     # 타입 검사
npm run export:web    # 웹 정적 빌드 (dist/)
npx expo-doctor       # 설정 점검
```
