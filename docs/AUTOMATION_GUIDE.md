# Changesets 자동화 가이드

이 문서는 Git Flow + Changesets를 사용한 완전 자동화된 버전 관리 시스템을 설명합니다.

## 목차

- [개요](#개요)
- [전체 워크플로우](#전체-워크플로우)
- [자동화 구성요소](#자동화-구성요소)
- [개발자 경험](#개발자-경험)
- [Release 담당자 가이드](#release-담당자-가이드)
- [트러블슈팅](#트러블슈팅)

---

## 개요

### 핵심 목표

1. **Zero Configuration for Developers**: 개발자는 Changesets를 전혀 신경쓰지 않음
2. **Conventional Commits Only**: 표준 커밋 메시지만 사용
3. **Fully Automated Release**: Release 브랜치 push만으로 완전 자동 배포
4. **Git Flow Support**: Feature → Develop → Release → Main 전략 지원

### 자동화 범위

```
✅ Changeset 자동 생성 (Feature → Develop 머지 시)
✅ 버전 번호 자동 계산 (Conventional Commits 분석)
✅ CHANGELOG 자동 생성
✅ Release PR 자동 생성
✅ Auto-merge 자동 활성화
✅ Github Release 태그 자동 생성
❌ npm 배포 (의도적으로 비활성화)
```

---

## 전체 워크플로우

### 1단계: Feature 개발 (Developer)

```bash
# 1. Feature 브랜치 생성
git checkout develop
git checkout -b feature/add-new-hook

# 2. 코드 작성 및 Conventional Commit
git add packages/hooks/src/useDebounce.ts
git commit -m "feat(hooks): add useDebounce hook"

# 3. PR 생성 (develop 대상)
gh pr create --base develop \
  --title "feat(hooks): add useDebounce hook" \
  --body "Add new debounce hook for performance optimization"
```

**개발자가 하지 않는 것**:
- ❌ `pnpm changeset` 실행
- ❌ Changeset 파일 수동 생성
- ❌ 버전 번호 고민

### 2단계: PR 머지 → 자동 Changeset 생성

```yaml
# .github/workflows/develop-changeset-automation.yml이 자동 실행

1. PR이 develop에 머지됨
2. Conventional Commit 분석:
   - feat: → minor
   - fix: → patch
   - feat!: / BREAKING CHANGE: → major
3. 변경된 패키지 감지:
   - packages/hooks/ → @repo/hooks
   - apps/web/ → web
4. Changeset 파일 자동 생성:
   .changeset/auto-1234567890.md
5. Develop 브랜치에 자동 커밋
```

**생성된 Changeset 예시**:
```markdown
---
"@repo/hooks": minor
---

feat(hooks): add useDebounce hook (#15)
```

### 3단계: Release 준비 및 완료 (Release Manager)

여러 Feature가 develop에 누적된 후:

```bash
# 1. Develop 최신 상태 확인
git checkout develop
git pull origin develop

# 2. Changeset 확인
ls .changeset/*.md
# auto-111.md, auto-222.md, auto-333.md

# 3. Git Flow Release 시작
git flow release start v1.0.0

# 4. Git Flow Release 완료
git flow release finish -Fpn v1.0.0

# ✅ Git Flow Hook이 자동으로:
#    - pnpm changeset version 실행
#    - package.json 버전 업데이트
#    - CHANGELOG.md 생성
#    - 변경사항 커밋
#    - main과 develop에 병합
```

**업데이트 예시**:
```
@repo/hooks: 0.3.0 → 1.0.0
@repo/ui: 0.2.1 → 0.2.2
web: 0.0.7 → 0.0.8
```

### 4단계: 자동 태그 & Release 생성

```yaml
# .github/workflows/release-tagging.yml이 자동 실행

1. Release 브랜치 병합 감지
2. 각 패키지의 버전 읽기
3. Git 태그 생성:
   - @repo/hooks@1.0.0
   - @repo/ui@0.2.2
   - web@0.0.8
4. Github Release 생성 (CHANGELOG 포함)
5. 태그를 origin에 push
```

---

## 자동화 구성요소

### 1. Git Flow Hooks (.husky/)

**위치**: `.husky/pre-flow-release-finish`, `.husky/pre-flow-hotfix-finish`

**설치**: `pnpm install` 시 자동 설치 (`.git/hooks/`로 복사)

#### pre-flow-release-finish

**트리거**: `git flow release finish` 실행 전

**주요 기능**:
1. Changeset 존재 확인
2. Changeset version 실행
   ```bash
   pnpm changeset version
   ```
3. 패키지 빌드
   ```bash
   pnpm build
   ```
4. 변경사항 커밋
   ```bash
   git commit -m "chore(release): version packages"
   ```

**결과**: Git Flow가 버전 업데이트를 포함하여 main과 develop 모두에 병합

#### pre-flow-hotfix-finish

**트리거**: `git flow hotfix finish` 실행 전

**주요 기능**:
1. 변경된 패키지 동적 감지
2. Conventional Commits 분석하여 버전 범프 결정
3. Changeset 자동 생성
4. Changeset version 실행
5. 패키지 빌드
6. 변경사항 커밋

**장점**: Hotfix도 동일한 자동화 혜택

### 2. develop-changeset-automation.yml

**트리거**: Feature PR이 develop에 머지될 때

**주요 기능**:
1. Conventional Commit 분석
   ```javascript
   feat: → minor
   fix: → patch
   feat! / BREAKING CHANGE: → major
   ```

2. 변경된 패키지 감지 (동적 탐색)
   ```javascript
   // find로 모든 package.json 자동 탐색
   packages/hooks/ → @repo/hooks
   packages/ui/ → @repo/ui
   packages/utils/ → @repo/utils (새 패키지도 자동!)
   apps/web/ → web
   apps/admin/ → admin (새 앱도 자동!)
   ```

   **✨ 새 패키지 추가 시 워크플로우 수정 불필요!**

3. Changeset 파일 생성
   ```markdown
   ---
   "@repo/hooks": minor
   "@repo/ui": minor
   "web": patch
   ---

   feat(hooks): add new feature (#123)
   ```

4. Develop 브랜치에 자동 커밋

**중요**: 기존 changeset이 있으면 스킵 (중복 방지)

### 3. release-tagging.yml (통합)

**트리거**: Main 브랜치에 push될 때

**주요 기능**:
1. Release/Hotfix 브랜치 병합 감지
   ```bash
   git log -1 | grep "Merge branch 'release/"
   git log -1 | grep "Merge branch 'hotfix/"
   ```

2. 각 패키지의 버전 읽기
   ```bash
   PKG_NAME=$(node -p "require('./package.json').name")
   PKG_VERSION=$(node -p "require('./package.json').version")
   ```

3. Git 태그 생성 & Push
   ```bash
   git tag @repo/hooks@1.0.0
   git push origin @repo/hooks@1.0.0
   ```

4. Github Release 생성
   ```bash
   gh release create @repo/hooks@1.0.0 \
     --title "@repo/hooks@1.0.0" \
     --notes "$(extract from CHANGELOG)"
   ```

**특징**:
- Release와 Hotfix 모두 처리
- 버전 업데이트는 Git Flow hook에서 이미 완료됨
- 태그 및 Release 생성만 담당

---

## 개발자 경험

### 일상적인 개발 플로우

```bash
# 1. Feature 브랜치 시작
git checkout develop
git checkout -b feature/my-feature

# 2. 코드 작성
vim packages/hooks/src/useMyHook.ts

# 3. Conventional Commit (중요!)
git add .
git commit -m "feat(hooks): add useMyHook"

# 4. PR 생성
gh pr create --base develop

# 5. 코드 리뷰 받고 머지
# 끝! Changeset은 자동으로 생성됨 ✨
```

### Conventional Commits 가이드

개발자가 **유일하게** 신경써야 할 부분:

```bash
# 새 기능 (minor 버전 업)
git commit -m "feat(hooks): add useDebounce hook"
git commit -m "feat(ui): add Tooltip component"

# 버그 수정 (patch 버전 업)
git commit -m "fix(hooks): fix memory leak in useEffect"
git commit -m "fix(ui): fix button disabled state"

# Breaking Change (major 버전 업)
git commit -m "feat(hooks)!: change useCounter return type"
# 또는
git commit -m "feat(hooks): change useCounter API

BREAKING CHANGE: useCounter now returns object instead of array"

# 문서, 스타일, 리팩토링 (버전 업 없음)
git commit -m "docs(hooks): update README"
git commit -m "style(ui): format code"
git commit -m "refactor(hooks): simplify logic"
```

**Scope 예시**:
- `hooks`: @repo/hooks 패키지
- `ui`: @repo/ui 패키지
- `web`: apps/web 애플리케이션
- `ci`: CI/CD 워크플로우
- `docs`: 문서

### 여러 패키지 동시 수정

```bash
# 여러 패키지를 한 번에 수정한 경우
git add packages/hooks/ packages/ui/ apps/web/
git commit -m "feat(hooks,ui): add theme support

- Add theme context in @repo/hooks
- Add themed components in @repo/ui
- Integrate theme in web app"

# Changeset이 자동으로 3개 패키지 모두 감지 ✨
```

---

## Release 담당자 가이드

### Release 타이밍 결정

Release는 언제 만들어야 할까요?

**권장 주기**:
- 소규모 프로젝트: 주 1회
- 중규모 프로젝트: 격주 1회
- 대규모 프로젝트: 월 1회

**긴급 상황**:
- 보안 이슈: 즉시
- Critical Bug: 즉시
- Hotfix: Main에서 직접 수정

### Release 생성 프로세스

#### 1. Develop 상태 확인

```bash
git checkout develop
git pull origin develop

# Changeset 확인
ls -la .changeset/*.md | grep -v README
# auto-111.md
# auto-222.md
# auto-333.md

# Changeset 내용 확인
cat .changeset/auto-111.md
# ---
# "@repo/hooks": minor
# ---
#
# feat(hooks): add useDebounce (#15)
```

#### 2. 버전 번호 결정

Changeset을 확인하고 다음 버전을 결정:

```bash
# 현재 버전 확인
cat packages/hooks/package.json | grep version
# "version": "0.3.0"

# Changeset에 major가 있으면: 1.0.0
# Changeset에 minor만 있으면: 0.4.0
# Changeset에 patch만 있으면: 0.3.1
```

#### 3. Git Flow Release 시작

```bash
# Git Flow Release 시작
git flow release start v0.4.0
```

#### 4. Git Flow Release 완료

```bash
# Release 완료
git flow release finish -Fpn v0.4.0

# ✅ Git Flow Hook이 자동으로:
#    1. Changeset 존재 확인
#    2. pnpm changeset version 실행
#    3. package.json 버전 업데이트
#    4. CHANGELOG.md 생성
#    5. 패키지 빌드
#    6. 변경사항 커밋
#    7. main과 develop에 병합

# 플래그 설명:
# -F: Fast-forward merge (merge commit 없이)
# -p: Push to remote (자동 push)
# -n: No tagging (Git Flow 태그 생성 안함, GitHub에서 생성)
```

#### 5. Release 확인

```bash
# Github Releases 확인 (약 30초 후)
gh release list

# 특정 Release 확인
gh release view @repo/hooks@0.4.0

# 태그 확인
git tag --list | grep 0.4.0
```

**자동화된 것들**:
- ✅ 버전 업데이트 (로컬 Hook)
- ✅ CHANGELOG 생성 (로컬 Hook)
- ✅ Main + Develop 동기화 (Git Flow)
- ✅ Git 태그 생성 (GitHub Actions)
- ✅ GitHub Release 생성 (GitHub Actions)

### Release 검증 체크리스트

- [ ] 모든 Feature가 develop에 머지되었는가?
- [ ] Changeset 파일들이 생성되어 있는가?
- [ ] `git flow release finish` 명령이 성공적으로 완료되었는가?
- [ ] Hook이 버전 업데이트를 자동으로 수행했는가?
- [ ] Main과 Develop 모두에 버전 업데이트가 반영되었는가?
- [ ] Github Release 태그가 생성되었는가?
- [ ] CHANGELOG가 올바르게 업데이트되었는가?

---

## 트러블슈팅

### 문제 1: Changeset이 자동 생성되지 않음

**증상**:
```bash
ls .changeset/*.md | grep auto
# (아무것도 없음)
```

**원인 및 해결**:

1. **이미 Changeset이 존재함**
   ```bash
   # 기존 changeset 확인
   ls .changeset/*.md
   ```
   → 해결: 기존 changeset 제거 또는 사용

2. **Conventional Commit 형식 오류**
   ```bash
   # 잘못된 예
   git commit -m "add new feature"  # ❌ prefix 없음
   git commit -m "feat add feature"  # ❌ 콜론 없음

   # 올바른 예
   git commit -m "feat(hooks): add new feature"  # ✅
   ```

3. **변경된 패키지가 감지되지 않음**
   ```bash
   # 워크플로우 로그 확인
   gh run view <RUN_ID> --log | grep "Changed packages"
   ```
   → 해결: packages/ 또는 apps/ 디렉토리 수정 확인

4. **워크플로우가 실행되지 않음**
   ```bash
   # 워크플로우 실행 이력 확인
   gh run list --workflow=develop-changeset-automation.yml --limit 5
   ```
   → 해결: Repository Settings → Actions 권한 확인

### 문제 2: Git Flow Hook이 실행되지 않음

**증상**: `git flow release finish` 후에도 버전이 업데이트되지 않음

**원인 및 해결**:

1. **Hook이 설치되지 않음**
   ```bash
   # Hook 확인
   ls -la .git/hooks/pre-flow-*
   ```
   → 해결: pnpm install 재실행
   ```bash
   pnpm install
   ```

2. **Hook 실행 권한 없음**
   ```bash
   # 권한 확인
   ls -l .git/hooks/pre-flow-release-finish
   ```
   → 해결: 실행 권한 부여
   ```bash
   chmod +x .git/hooks/pre-flow-*
   ```

3. **스크립트 오류**
   → Hook 실행 중 표시되는 오류 메시지 확인
   → 로그에서 실패 원인 파악

### 문제 3: Github Release 태그가 생성되지 않음

**증상**: Main에 머지되었지만 Release 태그 없음

**원인 및 해결**:

1. **release-tagging.yml 실행 확인**
   ```bash
   gh run list --workflow=release-tagging.yml --limit 5
   ```

2. **로그 확인**
   ```bash
   gh run view <RUN_ID> --log | grep "Creating tag"
   ```

3. **수동으로 태그 생성**
   ```bash
   git checkout main
   git pull origin main

   # 버전 확인
   cat packages/hooks/package.json | grep version
   # "version": "1.0.0"

   # 태그 생성
   git tag @repo/hooks@1.0.0
   git push origin @repo/hooks@1.0.0

   # Release 생성
   gh release create @repo/hooks@1.0.0 \
     --title "@repo/hooks@1.0.0" \
     --notes-file packages/hooks/CHANGELOG.md
   ```

### 문제 5: 의존성이 자동으로 업데이트되지 않음

**증상**: @repo/hooks가 업데이트되었는데 web은 그대로

**원인 및 해결**:

1. **updateInternalDependencies 설정 확인**
   ```bash
   cat .changeset/config.json | grep updateInternalDependencies
   # "updateInternalDependencies": "patch"
   ```

2. **workspace 의존성 확인**
   ```bash
   cat apps/web/package.json | grep @repo/hooks
   # "@repo/hooks": "workspace:*"
   ```

3. **changeset version 재실행**
   ```bash
   git checkout release/vX.X.X
   pnpm changeset version
   git add .
   git commit -m "chore(release): fix dependencies"
   git push
   ```

---

## 모니터링 및 로깅

### 워크플로우 상태 확인

```bash
# 최근 워크플로우 실행 목록
gh run list --limit 10

# 특정 워크플로우만
gh run list --workflow=develop-changeset-automation.yml --limit 5
gh run list --workflow=release-tagging.yml --limit 5

# 실행 중인 워크플로우 확인
gh run list --status in_progress

# 실패한 워크플로우 확인
gh run list --status failure --limit 10
```

### 로그 확인

```bash
# 전체 로그
gh run view <RUN_ID> --log

# 특정 job 로그
gh run view <RUN_ID> --job=<JOB_ID> --log

# 실시간 로그 (실행 중일 때)
gh run watch <RUN_ID>

# 로그를 파일로 저장
gh run view <RUN_ID> --log > workflow.log
```

### Changeset 상태 확인

```bash
# 현재 대기 중인 changeset
ls -la .changeset/*.md | grep -v README

# Changeset 내용 확인
for file in .changeset/auto-*.md; do
  echo "=== $file ==="
  cat "$file"
  echo
done

# Changeset으로 예상되는 버전 확인 (dry-run)
pnpm changeset status
```

---

## 참고 문서

- [Test Scenarios](./TEST_SCENARIOS.md) - 테스트 시나리오
- [Workflows](./WORKFLOWS.md) - 워크플로우 상세 설명
- [Developer Guide](./DEVELOPER_GUIDE.md) - 개발자 실용 가이드
- [Changesets Official Docs](https://github.com/changesets/changesets) - Changesets 공식 문서
