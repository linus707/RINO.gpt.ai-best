# 보안 테스트 (AI 해커)

방화벽이 실제로 공격을 막는지 자동으로 확인하는 침투 테스트예요. 코드를 고친 뒤 돌려서 "여전히 안전한지" 보는 회귀 테스트로 쓰세요.

## 실행

```bash
node tests/firewall-unit.mjs     # 워커 방화벽 단위 테스트 (19가지 경우) — 추가 설치 불필요
node tests/worker-firewall.mjs   # 워커에 실제 HTTP로 63건 공격 — 추가 설치 불필요
node tests/pages-csp.mjs         # 브라우저로 페이지 공격 — Playwright(Chromium) 필요
node tests/travel-hotel-api.mjs  # 여행 지도 실시간 가격 워커 22가지 검사 — 추가 설치 불필요
```

세 개를 한 번에:

```bash
node tests/firewall-unit.mjs && node tests/worker-firewall.mjs && node tests/pages-csp.mjs
```

## 각 파일

- **`firewall-unit.mjs`** — `worker/worker.js`의 방화벽을 함수 단위로 검증해요(경로·메서드 허용, 스캐너 차단, 본문 크기 제한, 속도 제한, 차단 누적 등). 네트워크·브라우저 없이 바로 돌아가요.
- **`worker-firewall.mjs`** — 워커를 로컬 HTTP 서버로 띄우고(`serve-worker.mjs`) 진짜 요청으로 공격해요. 정찰/스캔, 비밀값 탈취, 인증 우회(SQL·NoSQL·프로토타입 오염), Origin 위조, 주입/우회 인코딩, 과부하·대형 본문, 엉뚱한 메서드, 응답 보안 헤더를 확인해요. **뚫림 기준**: 비밀값 유출 · 방화벽 우회로 내부(Gist/Notion) 도달 · 차단돼야 할 요청이 통과 · 서버 오류 노출.
- **`serve-worker.mjs`** — 위 테스트가 쓰는 어댑터. 워커를 HTTP로 감싸고, GitHub·Notion은 가짜로 대신해 "방화벽을 통과해 내부까지 닿았는지"를 표시해요. 일부러 심은 가짜 비밀값이 응답에 새는지도 함께 봐요.
- **`pages-csp.mjs`** — 저장소의 정적 서버와 공격자 사이트를 스스로 띄우고, 실제 브라우저(Chromium)로 각 페이지를 공격해요. **뚫림 기준**: 정상 사용 중 방화벽 오작동 · 페이지 오류 · 외부 스크립트 로드 성공 · 외부 서버로 자료 유출 · 다른 사이트의 클릭재킹 성공. 같은 사이트 안에서 끼우는 POS 미리보기는 정상 동작해야 통과예요.

## 한계

- 워커는 실제 Cloudflare가 아니라 로컬에서 실행하고 GitHub·Notion은 가짜로 대신해요. 방화벽 로직 자체는 검증되지만, 실제 Cloudflare의 추가 DDoS 방어나 네트워크 지연까지 보는 것은 아니에요.
- `pages-csp.mjs`는 Chromium이 있어야 해요(이 저장소에 설치본은 포함하지 않아요).
