# OpenJarvis × 리노 자동화 시스템

> 원본: https://github.com/open-jarvis/OpenJarvis (Apache 2.0, 스탠포드 연구팀)
> 이 폴더는 원본 코드를 복사한 것이 아니라, **리노 채널에 맞춘 문서와 설정만** 담았어요. (원본은 149MB라 이 레포에 넣지 않았어요.)

## 읽는 순서

| 순서 | 파일 | 내용 |
|---|---|---|
| 1 | [01-코드분석.md](01-코드분석.md) | OpenJarvis 구조 한눈에 보기 |
| 2 | [02-레포-연동.md](02-레포-연동.md) | 이 레포와 어떻게 붙이는지 |
| 3 | [03-채널별-활용.md](03-채널별-활용.md) | 여행 블로그 / 가구 / 스트릿포토 시나리오 |
| 4 | [04-초보자-설치가이드.md](04-초보자-설치가이드.md) | 설치부터 첫 실행까지 |

## 폴더 구성

```
openjarvis/
├─ configs/
│  ├─ rino-chat.toml          # 가벼운 대화용 (도구 없음)
│  ├─ rino-research.toml      # 블로그·콘텐츠 자료조사용
│  ├─ rino-monitor.toml       # 매일 자동 실행(스케줄) 모니터링용
│  └─ rino-digest.toml        # 아침 브리핑 + ElevenLabs AI 목소리
└─ scripts/
   └─ setup.sh                # 원본 clone + 설정 복사
```

> 주의: 아래 내용은 원본 소스와 문서를 읽고 정리한 것이고, 이 컨테이너에서 OpenJarvis를 직접 실행해 검증하지는 않았어요. 첫 실행 때 `jarvis doctor`로 상태를 꼭 확인하세요.
