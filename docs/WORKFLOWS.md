# Github Actions 워크플로우 상세 설명

이 문서는 프로젝트의 Github Actions 워크플로우를 상세히 설명합니다.

## 목차

- [워크플로우 개요](#워크플로우-개요)
- [auto-changeset.yml](#auto-changesetyml)
- [release-branch.yml](#release-branchyml)
- [release.yml](#releaseyml)
- [워크플로우 간 관계](#워크플로우-간-관계)
- [커스터마이징 가이드](#커스터마이징-가이드)

---

## 워크플로우 개요

### 전체 구조

```
Feature PR → develop
    ↓
auto-changeset.yml (Changeset 자동 생성)
    ↓
release/vX.X.X 브랜치 생성
    ↓
release-branch.yml (버전 업데이트 & PR 생성)
    ↓
main PR 자동 머지
    ↓
release.yml (Github Release 태그 생성)
```

### 파일 위치

```
.github/workflows/
├── auto-changeset.yml      # Feature → Develop 자동화
├── release-branch.yml      # Release 브랜치 자동화
└── release.yml             # Main 배포 자동화
```

---

## auto-changeset.yml

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

    # Detect changed packages
    PACKAGES=""
    if echo "$CHANGED_FILES" | grep -q "^packages/ui/"; then
      PACKAGES="$PACKAGES @repo/ui"
    fi
    if echo "$CHANGED_FILES" | grep -q "^packages/hooks/"; then
      PACKAGES="$PACKAGES @repo/hooks"
    fi
    if echo "$CHANGED_FILES" | grep -q "^apps/web/"; then
      PACKAGES="$PACKAGES web"
    fi

    echo "packages=$PACKAGES" >> $GITHUB_OUTPUT
    echo "Changed packages: $PACKAGES"
```

**감지 대상**:
- `packages/ui/` → `@repo/ui`
- `packages/hooks/` → `@repo/hooks`
- `apps/web/` → `web`

**새 패키지 추가 방법**:
```yaml
if echo "$CHANGED_FILES" | grep -q "^packages/utils/"; then
  PACKAGES="$PACKAGES @repo/utils"
fi
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

## release-branch.yml

### 목적

Release 브랜치가 생성되면 자동으로:
1. `pnpm changeset version` 실행하여 버전 업데이트
2. 변경사항을 release 브랜치에 커밋
3. Main으로 PR 자동 생성
4. Auto-merge 활성화

### 트리거

```yaml
on:
  push:
    branches:
      - 'release/**'
```

**조건**:
- `release/` prefix로 시작하는 모든 브랜치
- 예시: `release/v1.0.0`, `release/2024-Q1`

### 워크플로우 단계

#### 1. 환경 설정

```yaml
- name: Checkout Repo
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
    token: ${{ secrets.GITHUB_TOKEN }}

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22

- name: Install pnpm
  uses: pnpm/action-setup@v4

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

#### 2. 중복 실행 방지

```yaml
- name: Check if version already updated
  id: check-version
  run: |
    if git log -1 --pretty=%B | grep -q "chore(release): version packages"; then
      echo "already_versioned=true" >> $GITHUB_OUTPUT
      echo "✅ Version already updated"
    else
      echo "already_versioned=false" >> $GITHUB_OUTPUT
      echo "⚠️ Need to run version update"
    fi
```

**로직**:
- 가장 최근 커밋 메시지에 "chore(release): version packages"가 있으면 스킵
- Release 브랜치에 추가 push가 발생해도 중복 실행 방지

#### 3. Changeset Version 실행

```yaml
- name: Run changeset version
  if: steps.check-version.outputs.already_versioned == 'false'
  run: |
    pnpm changeset version
    echo "✅ Version updated successfully"
```

**실행 내용**:
1. `.changeset/*.md` 파일들을 읽어서 소비
2. `package.json`의 `version` 필드 업데이트
3. `CHANGELOG.md` 생성 또는 업데이트
4. 사용된 changeset 파일 삭제
5. 의존성 체인에 따라 관련 패키지도 업데이트

**예시**:
```
Before:
  @repo/hooks: 0.3.0
  web: 0.0.4
  .changeset/auto-123.md (hooks minor)

After:
  @repo/hooks: 0.4.0 ✅
  web: 0.0.5 ✅ (의존성 업데이트)
  .changeset/auto-123.md (삭제됨)
```

#### 4. 패키지 빌드

```yaml
- name: Build packages
  if: steps.check-version.outputs.already_versioned == 'false'
  run: pnpm build
```

**목적**:
- TypeScript 컴파일 확인
- 빌드 에러 사전 감지

#### 5. 버전 업데이트 커밋

```yaml
- name: Commit version updates
  if: steps.check-version.outputs.already_versioned == 'false'
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    git add .
    git commit -m "chore(release): version packages" || echo "No changes to commit"
    git push origin ${{ github.ref_name }}
```

**커밋 내용**:
- 모든 `package.json` 변경사항
- 모든 `CHANGELOG.md` 변경사항
- `.changeset/` 파일 삭제

#### 6. Main PR 생성 & Auto-merge

```yaml
- name: Create PR to main
  if: steps.check-version.outputs.already_versioned == 'false'
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    # Check if PR already exists
    EXISTING_PR=$(gh pr list --base main --head ${{ github.ref_name }} --json number --jq '.[0].number')

    if [ -z "$EXISTING_PR" ]; then
      VERSION="${{ github.ref_name }}"
      VERSION="${VERSION#release/}"

      # Create PR
      PR_URL=$(gh pr create \
        --base main \
        --head ${{ github.ref_name }} \
        --title "chore(release): ${VERSION}" \
        --body "Release ${VERSION} - Version updates from changesets. Github Release tags will be created after merge.")

      echo "✅ PR created: $PR_URL"

      # Enable auto-merge
      PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]\+$')
      gh pr merge $PR_NUMBER --auto --squash
      echo "✅ Auto-merge enabled for PR #$PR_NUMBER"
    else
      echo "✅ PR already exists: #$EXISTING_PR"
    fi
```

**PR 생성 로직**:
1. 기존 PR 존재 여부 확인 (중복 방지)
2. 브랜치명에서 버전 추출 (`release/v1.0.0` → `v1.0.0`)
3. `gh pr create`로 PR 생성
4. `gh pr merge --auto`로 auto-merge 활성화

**Auto-merge**:
- 모든 status checks가 통과하면 자동으로 squash merge
- Repository 설정에서 "Allow auto-merge" 활성화 필요

### 권한 요구사항

```yaml
permissions:
  contents: write      # 커밋 & Push
  pull-requests: write # PR 생성 & Auto-merge
```

### Repository 설정 요구사항

1. **Actions 권한**:
   - Settings → Actions → General → Workflow permissions
   - "Allow GitHub Actions to create and approve pull requests" ✅

2. **Auto-merge 활성화**:
   - Settings → General → Pull Requests
   - "Allow auto-merge" ✅

---

## release.yml

### 목적

Main 브랜치에 release merge가 발생하면:
1. 각 패키지의 버전을 읽어서 Git 태그 생성
2. CHANGELOG에서 release notes 추출
3. Github Release 자동 생성

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

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20

- name: Install pnpm
  uses: pnpm/action-setup@v4

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build packages
  run: pnpm build
```

#### 2. Release Merge 감지 & 태그 생성

```yaml
- name: Check for version changes and create tags
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    # Check if this is a release merge (contains version updates)
    if git log -1 --pretty=%B | grep -q "chore(release):"; then
      echo "🎯 Release merge detected, creating tags..."

      # Find all package.json files and create tags
      for pkg_json in packages/*/package.json apps/*/package.json; do
        if [ -f "$pkg_json" ]; then
          PKG_NAME=$(node -p "require('./$pkg_json').name")
          PKG_VERSION=$(node -p "require('./$pkg_json').version")
          TAG_NAME="${PKG_NAME}@${PKG_VERSION}"

          # Check if tag already exists
          if ! git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
            echo "📦 Creating tag: $TAG_NAME"
            git tag "$TAG_NAME"
            git push origin "$TAG_NAME"

            # Create Github Release
            CHANGELOG_PATH="${pkg_json%package.json}CHANGELOG.md"
            if [ -f "$CHANGELOG_PATH" ]; then
              # Extract changelog for this version
              RELEASE_NOTES=$(awk "/## $PKG_VERSION/,/## [0-9]/" "$CHANGELOG_PATH" | sed '1d;$d')
              gh release create "$TAG_NAME" \
                --title "$TAG_NAME" \
                --notes "$RELEASE_NOTES" || echo "⚠️ Failed to create release for $TAG_NAME"
            else
              gh release create "$TAG_NAME" \
                --title "$TAG_NAME" \
                --notes "Release $TAG_NAME" || echo "⚠️ Failed to create release for $TAG_NAME"
            fi

            echo "✅ Tag and release created for $TAG_NAME"
          else
            echo "✅ Tag $TAG_NAME already exists, skipping"
          fi
        fi
      done
    else
      echo "ℹ️ Not a release merge, skipping tag creation"
    fi
```

**로직 상세**:

1. **Release Merge 확인**:
   ```bash
   git log -1 --pretty=%B | grep -q "chore(release):"
   ```
   - 가장 최근 커밋 메시지에 "chore(release):" 포함 여부

2. **패키지 탐색**:
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
   [auto-changeset.yml]
   ↓
   .changeset/auto-123.md 생성
   ↓
2. Release 브랜치 push
   ↓
   [release-branch.yml]
   ↓
   pnpm changeset version 실행
   ↓
   package.json 업데이트
   CHANGELOG.md 업데이트
   .changeset/auto-123.md 삭제
   ↓
   Main PR 생성 + Auto-merge
   ↓
3. Main 머지
   ↓
   [release.yml]
   ↓
   Git 태그 생성
   Github Release 생성
```

### 상태 전이

```
State 1: Clean develop
  ↓ (Feature PR 머지)
State 2: Develop with changesets
  ↓ (Release 브랜치 생성)
State 3: Release 브랜치 (버전 업데이트됨)
  ↓ (Main PR 머지)
State 4: Main with new versions
  ↓ (Release 태그 생성)
State 5: Tagged release
```

### 의존성

```
release-branch.yml
  depends on:
    - .changeset/*.md (auto-changeset.yml이 생성)

release.yml
  depends on:
    - package.json 버전 (release-branch.yml이 업데이트)
    - CHANGELOG.md (release-branch.yml이 업데이트)
```

---

## 커스터마이징 가이드

### 새 패키지 추가

**auto-changeset.yml 수정**:

```yaml
# Detect changed packages 섹션에 추가
if echo "$CHANGED_FILES" | grep -q "^packages/new-package/"; then
  PACKAGES="$PACKAGES @repo/new-package"
fi
```

**release.yml은 자동 감지** (수정 불필요):
- `packages/*/package.json` 패턴으로 자동 탐색

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
