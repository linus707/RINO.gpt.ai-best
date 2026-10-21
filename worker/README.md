# 즉시 푸시 워커 (Cloudflare Workers)

메시지를 보내자마자 몇 초 안에 폰으로 알림을 보내는 작은 서버예요. 연결하지 않아도 GitHub Actions(`scripts/push-send.mjs`)가 5분 간격으로 같은 일을 하므로, 이 워커는 **선택**입니다. 둘이 함께 켜져 있어도 같은 메시지는 `push-state.json`의 `seen` 기록 덕에 한 번만 나가요.

## 동작
1. 앱이 메시지를 올리고 동기화가 끝나면 `POST /notify {"id": "<메시지 id>"}`만 보내요. (내용은 보내지 않아요)
2. 워커가 비공개 Gist에서 그 메시지와 기기 구독 목록을 읽어요. 아직 안 올라왔으면 최대 4번(1.5초 간격) 다시 읽어요.
3. 보낸 사람·멘션 없는 음소거 방·만료된 기기를 빼고 웹 푸시(RFC 8291 + VAPID)를 보내요.

가짜 요청으로는 알림 내용을 만들 수 없어요. 워커는 Gist에 실제로 있는 메시지에 대해서만 보내고, 허용된 Origin(`https://linuscompany.co.kr`)에서 온 요청만 받으며, IP당 분당 60회로 제한해요.

## 배포 (둘 중 하나)
**A. 대시보드(쉬움)** Cloudflare → Workers & Pages → Create Worker → 코드에 `worker.js` 전체를 붙여 넣고 Deploy.
**B. 명령줄** `cd worker && npx wrangler deploy`

## 비밀값 (Settings → Variables and Secrets, 유형 Secret)
| 이름 | 값 |
|---|---|
| `GIST_TOKEN` | 앱 동기화에 쓰는 GitHub 토큰 (Gist 권한) |
| `GIST_ID` | 동기화 Gist ID |
| `VAPID_PRIVATE_KEY` | 앱에서 푸시 키를 만들 때 한 번 보여 준 비공개 키 |

선택: `ALLOWED_ORIGIN`(쉼표로 여러 개), `VAPID_SUBJECT`(`mailto:…`). 토큰과 키는 채팅·문서·코드에 쓰지 말고 Secret에만 넣으세요.

## 연결
앱 설정 → 푸시 알림 서버 → **⚡ 즉시 푸시** 칸에 워커 주소(`https://….workers.dev`)를 넣고 저장 → **연결 확인**.
`GET /health` 가 `{"ok":true,"configured":true}` 이면 준비 완료예요.
