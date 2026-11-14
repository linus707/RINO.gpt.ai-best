# 리노 번역 (아이폰 키보드 번역 앱)

글을 쓴 뒤 키보드에서 버튼 한 번으로 다른 언어로 바꿔 주는 아이폰 앱이에요.
같은 기능의 웹 버전은 `translate.html`(https://linuscompany.co.kr/translate.html)에 있어요.

## 어떻게 동작하나요
- 한글이 섞인 글 → 고른 언어(영어·일본어·중국어 등 9개)로 번역
- 외국어 글 → 한국어로 번역 (언어는 자동 감지)
- 키보드에서 **번역해서 바꾸기**를 누르면 입력 칸의 글(커서 앞 또는 선택한 글)이 번역문으로 바뀌고, **되돌리기**로 원래 글로 돌아가요.

## 폴더 구성
| 위치 | 역할 |
|---|---|
| `Shared/Translator.swift` | 번역 요청 (앱·키보드가 함께 씀) |
| `RinoTranslate/` | 앱 화면: 키보드 켜는 방법 안내 + 앱 안 번역기 |
| `TranslateKeyboard/` | 키보드 확장: 번역 버튼, 언어 선택, 되돌리기 |

## 맥으로 설치하기
맥과 Xcode 16 이상(영상처럼 클로드를 쓰려면 26.3 이상), 아이폰(iOS 17 이상)이 필요해요.

1. 이 폴더의 `RinoTranslate.xcodeproj`를 Xcode로 열어요.
2. 왼쪽 맨 위 파란 **RinoTranslate** → TARGETS의 **RinoTranslate**와 **TranslateKeyboard** 각각 → *Signing & Capabilities* → **Team**에 내 Apple 계정을 골라요. (두 타깃 모두 해야 해요)
3. "번들 ID를 쓸 수 없다"고 나오면 Bundle Identifier의 `kr.co.linuscompany` 부분을 나만의 값으로 바꿔요. 키보드 쪽은 반드시 `앱 ID + .keyboard` 형태여야 해요.
4. 아이폰을 연결하고 위쪽 기기 목록에서 고른 뒤 ▶ 를 눌러요.
5. 앱 첫 화면 안내대로 키보드를 추가하고 **전체 접근 허용**을 켜요.

## 맥 없이 설치하기 (윈도우)
1. GitHub 저장소 → **Actions** → **Build iPhone app** → 가장 최근의 초록색(성공) 실행을 열어요.
2. 맨 아래 **Artifacts**에서 `RinoTranslate-unsigned-ipa`를 받아 압축을 풀면 `RinoTranslate-unsigned.ipa`가 나와요.
3. 윈도우에 사이드로딩 도구(예: Sideloadly)와 그 도구가 요구하는 iTunes·iCloud를 설치해요.
4. 아이폰을 USB로 연결하고, 도구에 `.ipa`와 Apple ID를 넣어 설치해요. 키보드 확장이 함께 서명되도록 확장(App Extension)을 제거하는 옵션은 꺼 두세요.
5. 아이폰 설정 → 일반 → VPN 및 기기 관리에서 내 Apple ID를 **신뢰**하고, iOS 16 이상이면 설정 → 개인정보 보호 및 보안 → **개발자 모드**를 켜요.
6. 앱을 열어 안내대로 키보드를 추가해요.

무료 Apple ID로 설치한 앱은 7일 뒤 만료돼서 같은 방법으로 다시 설치해야 해요. 이 설치 과정은 직접 확인하지 못한 부분이라, 도구 화면이 위 설명과 조금 다를 수 있어요.

## Xcode 안의 클로드로 고치기
Xcode → Settings → Intelligence에서 Claude에 로그인하면, 프로젝트를 연 채로 말로 수정할 수 있어요.
예: "키보드에 ‘존댓말로’ 옵션을 추가해 줘", "앱 아이콘을 넣어 줘".

## 알아둘 점
- 빌드는 GitHub Actions(맥 서버)에서 확인했어요. **실제 아이폰에서의 동작은 아직 확인하지 못했어요.** 써 보다 이상한 점이 있으면 Xcode의 클로드나 Claude Code에 증상을 알려 주세요.
- 번역 버튼을 누른 글은 무료 번역 서비스 MyMemory(translated.net)로 전송돼요. 민감한 내용은 번역하지 마세요. 무료 한도는 하루 약 5,000자, 한 번에 1,000자예요.
- iOS는 키보드에 커서 주변 글만 알려 줘서, 아주 긴 글은 마지막 문단만 바뀔 수 있어요. 그럴 땐 글을 선택한 뒤 번역하세요.
- 앱 아이콘은 아직 없어요(기본 아이콘으로 설치돼요). App Store에 올리려면 아이콘과 개인정보 처리방침이 필요해요.
