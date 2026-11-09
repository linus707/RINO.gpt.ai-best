# VoiceStudio 가이드 (리노 전용)

> 대상 저장소: https://github.com/debpalash/VoiceStudio (v0.5.8-beta.3 기준, AGPL-3.0)

---

## 1. 설치·실행·PC 사양

### 가장 쉬운 설치 (코딩 몰라도 OK)
| OS | 방법 |
|---|---|
| Windows 10/11 (x64) | 릴리스 페이지에서 설치 파일 다운로드, 또는 PowerShell: `irm https://voicestudio.sh/install.ps1 \| iex` |
| macOS (Apple Silicon, 13.3+) | `brew tap debpalash/tap` → `brew install --cask debpalash/tap/voicestudio` 또는 DMG |
| Linux | `curl -fsSL https://voicestudio.sh/install \| sh`, DEB, AppImage, Snap 중 택1 |
| 서버·Docker | `ghcr.io/debpalash/voicestudio:stable` (CPU/NVIDIA/AMD 이미지) |
| 폰 | Android 10+ APK (프리뷰) |

- 다운로드: https://github.com/debpalash/VoiceStudio/releases/latest
- Intel Mac은 UI만 돌아가고, 무거운 처리는 다른 컴퓨터의 백엔드에 연결해야 해요.

### 사양 (문서에서 확인된 것만)
- **디스크 여유 약 10GB** 필요 (앱 + 파이썬 환경 + 모델). 엔진을 추가하면 수 GB씩 늘어나요.
- **GPU**: NVIDIA CUDA 권장. AMD(ROCm, Vulkan), Apple Silicon(MPS), CPU만으로도 돌아가지만 CPU는 느려요.
- **VRAM**: 16GB 미만이면 일부 최적화 컴파일 단계에서 메모리 부족이 날 수 있다고 문서에 적혀 있어요.
- 모델별 정확한 RAM/VRAM 표는 못 찾았어요. 앱의 모델 관리자에서 모델별 용량을 보고 필요한 것만 받으세요.

### 첫 실행 순서
1. 설치 후 실행 → 첫 실행 때 분석(통계) 동의 창이 떠요. **기본은 꺼짐**이고 "No"를 눌러도 모든 기능이 써져요.
2. 런타임(파이썬 의존성) 설치가 자동 진행돼요. 시간이 좀 걸려요.
3. 기본 엔진 "VoiceStudio"(OmniVoice 기반) 모델 다운로드.
4. 클로닝 → 짧고 깨끗한 내 목소리 녹음으로 시작해 보세요.

---

## 2. 리노 채널용 워크플로우

### 🚨 먼저 확인할 것: 상업적 이용 라이선스
- 앱 자체는 AGPL-3.0이라 **개인 사용은 문제없어요**.
- 그런데 `docs/licensing/model-inventory.md`에 따르면, **기본 엔진 OmniVoice(와 GGUF, NLLB 번역, Llama-OuteTTS)가 "비상업(noncommercial)" 표기**예요. 그리고 상업 사용이 검증 완료된 모델은 **현재 하나도 없다**고 적혀 있어요.
- 리노님은 수익화(블로그 광고, 인스타 협찬, 제품 판매)가 목표이니, **수익이 나는 채널에 쓰기 전에 모델 라이선스를 반드시 확인**하세요. 판단이 애매하면 상업용 라이선스 모델 쪽 엔진을 고르거나, 유료 Pro의 "Commercial License"(클라이언트 작업용)를 검토하세요.
- 저는 법률 자문이 아니라서 최종 판단은 각 모델 카드와 라이선스 원문으로 해 주세요.

### A. 여행 블로그 영상 → 다국어 더빙
```
① 영상 업로드 (Dub 메뉴)
② 원본 언어 Auto → 전사(자막 추출)
③ 타깃 언어 선택 (영어/일본어/…) → 번역
④ 문장별로 번역문 수정 (고유명사·장소명 위주)
⑤ 화자/목소리 지정 → Generate
⑥ "타이밍 초과" 경고 줄 점검 → 내보내기
```
- 번역 품질이 결과를 좌우해요. ④ 검수 단계를 꼭 거치세요.
- 영어 더빙본은 유튜브 별도 채널/오디오 트랙, 일본어는 인스타 릴스처럼 언어별로 재활용하면 효율이 좋아요.

