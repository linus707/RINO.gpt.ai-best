#!/usr/bin/env bash
# OpenJarvis 원본을 옆 폴더에 clone하고 리노 설정을 적용합니다.
# 사용: bash openjarvis/scripts/setup.sh [chat|research|monitor]
set -euo pipefail

PRESET="${1:-chat}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${OPENJARVIS_DIR:-$HERE/../../OpenJarvis}"
CONF_SRC="$HERE/configs/rino-$PRESET.toml"
CONF_DST="$HOME/.openjarvis/config.toml"

[ -f "$CONF_SRC" ] || { echo "알 수 없는 프리셋: $PRESET (chat|research|monitor)"; exit 1; }
command -v git >/dev/null || { echo "git이 필요해요"; exit 1; }
command -v uv  >/dev/null || { echo "uv가 필요해요: https://docs.astral.sh/uv/"; exit 1; }

if [ -d "$TARGET/.git" ]; then
  echo "[info] 이미 clone됨: $TARGET (git pull)"
  git -C "$TARGET" pull --ff-only
else
  git clone --depth 1 https://github.com/open-jarvis/OpenJarvis.git "$TARGET"
fi

( cd "$TARGET" && uv sync )

mkdir -p "$HOME/.openjarvis"
if [ -f "$CONF_DST" ]; then
  cp "$CONF_DST" "$CONF_DST.bak.$(date +%Y%m%d%H%M%S)"
  echo "[info] 기존 설정 백업 완료"
fi
cp "$CONF_SRC" "$CONF_DST"

cat <<MSG
[ok] 완료
  원본: $TARGET
  설정: $CONF_DST  (rino-$PRESET)
다음:
  cd "$TARGET" && source .venv/bin/activate
  ollama pull qwen3.5:4b
  jarvis doctor
MSG
