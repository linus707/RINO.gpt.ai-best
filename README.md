# Linus Company 워크스페이스

가구·침구 매장을 운영하는 **Linus Company**의 업무 앱이에요. 장부, 매장 POS, 가격표, 일정, 업무 대화를 한 곳에서 쓰고, 폰·태블릿·PC에서 앱처럼 설치해서 사용해요. (주소: https://linuscompany.co.kr)

서버를 따로 두지 않는 정적 사이트 구조예요. 데이터는 비공개 GitHub Gist로 동기화하고, 알림·로그인 같은 서버 일은 GitHub Actions와 Cloudflare Worker가 맡아요.

## 구성

| 파일·폴더 | 역할 |
|---|---|
| `index.html` | 메인 앱. 로그인, 홈, 장부, 일정(Celender), 업무 대화방, 컨텐츠·물품·재고, 설정 |
| `pos.html` | 매장 POS 화면 |
| `price.html` + `prices.json` | 제품 가격표 (검색·조회) |
| `offline.html`, `sw.js`, `manifest.webmanifest`, `icon*` | 설치형 앱(PWA), 오프라인 안내, 웹 푸시 수신 |
| `scripts/` | 푸시 알림 발송, 배포 때 로그인 서버 주소 주입 |
| `worker/` | 즉시 푸시·로그인·Notion 일정 연동용 Cloudflare Worker (선택) |
| `extension/` | AMS 제품 표를 앱 단가표로 보내는 크롬 확장 프로그램 |
| `.github/workflows/` | `pages.yml`(배포), `push.yml`(5분마다 알림 발송) |

## 주요 기능

- **장부**: 판매 기록(고객·연락처·주소, 제품 여러 개, 수량·할인율, 판매자, 배송 예정일), 결제(계약금·잔금·방식·취소), 미수금, 판매자·제품·월별 분석, CSV 내보내기(회계용 포함)
- **일정(Celender)**: 앱 일정표. 장부의 배송 예정일이 제품배송 일정으로 들어가고, Notion 데이터베이스와 양방향으로 맞출 수 있어요.
- **업무 대화방**: 공지사항·업무 대화·알림 방, 새 메시지 웹 푸시
- **계정·권한**: 이메일 회원가입 → 관리자 승인 → 역할(직원/관리자)별 메뉴. 컨텐츠·물품·재고는 관리자 전용이에요.
- **데이터 보호**: 자동 백업·복원, 휴지통, 백업 파일 받기·합치기, 설정 데이터 잠금
- **실시간 반영**: 앱이 열려 있는 동안 10초마다 다른 기기의 변경을 받아와요.
- **오프라인**: 업무 데이터는 기기에 캐시하지 않고, 오프라인 안내 페이지 하나만 캐시해요.

## 배포와 실행

- **배포**: `main` 브랜치에 푸시하면 `pages.yml`이 GitHub Pages로 올려요. 올라가는 파일은 워크플로에 적힌 목록(`index.html`, `price.html`, `pos.html`, `prices.json`, `offline.html`, `sw.js`, `manifest.webmanifest`, 아이콘, `CNAME`)뿐이에요. **새 페이지를 추가하면 이 목록에도 넣어야 해요.**
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
- [`docs/content-plan-2026-11.md`](docs/content-plan-2026-11.md): 콘텐츠 운영 플랜 (블로그·인스타)

## 알아둘 점

서버 없는 구조라서, 로그인한 기기는 직원이든 관리자든 같은 동기화 키를 받아요. 메뉴 구분은 **화면 잠금 수준**이에요. 직원에게 숨기고 싶은 민감한 자료는 앱에 넣지 마세요.

## 미수금 푸시 알림
- `scripts/due-notify.mjs`가 `.github/workflows/push.yml`(5분마다)에서 함께 실행돼요. 동기화 Gist의 장부에서 잔금이 남은 주문 중 예정일이 지났거나 3일 이내인 건을 찾아, 정해 둔 시각(기본 한국 시간 9시) 뒤 첫 실행 때 하루 한 번 관리자 기기로 웹 푸시를 보내요.
- 기본 알림에는 건수와 잔금 합계만 담고, 고객 이름은 앱 설정(장부 > 결제·회계 > 미수금 푸시 알림)에서 켠 경우에만 넣어요. 필요한 비밀값은 기존 푸시와 같아요(`SYNC_GIST_TOKEN`, `SYNC_GIST_ID`, `VAPID_PRIVATE_KEY`).
- 알림을 누르면 `/?ledger=pay`로 열려 장부의 결제·회계 탭이 보여요.

## 라이선스

MIT License

Copyright (c) 2026