### B. 얼굴 없는 내레이션 (가구 브랜드·스트릿포토)
1. 내 목소리를 30초~1분 정도 조용한 곳에서 녹음 → 클로닝 등록
2. 블로그 글을 문단 단위로 붙여넣기 → 일괄(Batch) 생성
3. 영상 편집 앱(캡컷 등)에 얹기 → 릴스/쇼츠

### C. 자동화 (AI 자동 수익 시스템과 연결)
- VoiceStudio는 **로컬 API · MCP · 감시 폴더(watch folder) · 레시피**를 지원해요.
- 예: 폴더에 대본 `.txt`를 넣으면 → 음성 자동 생성 → 편집 파이프라인으로 전달.
- 보안: API 키를 꼭 설정하고, Docker는 `127.0.0.1`로만 바인딩하세요 (README 예시 그대로).

### 한국어 팁
- 한국어가 지원 언어 목록에 있어요 (`docs/languages.md`).
- 결과가 어색하면 숫자·영어 단어를 한글로 풀어쓰고, 문장을 짧게 끊어 주세요.

---

## 3. 코드 구조 분석 & 포크 가이드

### 구조 요약
| 경로 | 역할 |
|---|---|
| `electron/` | 유일한 데스크톱·웹 UI (Electron + TypeScript). 새 UI는 여기에만 |
| `backend/` | Python 백엔드. `api/` `engines/`(TTS·ASR 엔진) `services/` `mcp_server.py` `migrations/`(alembic) |
| `mobile/ios`, `mobile/android` | 네이티브 폰 앱 (공통 규약 `mobile/contract/SPEC.md`) |
| `omnivoice/` | 기본 TTS 모델 코드 |
| `docs/` | 설치·기능·라이선스 문서 (코드 바꾸면 문서도 같이 수정하는 규칙) |
| `tests/` `changelog.d/` | 테스트, 변경 기록 조각 |
| 도구 | `bun`(JS), `uv`(Python), `pyproject.toml`, `Makefile`, `flake.nix`, Docker |

### 개발 환경 실행
```bash
git clone https://github.com/debpalash/VoiceStudio.git
cd VoiceStudio
bun install
bun run dev
```
(Nix 사용자는 `nix develop .#fhs` 후 `bun run dev`. 자세한 건 `docs/install/*.md`)

### 포크해서 수정할 때 주의 (프로젝트 규칙 — CLAUDE.md)
1. **라이선스 AGPL-3.0**: 수정본을 네트워크 서비스로 제공하면 소스 공개 의무가 생겨요. 개인 사용·내부 자동화는 괜찮지만 수정본을 판매·서비스화한다면 주의하세요.
2. **문서 동기화**: 설치/기능 동작을 바꾸면 같은 PR에서 `docs/`도 수정.
3. **변경 기록**: `changelog.d/<PR번호>.<타입>.md`에 한 줄 작성.
4. **하드코딩 한글 금지**: UI 문자열은 `electron/src/renderer/src/i18n/`의 번역 카탈로그를 통해서만 추가 (CI가 검사).
5. **DB 스키마 변경**은 alembic 마이그레이션 필수.
6. **로컬 우선 원칙**: 사용자 동의 없는 외부 전송 추가 금지.
7. **버전**은 루트 `package.json`이 기준이고 `pyproject.toml`, `backend/core/version.py`와 같이 올려야 해요.

### 포크 추천 아이디어 (리노 채널용)
- 한국어 블로그 글 → 일괄 내레이션 → 쇼츠용 자막(.srt) 동시 출력 레시피
- 감시 폴더 + 로컬 API 기반 "대본 투하 → 음성 자동 생성" 파이프라인 (코드 수정 없이 API만으로도 가능)

---

## 아직 안 한 것 / 한계
- **실제 설치·실행은 하지 않았어요.** 이 클라우드 환경에는 GPU가 없고, 앱도 설치형이라 동작 검증은 못 했어요. 위 내용은 저장소 문서·코드 기준이에요.
- **GitHub 포크는 만들지 않았어요.** 이 세션은 해당 저장소를 읽기 전용으로만 접근할 수 있어요.
