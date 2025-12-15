# Github Actions 워크플로우 상세 설명

이 문서는 프로젝트의 Github Actions 워크플로우를 상세히 설명합니다.

## 목차

- [워크플로우 개요](#워크플로우-개요)
- [develop-changeset-automation.yml](#develop-changeset-automationyml)
- [main-release-tagging.yml](#main-release-taggingyml)
- [hotfix-automation.yml](#hotfix-automationyml)
- [워크플로우 간 관계](#워크플로우-간-관계)
- [커스터마이징 가이드](#커스터마이징-가이드)

---

## 워크플로우 개요

### 전체 구조

```
Feature PR → develop
    ↓
develop-changeset-automation.yml (Changeset 자동 생성)
    ↓
git flow release start (로컬)
    ↓
git flow release finish (로컬)
    ↓
pre-flow-release-finish Hook (버전 업데이트)
    ↓
main 병합 (Git Flow)
    ↓
release-tagging.yml (태그 생성 → Release)

[긴급 상황]
git flow hotfix start/finish
    ↓
pre-flow-hotfix-finish Hook (Changeset 생성 → 버전 업데이트)
    ↓
main 병합 (Git Flow)
    ↓
release-tagging.yml (태그 생성 → Release)
```

### 파일 위치

```
.husky/
├── pre-flow-release-finish             # Release 버전 업데이트 Hook
└── pre-flow-hotfix-finish              # Hotfix 버전 업데이트 Hook

.github/workflows/
├── develop-changeset-automation.yml    # Feature → Develop 자동화
└── release-tagging.yml                 # Release & Hotfix 태그/Release 생성

scripts/
└── install-gitflow-hooks.sh            # Git Flow Hook 설치 스크립트
```

---

## Git Flow Hooks

### 개요

Git Flow hooks는 `git flow` 명령 실행 시 자동으로 실행되는 스크립트입니다. 이 프로젝트에서는 release와 hotfix 완료 전에 자동으로 버전 업데이트를 수행합니다.

### 설치 방식

```bash
# pnpm install 실행 시 자동 설치
pnpm install

# scripts/install-gitflow-hooks.sh가 실행됨
# .husky/pre-flow-* → .git/hooks/pre-flow-*로 복사
```

### pre-flow-release-finish

**위치**: `.husky/pre-flow-release-finish`

**트리거**: `git flow release finish` 실행 전

**주요 로직**:

```bash
#!/bin/bash
set -e

# 1. Release 브랜치 확인
if [[ ! $BRANCH =~ ^release/ ]]; then
  exit 0
fi

# 2. Changeset 파일 확인
CHANGESET_FILES=$(ls .changeset/*.md 2>/dev/null | grep -v README.md || echo "")
if [ -z "$CHANGESET_FILES" ]; then
  # 경고 후 계속 여부 확인
fi

# 3. Changeset version 실행
pnpm changeset version

# 4. 빌드
pnpm build

# 5. 커밋
git add .
git commit -m "chore(release): version packages"
```

**결과**:
- package.json 버전 업데이트
- CHANGELOG.md 생성/업데이트
- 변경사항이 release 브랜치에 커밋됨
- `git flow release finish`가 이 커밋을 main과 develop에 병합

### pre-flow-hotfix-finish

**위치**: `.husky/pre-flow-hotfix-finish`

**트리거**: `git flow hotfix finish` 실행 전

**주요 로직**:

```bash
#!/bin/bash
set -e

# 1. Hotfix 브랜치 확인
if [[ ! $BRANCH =~ ^hotfix/ ]]; then
  exit 0
fi

# 2. 변경된 패키지 동적 감지
MAIN_BRANCH=$(git config --get gitflow.branch.master || echo "main")
CHANGED_FILES=$(git diff --name-only $MAIN_BRANCH...HEAD)

while IFS= read -r pkg; do
  PKG_DIR=$(dirname "$pkg")
  if echo "$CHANGED_FILES" | grep -q "^$PKG_DIR/"; then
    PACKAGES="$PACKAGES $PKG_NAME"
  fi
done < <(find packages apps -name package.json)

# 3. Conventional Commits 분석
COMMITS=$(git log --format=%s $MAIN_BRANCH..HEAD)
BUMP_TYPE="patch"
if echo "$COMMITS" | grep -qiE "^(feat|feature)"; then
  BUMP_TYPE="minor"
fi
if echo "$COMMITS" | grep -qiE "^(BREAKING CHANGE|.*!:)"; then
  BUMP_TYPE="major"
fi

# 4. Changeset 생성
cat > .changeset/hotfix-${CHANGESET_ID}.md << EOF
---
"$PKG_NAME": $BUMP_TYPE
---

🚨 Hotfix: $BRANCH
EOF

# 5. Version 및 빌드
pnpm changeset version
pnpm build

# 6. 커밋
git add .
git commit -m "chore(hotfix): version packages"
```

**특징**:
- 변경된 패키지를 자동으로 감지
- Conventional Commits 기반 버전 범프 자동 결정
- Changeset 자동 생성
- Release Hook과 동일한 처리 과정

### Hook 디버깅

Hook 실행 중 문제가 발생하면:

```bash
# Hook 파일 확인
ls -la .git/hooks/pre-flow-*

# 직접 실행해보기
bash -x .git/hooks/pre-flow-release-finish

# 로그 확인 (Hook은 stderr로 출력)
git flow release finish v1.0.0 2>&1 | tee release.log
```

---

## develop-changeset-automation.yml

### 목적

Feature PR이 develop에 머지될 때 Conventional Commits을 분석하여 자동으로 changeset 파일을 생성합니다.

### 트리거

```yaml
on:
  pull_request:
    types: [closed]
    branches:
      - develop
```

**조건**:
- PR이 **develop 브랜치**에 머지되었을 때만
- PR이 **closed**되고 **merged=true**일 때

### 워크플로우 단계

#### 1. Checkout

```yaml
- name: Checkout Repo
  uses: actions/checkout@v4
  with:
    fetch-depth: 0  # 전체 히스토리 (커밋 분석용)
    token: ${{ secrets.GITHUB_TOKEN }}
```

#### 2. 환경 설정

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22

- name: Install pnpm
  uses: pnpm/action-setup@v4
  # packageManager 필드에서 자동으로 버전 읽음

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

#### 3. 기존 Changeset 확인

```yaml
- name: Check for existing changesets
  id: check-changesets
  run: |
    if [ -n "$(ls .changeset/*.md 2>/dev/null | grep -v README.md)" ]; then
      echo "has_changeset=true" >> $GITHUB_OUTPUT
      echo "✅ Changeset already exists"
    else
      echo "has_changeset=false" >> $GITHUB_OUTPUT
      echo "⚠️ No changeset found, will auto-generate"
    fi
```

**로직**:
- `.changeset/` 디렉토리에 `.md` 파일이 있으면 changeset 존재로 판단
- `README.md`는 제외
- 이미 changeset이 있으면 나머지 단계 스킵 (중복 방지)

#### 4. 변경된 패키지 감지

```yaml
- name: Detect changed packages
  if: steps.check-changesets.outputs.has_changeset == 'false'
  id: detect-packages
  run: |
    # Get list of changed files in the PR
    CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)

    # Detect changed packages (동적 탐색)
    PACKAGES=""
    while IFS= read -r pkg; do
      PKG_DIR=$(dirname "$pkg")
      PKG_NAME=$(node -p "require('./$pkg').name")

      if echo "$CHANGED_FILES" | grep -q "^$PKG_DIR/"; then
        PACKAGES="$PACKAGES $PKG_NAME"
      fi
    done < <(find packages apps -name package.json)

    echo "packages=$PACKAGES" >> $GITHUB_OUTPUT
    echo "Changed packages: $PACKAGES"
```

**동작 방식**:
1. `find packages apps -name package.json`
   - `packages/` 와 `apps/` 하위의 모든 `package.json` 파일 찾기
   - 재귀적으로 탐색

2. 각 `package.json`에 대해:
   - 디렉토리 경로 추출: `PKG_DIR=$(dirname "$pkg")`
   - 패키지명 읽기: `PKG_NAME=$(node -p "require('./$pkg').name")`
   - 변경 파일에 해당 디렉토리가 포함되어 있으면 추가

**장점**:
- ✅ 새 패키지 추가 시 워크플로우 수정 불필요
- ✅ 자동으로 모든 패키지 감지
- ✅ 확장성 우수

**예시**:
```
packages/
  ui/package.json → "@repo/ui"
  hooks/package.json → "@repo/hooks"
  utils/package.json → "@repo/utils" (새 패키지도 자동 감지!)
apps/
  web/package.json → "web"
  admin/package.json → "admin" (새 앱도 자동 감지!)
```

#### 5. Conventional Commits 분석

```yaml
- name: Analyze commits and determine version bump
  if: steps.check-changesets.outputs.has_changeset == 'false'
  id: analyze-commits
  run: |
    # Get commit messages from the PR
    COMMITS=$(git log --format=%s HEAD~1..HEAD)

    # Determine version bump type based on conventional commits
    BUMP_TYPE="patch"
    if echo "$COMMITS" | grep -qiE "^(feat|feature)(\(.+\))?!?:"; then
      BUMP_TYPE="minor"
    fi
    if echo "$COMMITS" | grep -qiE "^(BREAKING CHANGE|.*!:)"; then
      BUMP_TYPE="major"
    fi

    echo "bump_type=$BUMP_TYPE" >> $GITHUB_OUTPUT
    echo "Version bump type: $BUMP_TYPE"
```

**버전 결정 규칙**:
```
기본값: patch

커밋 메시지에 "feat:" 또는 "feature:" 포함
→ minor

커밋 메시지에 "feat!:" 또는 "BREAKING CHANGE:" 포함
→ major
```

**예시**:
```bash
"fix(hooks): fix memory leak"          → patch
"feat(hooks): add new hook"            → minor
"feat(hooks)!: change API"             → major
"feat: add feature

BREAKING CHANGE: API changed"          → major
```

#### 6. Changeset 파일 생성

```yaml
- name: Generate changeset
  if: steps.check-changesets.outputs.has_changeset == 'false' && steps.detect-packages.outputs.packages != ''
  run: |
    PR_TITLE="${{ github.event.pull_request.title }}"
    PR_NUMBER="${{ github.event.pull_request.number }}"
    BUMP_TYPE="${{ steps.analyze-commits.outputs.bump_type }}"
    PACKAGES="${{ steps.detect-packages.outputs.packages }}"

    # Create changeset file
    CHANGESET_ID=$(date +%s)
    CHANGESET_FILE=".changeset/auto-${CHANGESET_ID}.md"

    # Write changeset
    echo "---" > $CHANGESET_FILE
    for pkg in $PACKAGES; do
      echo "\"$pkg\": $BUMP_TYPE" >> $CHANGESET_FILE
    done
    echo "---" >> $CHANGESET_FILE
    echo "" >> $CHANGESET_FILE
    echo "$PR_TITLE (#$PR_NUMBER)" >> $CHANGESET_FILE

    cat $CHANGESET_FILE
```

**생성된 파일 예시**:
```markdown
---
"@repo/hooks": minor
"@repo/ui": minor
"web": patch
---

feat(hooks,ui): add theme support (#42)
```

**파일명**: `auto-{timestamp}.md`
- timestamp: Unix timestamp (초 단위)
- 중복 방지 보장

#### 7. Changeset 커밋 & Push

```yaml
- name: Commit and push changeset to develop
  if: steps.check-changesets.outputs.has_changeset == 'false' && steps.detect-packages.outputs.packages != ''
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    git add .changeset/
    git commit -m "chore: auto-generate changeset for PR #${{ github.event.pull_request.number }}"
    git push origin develop
```

**커밋 메시지**: `chore: auto-generate changeset for PR #{number}`

### 권한 요구사항

```yaml
permissions:
  contents: write      # Changeset 커밋 & Push
  pull-requests: write # (미래 확장용)
```

### 환경 변수

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # 자동 제공
```

### 에러 처리

- 기존 changeset 존재 시: 스킵 (중복 방지)
- 변경된 패키지 없음: 스킵
- Git push 실패: 워크플로우 실패 (재시도 필요)

---

## release-tagging.yml

### 목적

Release 또는 Hotfix 브랜치가 Main에 병합되면 **Git 태그와 GitHub Release를 자동 생성**합니다.

**중요**: 버전 업데이트는 Git Flow Hook에서 이미 완료되었으므로, 이 워크플로우는 **태그와 Release 생성만** 담당합니다.

### 트리거

```yaml
on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}
```

**Concurrency**:
- 동일 브랜치(ref)에서 하나의 release 워크플로우만 실행
- 동시 실행 방지

### 워크플로우 단계

#### 1. 환경 설정

```yaml
- name: Checkout Repo
  uses: actions/checkout@v4
  with:
    fetch-depth: 0

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
```

#### 2. Release/Hotfix 브랜치 병합 감지

```yaml
- name: Check merge type
  id: check-merge
  run: |
    COMMIT_MSG=$(git log -1 --pretty=%B)

    if echo "$COMMIT_MSG" | grep -qE "Merge branch '(release|hotfix)/"; then
      echo "is_release_or_hotfix=true" >> $GITHUB_OUTPUT

      if echo "$COMMIT_MSG" | grep -qE "Merge branch 'release/"; then
        echo "merge_type=release" >> $GITHUB_OUTPUT
        echo "🎯 Release 브랜치 병합 감지됨"
      elif echo "$COMMIT_MSG" | grep -qE "Merge branch 'hotfix/"; then
        echo "merge_type=hotfix" >> $GITHUB_OUTPUT
        echo "🚨 Hotfix 브랜치 병합 감지됨"
      fi
    else
      echo "is_release_or_hotfix=false" >> $GITHUB_OUTPUT
      echo "ℹ️ Release/Hotfix 병합이 아님, 스킵"
    fi
```

**감지 로직**:
- `git flow release finish` → `Merge branch 'release/v1.0.0'`
- `git flow hotfix finish` → `Merge branch 'hotfix/fix-bug'`
- Release와 Hotfix 모두 감지하여 처리

#### 3. Git 태그 & GitHub Release 생성

```yaml
- name: Create tags and GitHub Releases
  if: steps.check-merge.outputs.is_release_or_hotfix == 'true'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    MERGE_TYPE="${{ steps.check-merge.outputs.merge_type }}"

    if [ "$MERGE_TYPE" = "hotfix" ]; then
      echo "📦 Hotfix 태그 생성 중..."
      TITLE_SUFFIX=" (Hotfix)"
    else
      echo "📦 Release 태그 생성 중..."
      TITLE_SUFFIX=""
    fi

    echo ""
    echo "ℹ️  버전 업데이트는 git-flow hook에서 이미 완료되었습니다"
    echo ""

    # 모든 package.json 파일을 찾아서 태그 생성
    for pkg_json in packages/*/package.json apps/*/package.json; do
      if [ ! -f "$pkg_json" ]; then continue; fi

      PKG_NAME=$(node -p "require('./$pkg_json').name" 2>/dev/null || echo "")
      if [ -z "$PKG_NAME" ]; then continue; fi

      PKG_VERSION=$(node -p "require('./$pkg_json').version" 2>/dev/null || echo "")
      if [ -z "$PKG_VERSION" ]; then continue; fi

      TAG_NAME="${PKG_NAME}@${PKG_VERSION}"

      # 태그가 이미 존재하는지 확인
      if ! git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
        echo "📦 태그 생성: $TAG_NAME"
        git tag "$TAG_NAME"
        git push origin "$TAG_NAME"

        # Github Release 생성
        CHANGELOG_PATH="${pkg_json%package.json}CHANGELOG.md"
        if [ -f "$CHANGELOG_PATH" ]; then
          RELEASE_NOTES=$(awk "/## $PKG_VERSION/,/## [0-9]/" "$CHANGELOG_PATH" | sed '1d;$d')

          if [ -n "$RELEASE_NOTES" ]; then
            gh release create "$TAG_NAME" \
              --title "${TAG_NAME}${TITLE_SUFFIX}" \
              --notes "$RELEASE_NOTES"
          else
            gh release create "$TAG_NAME" \
              --title "${TAG_NAME}${TITLE_SUFFIX}" \
              --notes "Release $TAG_NAME"
          fi
        else
          gh release create "$TAG_NAME" \
            --title "${TAG_NAME}${TITLE_SUFFIX}" \
            --notes "Release $TAG_NAME"
        fi

        echo "✅ 태그 및 릴리즈 생성 완료: $TAG_NAME"
        echo ""
      else
        echo "✅ 태그 $TAG_NAME 이미 존재함, 스킵"
        echo ""
      fi
    done

    echo "✅ 모든 릴리즈 배포 완료"
```

**로직 상세**:

1. **패키지 탐색**:
   ```bash
   for pkg_json in packages/*/package.json apps/*/package.json
   ```
   - `packages/` 하위 모든 패키지
   - `apps/` 하위 모든 애플리케이션

3. **버전 읽기**:
   ```bash
   PKG_NAME=$(node -p "require('./$pkg_json').name")
   PKG_VERSION=$(node -p "require('./$pkg_json').version")
   TAG_NAME="${PKG_NAME}@${PKG_VERSION}"
   ```
   - 예시: `@repo/hooks` + `1.0.0` → `@repo/hooks@1.0.0`

4. **태그 중복 확인**:
   ```bash
   if ! git rev-parse "$TAG_NAME" >/dev/null 2>&1
   ```
   - 이미 존재하는 태그는 스킵

5. **태그 생성 & Push**:
   ```bash
   git tag "$TAG_NAME"
   git push origin "$TAG_NAME"
   ```

6. **CHANGELOG 추출**:
   ```bash
   awk "/## $PKG_VERSION/,/## [0-9]/" "$CHANGELOG_PATH" | sed '1d;$d'
   ```
   - CHANGELOG에서 해당 버전 섹션만 추출
   - 첫 줄(## 버전)과 마지막 줄(다음 ##) 제거

7. **Github Release 생성**:
   ```bash
   gh release create "$TAG_NAME" \
     --title "$TAG_NAME" \
     --notes "$RELEASE_NOTES"
   ```

**생성 예시**:
```
Tag: @repo/hooks@1.0.0
Title: @repo/hooks@1.0.0
Notes:
### Minor Changes

- feat(hooks): add useDebounce hook (#15)
- feat(hooks): add useThrottle hook (#16)

### Patch Changes

- fix(hooks): fix memory leak (#17)
```

**특징**:
- Release와 Hotfix를 단일 워크플로우로 처리
- Hotfix Release에는 "(Hotfix)" 접미사 추가
- 버전 업데이트는 Hook에서 이미 완료되었으므로 즉시 태그 생성 가능

### 권한 요구사항

```yaml
permissions:
  contents: write      # 태그 생성 & Push
  pull-requests: write # (미래 확장용)
```

### npm Publish

현재는 **npm publish를 하지 않습니다**. 이는 내부 모노레포용 버전 관리이기 때문입니다.

npm publish를 활성화하려면:

```yaml
- name: Publish to npm
  run: |
    echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
    pnpm changeset publish
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 워크플로우 간 관계

### 데이터 흐름

```
1. Feature PR 머지 (develop)
   ↓
   [develop-changeset-automation.yml]
   ↓
   .changeset/auto-123.md 생성
   ↓
2. Release 시작 및 완료 (로컬)
   git flow release start v1.0.0
   git flow release finish -Fpn v1.0.0
   ↓
   [pre-flow-release-finish Hook] (로컬 실행)
   ↓
   pnpm changeset version 실행
   package.json 업데이트
   CHANGELOG.md 업데이트
   .changeset/auto-123.md 삭제
   커밋 생성
   ↓
   Git Flow가 main + develop에 병합
   ↓
3. Main push 감지
   [release-tagging.yml]
   ↓
   Git 태그 생성
   Github Release 생성

[긴급 상황]
git flow hotfix start/finish (로컬)
   ↓
   [pre-flow-hotfix-finish Hook] (로컬 실행)
   ↓
   변경 패키지 감지
   Changeset 생성
   pnpm changeset version 실행
   버전 업데이트
   커밋 생성
   ↓
   Git Flow가 main + develop에 병합
   ↓
   [release-tagging.yml]
   ↓
   Git 태그 생성
   Github Release 생성 (Hotfix 표시)
```

### 상태 전이

```
State 1: Clean develop
  ↓ (Feature PR 머지)
State 2: Develop with changesets
  ↓ (git flow release start)
State 3: Release 브랜치 (changeset 포함)
  ↓ (git flow release finish)
  ↓ (Hook: 버전 업데이트 + 커밋)
State 4: Release 브랜치 (버전 업데이트됨)
  ↓ (Git Flow: main + develop 병합)
State 5: Main & Develop with new versions
  ↓ (GitHub Actions: 태그 생성)
State 6: Tagged release
```

### 의존성

```
pre-flow-release-finish Hook
  depends on:
    - .changeset/*.md (develop-changeset-automation.yml이 생성)

pre-flow-hotfix-finish Hook
  depends on:
    - Git commit history (Conventional Commits 분석)
    - Changed files (패키지 감지)

release-tagging.yml
  depends on:
    - package.json 버전 (Hook이 업데이트)
    - CHANGELOG.md (Hook이 업데이트)
    - Git Flow merge commit 메시지
```

### Hook과 GitHub Actions의 역할 분담

```
로컬 (Git Flow Hooks):
  ✅ Changeset version 실행
  ✅ 버전 업데이트
  ✅ CHANGELOG 생성
  ✅ 빌드
  ✅ 커밋

Git Flow:
  ✅ Main + Develop 병합
  ✅ 브랜치 관리

GitHub Actions:
  ✅ Git 태그 생성
  ✅ GitHub Release 생성
  ✅ Feature PR Changeset 자동 생성
```

---

## 커스터마이징 가이드

### 새 패키지 추가

**✅ 워크플로우 수정 불필요!**

동적 패키지 탐색 덕분에 새 패키지를 추가해도 워크플로우를 수정할 필요가 없습니다:

```bash
# 1. 새 패키지 생성
mkdir -p packages/utils
cat > packages/utils/package.json << 'EOF'
{
  "name": "@repo/utils",
  "version": "0.1.0"
}
EOF

# 2. 끝! 자동으로 감지됩니다 ✨
```

**자동 감지 로직**:
- `auto-changeset.yml`: `find packages apps -name package.json`으로 자동 탐색
- `release.yml`: `packages/*/package.json` 패턴으로 자동 탐색

둘 다 수정 불필요!

### 버전 규칙 변경

**auto-changeset.yml 수정**:

```yaml
# 예: docs: 커밋도 patch로 처리
BUMP_TYPE="patch"
if echo "$COMMITS" | grep -qiE "^(feat|feature|docs)(\(.+\))?!?:"; then
  BUMP_TYPE="minor"
fi
```

### 다른 브랜치 전략

**develop 대신 staging 사용**:

```yaml
# auto-changeset.yml
on:
  pull_request:
    types: [closed]
    branches:
      - staging  # develop → staging

# release-branch.yml
# 변경 불필요 (release/* 패턴 유지)
```

### Auto-merge 비활성화

**release-branch.yml 수정**:

```yaml
# Auto-merge 섹션 제거
# PR만 생성하고 수동 머지
PR_URL=$(gh pr create \
  --base main \
  --head ${{ github.ref_name }} \
  --title "chore(release): ${VERSION}" \
  --body "...")

echo "✅ PR created: $PR_URL"
# gh pr merge 호출 제거
```

### npm Publish 활성화

**release.yml에 추가**:

```yaml
- name: Publish to npm
  run: |
    echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
    pnpm changeset publish
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Repository Secrets 추가**:
- Settings → Secrets → Actions
- `NPM_TOKEN` 추가 (npmjs.com 토큰)

### Slack 알림 추가

**각 워크플로우에 추가**:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "✅ Release ${{ github.ref_name }} completed!"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 참고 문서

- [Automation Guide](./AUTOMATION_GUIDE.md) - 전체 자동화 가이드
- [Test Scenarios](./TEST_SCENARIOS.md) - 테스트 시나리오
- [Developer Guide](./DEVELOPER_GUIDE.md) - 개발자 실용 가이드
- [Github Actions Documentation](https://docs.github.com/en/actions) - Github Actions 공식 문서
