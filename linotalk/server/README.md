# 리노톡 프록시 서버

앱과 키보드가 번역·회화를 요청하는 작은 서버입니다. 이 서버가 대신 Claude API를 부르기 때문에, **앱 안에는 API 키가 들어가지 않습니다.**

- 실행 환경: Cloudflare Workers
- 번역 모델: `claude-haiku-5-5` (`wrangler.toml`의 `MODEL`에서 변경 가능)
- 입력 내용은 저장하지도, 로그에 남기지도 않습니다. 로그에는 글자 수·언어·걸린 시간·결과 코드만 남습니다.

## 폴더 안내

| 파일 | 하는 일 |
|---|---|
| `src/index.js` | 서버 시작점 |
| `src/app.js` | 요청 처리 흐름 (인증 → 요청 제한 → 입력 검사 → 모델 호출 → 결과 검사) |
| `src/auth.js` | 앱 토큰 확인 |
| `src/ratelimit.js` | 요청 제한 (기기당 분당 40회, IP당 분당 120회) |
| `src/schema.js` | 입력·출력 형식 검사 |
| `src/prompts.js` | 모델에게 주는 지시문, 회화 상황 목록 |
| `src/model.js` | Claude API 호출 |
| `test/app.test.js` | 테스트 (가짜 모델 사용, API 키 불필요) |

## 1. 테스트 돌리기 (API 키 없이 가능)

```bash
cd linotalk/server
```

```bash
npm install
```

```bash
npm test
```

`# pass 23`, `# fail 0`이 보이면 성공입니다.

## 2. 내 컴퓨터에서 실행하기

1. `.dev.vars.example` 파일을 복사해 `.dev.vars`라는 이름으로 만듭니다.
2. `.dev.vars`를 열어 두 값을 채웁니다.
   - `ANTHROPIC_API_KEY`: Anthropic 콘솔에서 발급받은 키 (유료, 사용량만큼 과금)
   - `APP_TOKEN`: 직접 만든 긴 무작위 문자열
3. 서버를 켭니다.

```bash
npm run dev
```

`Ready on http://localhost:8787`이 보이면 켜진 것입니다. `.dev.vars`는 깃에 올라가지 않습니다.

## 3. curl로 확인하기

아래 명령의 `내토큰` 자리에 `.dev.vars`에 넣은 `APP_TOKEN` 값을 넣으세요.

서버가 살아 있는지:

```bash
curl http://localhost:8787/health
```

번역 (영어 + 일본어):

```bash
curl -X POST http://localhost:8787/translate \
  -H "Authorization: Bearer 내토큰" \
  -H "Content-Type: application/json" \
  -d '{"text":"안녕하세요","targets":["en","ja"]}'
```

다의어 확인 ("배"가 과일/탈것/신체로 나뉘는지):

```bash
curl -X POST http://localhost:8787/translate \
  -H "Authorization: Bearer 내토큰" \
  -H "Content-Type: application/json" \
  -d '{"text":"배","targets":["en"]}'
```

AI 회화 시작 (AI가 먼저 말을 겁니다):

```bash
curl -X POST http://localhost:8787/chat \
  -H "Authorization: Bearer 내토큰" \
  -H "Content-Type: application/json" \
  -d '{"scenario":"cafe_order","lang":"en","level":"starter"}'
```

AI 회화 이어가기 (내 말을 교정받기):

```bash
curl -X POST http://localhost:8787/chat \
  -H "Authorization: Bearer 내토큰" \
  -H "Content-Type: application/json" \
  -d '{"scenario":"cafe_order","lang":"en","history":[{"role":"assistant","text":"Hi! What can I get for you?"},{"role":"user","text":"I want coffee one."}]}'
```

토큰 없이 보내면 거절되는지:

```bash
curl -X POST http://localhost:8787/translate -d '{"text":"안녕","targets":["en"]}'
```

## 4. API 요약

모든 `POST` 요청에는 `Authorization: Bearer <APP_TOKEN>` 헤더가 필요합니다. 앱은 `X-Install-Id`(설치 때 만든 무작위 ID)도 함께 보내 기기별 요청 제한을 받습니다.

### `POST /translate`

