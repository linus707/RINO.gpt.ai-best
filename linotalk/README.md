# 리노톡 (LinoTalk)

한국어 사용자를 위한 iPhone 회화 독학 앱 + 번역 키보드 프로젝트입니다.
전체 계획은 [PLAN.md](PLAN.md)에 있습니다.

## 지금까지 만들어진 것

| 폴더 | 내용 | 상태 |
|---|---|---|
| `Shared/` | 한글 두벌식 조합 엔진 (순수 Swift) | 테스트 41개 통과 |
| `server/` | 번역·회화 프록시 서버 (Cloudflare Workers) | 테스트 23개 통과, 실제 API 키 테스트는 아직 |

앱과 키보드(iOS)는 아직 시작하지 않았습니다. Mac 없이 진행하는 방법을 정한 뒤 이어갑니다.

## 한글 조합 엔진 테스트 돌리기

Swift가 설치된 컴퓨터(Mac 또는 리눅스)에서:

```bash
cd linotalk/Shared
```

```bash
swift test
```

`Executed 41 tests, with 0 failures`가 보이면 성공입니다.

## 서버

[server/README.md](server/README.md)를 보세요.

## 비밀값 규칙

API 키와 앱 토큰은 코드와 깃에 넣지 않습니다. `server/.dev.vars.example`은 예시일 뿐이고, 진짜 값이 들어가는 `server/.dev.vars`는 `.gitignore`로 막혀 있습니다.
