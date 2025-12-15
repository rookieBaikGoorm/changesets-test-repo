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
release/vX.X.X 브랜치 생성 (로컬)
    ↓
git flow release finish (main 병합)
    ↓
main-release-tagging.yml (버전 업데이트 → 태그 생성 → Release)

[긴급 상황]
hotfix/* → main
    ↓
hotfix-automation.yml (즉시 릴리즈 & develop 백포트)
```

### 파일 위치

```
.github/workflows/
├── develop-changeset-automation.yml    # Feature → Develop 자동화
├── main-release-tagging.yml            # Release 통합 자동화
└── hotfix-automation.yml               # Hotfix 긴급 배포
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

## main-release-tagging.yml

### 목적

**Git Flow 방식**으로 Release 브랜치가 Main에 병합되면 **모든 릴리즈 작업을 자동화**합니다:
1. Changeset version 실행 (버전 업데이트)
2. 버전 업데이트 커밋 → Main에 push
3. Git 태그 생성
4. GitHub Release 생성

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
    token: ${{ secrets.GITHUB_TOKEN }}

- name: Install pnpm
  uses: pnpm/action-setup@v4

- name: Install dependencies
  run: pnpm install --frozen-lockfile --prefer-offline
```

#### 2. Release 브랜치 병합 감지

```yaml
- name: Check if release branch merge
  id: check-release
  run: |
    COMMIT_MSG=$(git log -1 --pretty=%B)

    if echo "$COMMIT_MSG" | grep -qE "Merge branch 'release/"; then
      echo "is_release=true" >> $GITHUB_OUTPUT
      echo "🎯 Release branch merge detected"
    else
      echo "is_release=false" >> $GITHUB_OUTPUT
      echo "ℹ️ Not a release merge, skipping"
    fi
```

**감지 로직**:
- `git flow release finish` 실행 시 생성되는 merge commit 메시지 확인
- 예: `Merge branch 'release/v1.0.0'`
- Release 브랜치 병합만 처리, 다른 merge는 스킵

#### 3. Changeset 존재 확인

```yaml
- name: Check for changesets
  if: steps.check-release.outputs.is_release == 'true'
  id: check-changesets
  run: |
    if [ -n "$(ls .changeset/*.md 2>/dev/null | grep -v README.md)" ]; then
      echo "has_changeset=true" >> $GITHUB_OUTPUT
      echo "✅ Changesets found, will process version update"
    else
      echo "has_changeset=false" >> $GITHUB_OUTPUT
      echo "⚠️ No changesets found"
    fi
```

**중요**: Changeset이 없으면 버전 업데이트 스킵

#### 4. Changeset Version 실행

```yaml
- name: Run changeset version
  if: steps.check-release.outputs.is_release == 'true' && steps.check-changesets.outputs.has_changeset == 'true'
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
  .changeset/auto-123.md (hooks minor)

After:
  @repo/hooks: 0.4.0 ✅
  .changeset/auto-123.md (삭제됨)
  CHANGELOG.md 생성
```

#### 5. 패키지 빌드

```yaml
- name: Build packages
  if: steps.check-release.outputs.is_release == 'true' && steps.check-changesets.outputs.has_changeset == 'true'
  run: pnpm build
```

#### 6. 버전 업데이트 커밋

```yaml
- name: Commit version updates
  if: steps.check-release.outputs.is_release == 'true' && steps.check-changesets.outputs.has_changeset == 'true'
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    git add .
    git commit -m "chore(release): version packages" || echo "No changes to commit"
    git push origin main

    echo "✅ Version updates committed to main"
```

**커밋 내용**:
- 모든 `package.json` 변경사항
- 모든 `CHANGELOG.md` 변경사항
- `.changeset/` 파일 삭제

#### 7. Git 태그 & GitHub Release 생성

```yaml
- name: Create tags and GitHub Releases
  if: steps.check-release.outputs.is_release == 'true' && steps.check-changesets.outputs.has_changeset == 'true'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    echo "📦 Creating tags for updated packages..."

    # Find all package.json files and create tags
    for pkg_json in packages/*/package.json apps/*/package.json; do
      if [ -f "$pkg_json" ]; then
        PKG_NAME=$(node -p "require('./$pkg_json').name" 2>/dev/null || echo "")
        PKG_VERSION=$(node -p "require('./$pkg_json').version" 2>/dev/null || echo "")
        TAG_NAME="${PKG_NAME}@${PKG_VERSION}"

        # Check if tag already exists
        if ! git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
          echo "📦 Creating tag: $TAG_NAME"
          git tag "$TAG_NAME"
          git push origin "$TAG_NAME"

          # Create Github Release with CHANGELOG
          CHANGELOG_PATH="${pkg_json%package.json}CHANGELOG.md"
          if [ -f "$CHANGELOG_PATH" ]; then
            RELEASE_NOTES=$(awk "/## $PKG_VERSION/,/## [0-9]/" "$CHANGELOG_PATH" | sed '1d;$d')
            gh release create "$TAG_NAME" --title "$TAG_NAME" --notes "$RELEASE_NOTES"
          else
            gh release create "$TAG_NAME" --title "$TAG_NAME" --notes "Release $TAG_NAME"
          fi

          echo "✅ Tag and release created for $TAG_NAME"
        fi
      fi
    done
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

## hotfix-automation.yml

### 목적

긴급 프로덕션 버그 수정을 위한 Hotfix 워크플로우입니다. `hotfix/*` 브랜치가 main에 머지되면:
1. 자동으로 changeset 생성
2. 즉시 버전 업데이트 및 릴리즈
3. Develop 브랜치로 자동 백포트

### 트리거

```yaml
on:
  pull_request:
    types: [closed]
    branches:
      - main
```

**조건**:
- PR이 **main 브랜치**에 머지되었을 때
- 소스 브랜치가 **hotfix/**로 시작할 때

### 워크플로우 단계

#### 1. Changeset 생성

```yaml
- name: Generate changeset
  run: |
    CHANGESET_FILE=".changeset/hotfix-${CHANGESET_ID}.md"
    echo "---" > $CHANGESET_FILE
    for pkg in $PACKAGES; do
      echo "\"$pkg\": $BUMP_TYPE" >> $CHANGESET_FILE
    done
    echo "---" >> $CHANGESET_FILE
    echo "$PR_TITLE (#$PR_NUMBER)" >> $CHANGESET_FILE
    echo "🚨 Hotfix from \`$HOTFIX_BRANCH\`" >> $CHANGESET_FILE
```

- 변경된 패키지를 동적으로 감지
- Conventional Commits 기반 버전 범프 결정 (기본: patch)
- Hotfix 표시 추가

#### 2. 즉시 릴리즈

```yaml
- name: Create hotfix release immediately
  run: |
    pnpm changeset version
    pnpm build
    git commit -m "chore(hotfix): version packages for hotfix #$PR_NUMBER"
    git push origin main
```

- Changeset 생성 직후 즉시 버전 업데이트
- 빌드 실행 및 main에 Push
- 일반 릴리즈 프로세스보다 훨씬 빠름

#### 3. Develop 백포트

```yaml
- name: Backport to develop
  run: |
    git fetch origin develop
    git checkout develop
    git merge origin/main -m "chore: backport hotfix #$PR_NUMBER from main"
    git push origin develop
```

- Hotfix 변경사항을 develop에 자동으로 백포트
- Merge conflict 발생 시 워크플로우 실패 (수동 해결 필요)

### 권한 요구사항

```yaml
permissions:
  contents: write      # Changeset 생성, 버전 업데이트, 백포트
  pull-requests: write # (미래 확장용)
```

### 주의사항

1. **Hotfix는 patch가 기본**: 긴급 수정은 일반적으로 patch 버전이지만, Conventional Commits으로 minor/major도 가능
2. **백포트 충돌**: Develop과 main이 크게 달라진 경우 백포트 중 충돌 발생 가능
3. **즉시 릴리즈**: PR 머지 즉시 프로덕션 릴리즈되므로 신중하게 사용
4. **릴리즈 브랜치 우회**: 일반 Git Flow를 우회하므로 진짜 긴급 상황에만 사용

### 사용 시나리오

```bash
# 1. Hotfix 브랜치 생성
git checkout -b hotfix/fix-critical-bug main

# 2. 버그 수정 (Conventional Commit 사용)
git commit -m "fix(ui): resolve XSS vulnerability in input component"

# 3. Main에 PR 생성 및 머지
gh pr create --base main --head hotfix/fix-critical-bug
gh pr merge --squash

# 4. 워크플로우가 자동으로:
#    - Changeset 생성
#    - 버전 업데이트 (예: 1.2.3 → 1.2.4)
#    - Main에 커밋 & Push
#    - Github Release 태그 생성
#    - Develop에 백포트
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
2. Release 브랜치 생성 (로컬)
   git flow release start v1.0.0
   (여러 커밋 작업 가능)
   ↓
3. Release 병합 (로컬)
   git flow release finish -Fpn v1.0.0
   ↓
   Main + Develop 병합
   ↓
4. Main push 감지
   [main-release-tagging.yml]
   ↓
   pnpm changeset version 실행
   package.json 업데이트
   CHANGELOG.md 업데이트
   .changeset/auto-123.md 삭제
   ↓
   Main에 버전 업데이트 커밋
   ↓
   Git 태그 생성
   Github Release 생성

[긴급 상황]
Hotfix PR 머지 (main)
   ↓
   [hotfix-automation.yml]
   ↓
   Changeset 생성 → 즉시 릴리즈 → develop 백포트
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
