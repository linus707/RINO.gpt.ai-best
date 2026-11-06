# RINO.gpt.ai-best

## 소개

이 프로젝트는 인공지능(AI) 기반의 다양한 기능을 활용하여 사용자에게 효율적인 정보 제공과 작업 자동화를 지원하는 도구입니다.

프로젝트의 목적은 AI 기술을 활용하여 반복 작업을 줄이고, 더 빠르고 정확한 결과를 제공하는 것입니다.

## 주요 기능

* AI 기반 텍스트 생성 및 응답
* 사용자 요청에 따른 정보 분석 및 요약
* 자동화된 데이터 처리 기능
* 확장 가능한 모듈 구조

## 사용 방법

1. 저장소를 다운로드하거나 클론합니다.

   ```bash
   git clone https://github.com/사용자명/RINO.gpt.ai-best.git
   ```

2. 프로젝트 폴더로 이동합니다.

   ```bash
   cd RINO.gpt.ai-best
   ```

3. 필요한 패키지를 설치합니다.

   ```bash
   npm install
   ```

4. 프로젝트를 실행합니다.

   ```bash
   npm start
   ```

## 개발 환경

* JavaScript / TypeScript
* Node.js
* Git & GitHub

## 향후 계획

* AI 응답 품질 개선
* 사용자 인터페이스(UI) 고도화
* 다양한 외부 API 연동
* 성능 최적화 및 안정성 강화

## 라이선스

MIT License

Copyright (c) 2026

## 미수금 푸시 알림
- `scripts/due-notify.mjs`가 `.github/workflows/push.yml`(5분마다)에서 함께 실행돼요. 동기화 Gist의 장부에서 잔금이 남은 주문 중 예정일이 지났거나 3일 이내인 건을 찾아, 정해 둔 시각(기본 한국 시간 9시) 뒤 첫 실행 때 하루 한 번 관리자 기기로 웹 푸시를 보내요.
- 기본 알림에는 건수와 잔금 합계만 담고, 고객 이름은 앱 설정(장부 > 결제·회계 > 미수금 푸시 알림)에서 켠 경우에만 넣어요. 필요한 비밀값은 기존 푸시와 같아요(`SYNC_GIST_TOKEN`, `SYNC_GIST_ID`, `VAPID_PRIVATE_KEY`).
- 알림을 누르면 `/?ledger=pay`로 열려 장부의 결제·회계 탭이 보여요.