| 필드 | 설명 |
|---|---|
| `text` | 번역할 한국어. 1~200자 |
| `targets` | `["en"]`, `["ja"]`, `["en","ja"]` 중 하나 |
| `level` | (선택) `starter` 입문 / `beginner` 초급(기본값) / `intermediate` 중급 |

응답의 후보(`candidates`)는 언어당 최대 3개이고, 각 후보에 아래 값이 들어 있습니다.

| 필드 | 설명 |
|---|---|
| `text` | 입력창에 들어갈 번역문 |
| `reading` / `reading_kana` | 일본어 읽기 (로마자 / 히라가나). 영어는 `null` |
| `sense` | 다의어일 때 뜻 구분 (예: "과일"). 아니면 `null` |
| `back_translation` | 번역문을 다시 한국어로 옮긴 것 |
| `confidence` | 0~1 |
| `verdict` | `ok` ✅ / `caution` ⚠️ / `wrong` ❌ |
| `note` | 학습자용 한 줄 설명 또는 `null` |
| `register` | `casual` / `neutral` / `polite` |
| `flags` | `profanity`(비속어), `sensitive`(민감 표현). 없으면 빈 배열 |

### `POST /chat`

| 필드 | 설명 |
|---|---|
| `scenario` | `cafe_order`, `restaurant`, `hotel_checkin`, `airport_checkin`, `directions`, `shopping`, `taxi`, `self_intro`, `free_talk` |
| `lang` | `en` 또는 `ja` |
| `level` | (선택) 위와 같음 |
| `history` | (선택) 최근 대화 최대 12개. 각 항목은 `role`(`user`/`assistant`)과 300자 이하 `text`. 비우면 AI가 먼저 시작 |

응답: `reply`(AI의 말), `reply_reading`(일본어 히라가나 읽기), `reply_ko`(한국어 뜻), `correction`(`needed`, `better`, `explanation_ko`).

### 오류 코드

| 코드 | HTTP | 뜻 |
|---|---|---|
| `unauthorized` | 401 | 토큰이 없거나 틀림 |
| `invalid_input` | 400 | 입력이 규칙에 안 맞음 (200자 초과 등) |
| `rate_limited` | 429 | 요청이 너무 많음 |
| `refused` | 422 | 모델이 처리를 거절함 |
| `schema_error` | 502 | 모델 응답 형식이 깨짐 (1회 재시도 후에도 실패) |
| `upstream_error` | 502 | Claude API 쪽 오류 |
| `timeout` | 504 | 8초 안에 응답이 오지 않음 |
| `server_misconfigured` | 500 | 서버에 비밀값이 설정되지 않음 |

## 5. 인터넷에 배포하기 (Phase 5에서 함께 진행)

Cloudflare 계정이 필요합니다. 명령을 실행하면 값을 물어봅니다.

```bash
npx wrangler login
```

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

```bash
npx wrangler secret put APP_TOKEN
```

```bash
npm run deploy
```

배포 전에 **Anthropic 콘솔에서 월 지출 한도를 꼭 설정**하세요. 앱 토큰은 앱 안에 들어가므로 누군가 꺼내 쓸 수 있고, 지출 한도가 최종 안전장치입니다.

## 6. 예상 비용 (추정치)

`claude-haiku-5-5` 가격은 입력 100만 토큰당 $0.10, 출력 100만 토큰당 $0.50입니다 (2026-11 기준, 최신 가격은 Anthropic 가격표에서 확인).
번역 1회를 입력 약 900토큰, 출력 약 300토큰으로 **가정하면** 1,000회에 약 $0.24입니다. 토큰 수는 아직 실측하지 않은 추정이므로, 실제 키로 테스트한 뒤 다시 계산해야 합니다.

## 아직 확인하지 못한 것

- 실제 API 키로 Claude를 호출하는 테스트는 하지 못했습니다 (개발 환경에 키가 없음). 가짜 모델로 서버 로직을 검증했고, 로컬 실행에서 Claude API까지 요청이 도달하는 것(가짜 키라 401로 거절됨)까지만 확인했습니다.
- 그래서 실제 번역 품질, 응답 속도, 모델이 요청 형식을 그대로 받아 주는지는 키를 넣은 뒤 확인이 필요합니다.
