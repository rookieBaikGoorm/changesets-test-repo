#!/bin/bash
#
# Git Flow Hooks 자동 설치 스크립트
# pnpm install 시 자동으로 실행됩니다
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HUSKY_DIR="$PROJECT_ROOT/.husky"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Git 저장소 확인
if [ ! -d "$GIT_HOOKS_DIR" ]; then
  echo "⚠️  .git/hooks 디렉토리가 없습니다. Git 저장소가 아닙니다."
  exit 0
fi

# Git Flow hooks 복사
echo "🔧 Git Flow hooks 설치 중..."

for hook_file in "$HUSKY_DIR"/pre-flow-*; do
  if [ ! -f "$hook_file" ]; then
    continue
  fi

  HOOK_NAME=$(basename "$hook_file")
  TARGET="$GIT_HOOKS_DIR/$HOOK_NAME"

  cp "$hook_file" "$TARGET"
  chmod +x "$TARGET"

  echo "  ✅ $HOOK_NAME 설치 완료"
done

echo "✨ Git Flow hooks 설치 완료!"
