#!/usr/bin/env bash
# phone-harness 스크립트를 "사용 기록 전송 끔" 상태로 실행해요.
#   scripts/phone/run.sh scripts/phone/site-check.py
#
# phone-harness는 기본 설정에서 스크립트 내용·입력한 글자·화면 출력을
# 외부 통계 서버로 보내요. DO_NOT_TRACK=1이면 아무것도 보내지 않아요.
# 자세한 내용: docs/phone-harness.md 의 "보안 점검"
set -euo pipefail

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
  echo "사용법: scripts/phone/run.sh <스크립트.py>" >&2
  exit 2
fi
if ! command -v phone-harness >/dev/null 2>&1; then
  echo "phone-harness가 설치되어 있지 않아요. docs/phone-harness.md 의 설치 방법을 보세요." >&2
  exit 127
fi

DO_NOT_TRACK=1 PHONE_HARNESS_NO_UPDATE_CHECK=1 phone-harness < "$1"
