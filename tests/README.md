# 사이트 자동 테스트

[playwright-cli](https://github.com/microsoft/playwright-cli)로 실제 브라우저를 띄워 사이트 화면이 제대로 동작하는지 점검해요.
사이트 배포(`.github/workflows/pages.yml`)에는 포함되지 않는, 개발용 폴더예요.

## 실행

```bash
cd tests
npm install
npm test
```

특정 화면만 돌리려면 이름 일부를 붙여요.

```bash
npm test -- pos
```

브라우저가 없다는 오류가 나면 한 번만 설치해 주세요.

```bash
npx playwright-cli install-browser
```

## 무엇을 확인하나요

| 파일 | 화면 | 확인 내용 |
| --- | --- | --- |
| `e2e/home.js` | `index.html` | 새 기기에서 로그인 화면(이메일·비밀번호·로그인 버튼)이 뜨는지 |
| `e2e/price.js` | `price.html` | 가격표 불러오기, 더 보기, 코드 검색, 없는 검색어 안내, 분류 선택, 판매가 정렬, 내부 단가 열 숨김 |
| `e2e/pos.js` | `pos.html` | 상품 담기, 수량 ±와 합계, 새로고침 뒤 장바구니 유지, 비우기(취소·확인), 상품 검색 |
| `e2e/offline.js` | `offline.html` | 오프라인 안내 문구와 다시 시도 버튼 |

로그인 이후 화면(메신저·장부 등)은 실제 계정과 서버가 필요해서 여기서는 다루지 않아요.

## 테스트 추가하기

1. `e2e/`에 `async page => { ... }` 모양의 파일을 만들어요. 문제가 있으면 `throw new Error('설명')`, 통과하면 한 줄 요약을 `return` 해요.
2. `run.mjs`의 `CASES`에 `[이름, 열 페이지, 파일]` 한 줄을 추가해요.

테스트는 상품명·가격을 화면에서 읽어 쓰기 때문에, 가격표 데이터가 바뀌어도 고칠 필요가 없어요.
