# Linus Company 워크스페이스

가구·침구 매장을 운영하는 **Linus Company**의 업무 앱이에요. 장부, 매장 POS, 가격표, 일정, 업무 대화를 한 곳에서 쓰고, 폰·태블릿·PC에서 앱처럼 설치해서 사용해요. (주소: https://linuscompany.co.kr)

서버를 따로 두지 않는 정적 사이트 구조예요. 데이터는 비공개 GitHub Gist로 동기화하고, 알림·로그인 같은 서버 일은 GitHub Actions와 Cloudflare Worker가 맡아요.

## 구성

| 파일·폴더 | 역할 |
|---|---|
| `index.html` | 메인 앱. 로그인, 홈, 장부, 일정(Celender), 업무 대화방, 컨텐츠·물품·재고, 설정 |
| `pos.html` | 매장 POS (제품 목록·장바구니·견적 비교·상담/판매 기록). `buy.html`은 여기로 넘어가요 |
| `price.html` + `prices.json`, `store-prices.json` | 제품 가격표(전체 정상가 / 매장 가격표). POS용 엑셀 양식은 `pos-price-*.xlsx` |
| `translate.html`, `ios/RinoTranslate/` | 키보드 번역 페이지와 아이폰 키보드 앱 |
| `japanese.html` | 일본어 회화 연습 앱 |
| `offline.html`, `sw.js`, `manifest.webmanifest`, `icon*` | 설치형 앱(PWA), 오프라인 안내, 웹 푸시 수신 |
| `scripts/` | 푸시 알림 발송, 배포 때 로그인 서버 주소 주입, 가격표 엑셀 생성 |
| `tests/` | 방화벽 보안 테스트 ([`tests/README.md`](tests/README.md)) |
| `worker/` | 즉시 푸시·로그인·Notion 일정 연동용 Cloudflare Worker (선택) |
| `extension/` | AMS 제품 표를 앱 단가표로 보내는 크롬 확장 프로그램 |
| `.github/workflows/` | `pages.yml`(배포), `push.yml`(5분마다 알림 발송), `security-tests.yml`(보안 테스트), `ios-build.yml`(아이폰 앱 빌드) |

## 주요 기능

- **장부**: 판매 기록(고객·연락처·주소, 제품 여러 개, 수량·할인율, 판매자, 배송 예정일), 결제(계약금·잔금·방식·취소), 미수금, 판매자·제품·월별 분석, CSV 내보내기(회계용 포함)
- **일정(Celender)**: 앱 일정표. 장부의 배송 예정일이 제품배송 일정으로 들어가고, Notion 데이터베이스와 양방향으로 맞출 수 있어요.
- **업무 대화방**: 공지사항·업무 대화·알림 방, 새 메시지 웹 푸시
- **계정·권한**: 이메일 회원가입 → 관리자 승인 → 역할(직원/관리자)별 메뉴. 컨텐츠·물품·재고는 관리자 전용이에요.
- **데이터 보호**: 자동 백업·복원, 휴지통, 백업 파일 받기·합치기, 설정 데이터 잠금
- **실시간 반영**: 앱이 열려 있는 동안 10초마다 다른 기기의 변경을 받아와요.
- **오프라인**: 업무 데이터는 기기에 캐시하지 않고, 오프라인 안내 페이지 하나만 캐시해요.

## 배포와 실행

- **배포**: `main` 브랜치에 푸시하면 `pages.yml`이 GitHub Pages로 올려요. 올라가는 파일은 워크플로의 `cp` 목록에 적힌 것(각 HTML 페이지, 가격표 JSON·엑셀, `sw.js`, 매니페스트, 아이콘, `CNAME`)뿐이에요. **새 페이지를 추가하면 이 목록에도 넣어야 해요.**
- **빌드 과정은 없어요.** `package.json`이 없고 `npm install`·`npm start`도 필요 없어요. HTML 파일을 그대로 올려요.
- **로컬 확인**: 저장소 폴더에서 간단한 정적 서버를 열어 `index.html`을 보면 돼요. 로그인·동기화·푸시는 Worker와 Gist 연결이 있어야 동작해요.

  ```bash
  python3 -m http.server 8000
  ```

- **푸시 스크립트 테스트**: `scripts/`의 파일은 Node.js 20과 `web-push` 패키지를 써요. 워크플로가 실행할 때 설치해요.

## 필요한 비밀값 (GitHub Secrets)

| 이름 | 용도 |
|---|---|
| `SYNC_GIST_TOKEN`, `SYNC_GIST_ID` | 동기화 Gist 읽기·쓰기 |
| `VAPID_PRIVATE_KEY` (`VAPID_SUBJECT`은 선택) | 웹 푸시 발송 |
| `SOLAMEN_READ_TOKEN` | AI 직원 진행 알림에서 지시함 저장소 읽기 전용 |

토큰과 키는 코드·문서·채팅에 적지 말고 Secrets에만 넣으세요.

## 알림 구조

`push.yml`이 5분마다 세 가지를 실행해요.

1. `push-send.mjs`: 새 업무 메시지를 웹 푸시로 발송
2. `staff-notify.mjs`: AI 직원이 지시를 '착수'·'보고'했을 때 대표 기기로 알림
3. `due-notify.mjs`: 미수금 알림 (아래 참고)

몇 초 안에 받고 싶으면 `worker/`의 즉시 푸시 워커를 연결하세요. 연결하지 않아도 위의 5분 간격 알림은 동작하고, 둘을 같이 켜도 같은 메시지는 한 번만 나가요. 설정 방법은 [`worker/README.md`](worker/README.md)에 있어요.

## 관련 문서

- [`worker/README.md`](worker/README.md): 즉시 푸시, 이메일 로그인·가입, Notion 일정 연동
- [`extension/README.md`](extension/README.md): 크롬 확장 프로그램 설치와 사용
- [`docs/pos.md`](docs/pos.md): 매장 POS 상세 설명
- [`tests/README.md`](tests/README.md): 보안 테스트 실행 방법
- [`docs/content-plan-2026-11.md`](docs/content-plan-2026-11.md): 콘텐츠 운영 플랜 (인스타그램 중심)

## 알아둘 점

서버 없는 구조라서, 로그인한 기기는 직원이든 관리자든 같은 동기화 키를 받아요. 메뉴 구분은 **화면 잠금 수준**이에요. 직원에게 숨기고 싶은 민감한 자료는 앱에 넣지 마세요.

## 미수금 푸시 알림
- `scripts/due-notify.mjs`가 `.github/workflows/push.yml`(5분마다)에서 함께 실행돼요. 동기화 Gist의 장부에서 잔금이 남은 주문 중 예정일이 지났거나 3일 이내인 건을 찾아, 정해 둔 시각(기본 한국 시간 9시) 뒤 첫 실행 때 하루 한 번 관리자 기기로 웹 푸시를 보내요.
- 기본 알림에는 건수와 잔금 합계만 담고, 고객 이름은 앱 설정(장부 > 결제·회계 > 미수금 푸시 알림)에서 켠 경우에만 넣어요. 필요한 비밀값은 기존 푸시와 같아요(`SYNC_GIST_TOKEN`, `SYNC_GIST_ID`, `VAPID_PRIVATE_KEY`).
- 알림을 누르면 `/?ledger=pay`로 열려 장부의 결제·회계 탭이 보여요.

## 키보드 번역
- `translate.html`: 한글은 고른 언어로, 외국어는 한국어로 바꿔 주는 번역 페이지예요(`/translate.html`). 번역할 글은 MyMemory 번역 서비스로 전송돼요.
- `ios/RinoTranslate/`: 같은 기능의 아이폰 키보드 앱(Swift) 프로젝트예요. 설치 방법은 그 폴더의 README를 보세요.

## 일본어 회화
- `japanese.html`: 리노 전용 일본어 회화 연습 앱이에요(`/japanese.html`). 홈·AI 회화·상황별 코스·발음 쉐도잉·단어장·마이페이지(학습 리포트) 6개 화면이고, 휴대폰 홈 화면에 추가하면 따로 앱처럼 열려요(`japanese.webmanifest`).
- 코스 6개(카페·편의점·길 묻기·호텔·친구 약속·비즈니스)의 대화와 쉐도잉 문장, 단어 20개는 파일 안 `COURSES`·`VOCAB`에 들어 있어요. 문장을 추가하려면 거기에 원문·가나 읽기·뜻을 넣으면 한글 발음은 자동으로 만들어져요.
- 듣기·말하기는 브라우저의 음성 합성·음성 인식을 써요. 발음 점수는 "인식된 문장이 목표 문장과 얼마나 같은지"로 계산해요.
- 'AI 자유 회화'만 Anthropic API 키가 필요해요(마이페이지 → 설정). 키와 학습 기록은 그 기기의 브라우저에만 저장돼요.

## 보안 방화벽
사이트는 두 겹으로 지켜요.
- **페이지 방화벽(콘텐츠 보안 정책)**: 모든 페이지(`index.html`·`pos.html`·`buy.html`·`price.html`·`translate.html`·`japanese.html`·`offline.html`) 맨 위 `Content-Security-Policy`에 적힌 주소로만 연결·불러오기가 돼요. 누군가 악성 코드를 끼워 넣어도 다른 서버에서 스크립트를 불러오거나 허용되지 않은 서버로 자료를 보내는 길이 막혀요. 다른 사이트가 우리 화면을 몰래 끼워 넣는 것(클릭재킹)도 막아요.
- **서버 방화벽(워커)**: 로그인·푸시·일정 서버로 오는 모든 요청을 먼저 걸러요. 자세한 규칙은 `worker/README.md`의 '방화벽'을 보세요.
- **새 외부 서비스를 붙일 때**: 그 페이지의 `connect-src`(연결), 글꼴·스타일이면 `font-src`·`style-src`에 주소를 추가해야 해요. 빠뜨리면 그 기능만 동작하지 않고, 메인 앱은 "보안 방화벽이 … 연결을 막았어요" 안내를 띄워요.
- 로그인 서버(워커)는 `*.workers.dev` 주소면 그대로 되고, 자체 도메인이면 배포할 때 `scripts/inject-auth.mjs`가 허용 목록에 자동으로 넣어요. Notion 연동 워커를 자체 도메인에 따로 둔다면 `index.html`의 `connect-src`에 직접 추가해 주세요.
- 한계: 앱이 한 파일 안의 인라인 스크립트로 되어 있어 `script-src`에 `'unsafe-inline'`이 들어가 있어요. 페이지 안에 직접 끼워진 스크립트의 실행 자체는 막지 못하므로, 화면에 넣는 값은 지금처럼 꼭 `esc()`를 거쳐야 해요.

## 매장 POS (`pos.html`)
매장에서 손님 상담·견적·판매 기록에 쓰는 화면이에요. 제품 목록, 장바구니(여러 제품 합산 할인), A·B·C 견적 비교, 손님 화면, 견적서 인쇄, 상담·판매 기록, 제품 설정(가격·사진·상세페이지), 엑셀 가격표 불러오기를 지원해요. 예전 주소 `buy.html`은 `pos.html`로 넘어가요. 자세한 사용법과 설정은 [`docs/pos.md`](docs/pos.md)에 있어요.

## 라이선스

MIT License

Copyright (c) 2026
