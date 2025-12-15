# 완전 자동화된 Release Workflow

이 저장소는 **Conventional Commits**와 **Github Actions**를 사용하여 버전 관리를 **완전히 자동화**합니다.

## 🎯 핵심 원칙

**개발자는 Changesets을 전혀 신경쓰지 않습니다!**

- ❌ `pnpm changeset` 실행 불필요
- ❌ `.changeset/*.md` 파일 생성 불필요
- ✅ **Conventional Commits만 따르면 끝!**

## 개발자 워크플로우 (3단계)

### 1️⃣ Feature 브랜치에서 코드 작성

```bash
git checkout -b feature/add-button
# 코드 작성...
```

### 2️⃣ Conventional Commits으로 커밋

```bash
# 새 기능 추가 (minor)
git commit -m "feat(ui): add Button component"

# 버그 수정 (patch)
git commit -m "fix(hooks): correct useToggle initial value"

# Breaking change (major)
git commit -m "feat(ui)!: change Button API

BREAKING CHANGE: variant prop renamed to type"
```

### 3️⃣ PR 생성 및 머지

```bash
git push origin feature/add-button
```

PR이 main에 머지되면 **모든 것이 자동으로 처리됩니다!**

## 🤖 자동화 프로세스

### 단계 1: PR 머지
개발자의 PR이 main에 머지됩니다.

### 단계 2: 자동 Changeset 생성
Github Actions가 자동으로:
- 커밋 메시지 분석 (`feat:`, `fix:`, `BREAKING:`)
- 변경된 패키지 감지
- Changeset 자동 생성
- Main 브랜치에 푸시

### 단계 3: Version Packages PR 생성
Changeset이 생성되면 자동으로:
- "Version Packages" PR 생성
- 버전 번호 계산 및 업데이트
- CHANGELOG 자동 생성

### 단계 4: 릴리스
Release 담당자가 "Version Packages" PR을 머지하면:
- ✅ 버전 자동 업데이트
- ✅ CHANGELOG 커밋
- ✅ (설정 시) npm 자동 배포

## Commit Convention

### Version Bump Rules

| Commit Type | 예시 | 버전 변경 |
|------------|------|----------|
| `feat:` | feat(ui): add Card | 0.1.0 → **0.2.0** (minor) |
| `fix:` | fix(hooks): fix bug | 0.1.0 → **0.1.1** (patch) |
| `feat!:` or `BREAKING CHANGE:` | feat!: change API | 0.1.0 → **1.0.0** (major) |

### Commit 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

#### Type
- `feat`: 새로운 기능 → minor
- `fix`: 버그 수정 → patch
- `docs`: 문서 변경 → no version bump
- `chore`: 빌드, 설정 변경 → no version bump
- `refactor`: 리팩토링 → patch (API 변경 없음)
- `perf`: 성능 개선 → patch

#### Scope (선택)
- `ui`: @repo/ui 패키지
- `hooks`: @repo/hooks 패키지
- `web`: web 앱

#### 예시

**새 기능 (Minor)**
```bash
feat(ui): add Card component with title and footer props
```

**버그 수정 (Patch)**
```bash
fix(hooks): add missing reset function to useToggle
```

**Breaking Change (Major)**
```bash
feat(ui)!: redesign Button component API

BREAKING CHANGE:
- variant prop is now called type
- size prop is required
```

## Release 담당자 가이드

### 일반적인 릴리스

1. **"Version Packages" PR 확인**
   - Github Actions가 자동으로 생성한 PR 확인
   - 버전 번호 검토
   - CHANGELOG 내용 검토

2. **PR 머지**
   - 문제없으면 PR 머지
   - 자동으로 버전 업데이트 및 (설정 시) npm 배포

### 긴급 Hotfix

Hotfix도 동일한 프로세스:

```bash
git checkout -b hotfix/critical-bug
# 수정...
git commit -m "fix(ui): fix critical rendering bug"
git push
# PR 생성 및 머지
```

자동으로 patch 버전이 올라갑니다.

### 수동 Changeset (예외 상황)

자동 생성이 실패한 경우에만 수동으로 추가:

```bash
pnpm changeset
git add .changeset/
git commit -m "chore: manually add changeset"
git push
```

## 예시 시나리오

### 시나리오 1: 새 UI 컴포넌트 추가

**개발자 작업:**
```bash
git checkout -b feature/card-component
# Card.tsx 작성
git add packages/ui/src/Card.tsx
git commit -m "feat(ui): add Card component"
git push origin feature/card-component
# PR 생성 → 머지
```

**자동 실행:**
1. ✅ Github Actions가 커밋 분석
2. ✅ `feat(ui):` 감지 → minor bump
3. ✅ Changeset 자동 생성
4. ✅ "Version Packages" PR 생성
5. ✅ @repo/ui: 0.1.0 → 0.2.0

### 시나리오 2: 버그 수정

**개발자 작업:**
```bash
git checkout -b fix/toggle-bug
git commit -m "fix(hooks): add missing reset function"
# PR 머지
```

**자동 실행:**
1. ✅ `fix(hooks):` 감지 → patch bump
2. ✅ @repo/hooks: 0.0.1 → 0.0.2

### 시나리오 3: 여러 변경사항

한 PR에 여러 커밋:
```bash
git commit -m "feat(ui): add Card component"
git commit -m "fix(ui): fix Button style"
git commit -m "docs: update README"
```

**자동 실행:**
- 가장 높은 버전 타입 적용 (feat > fix > docs)
- @repo/ui: 0.1.0 → **0.2.0** (minor, feat 때문에)

## Github Actions Workflows

### 1. Auto Generate Changeset (`auto-changeset.yml`)
- **트리거**: PR이 main에 머지될 때
- **동작**:
  - 커밋 메시지 분석
  - 변경된 패키지 감지
  - Changeset 자동 생성

### 2. Release (`release.yml`)
- **트리거**: main 브랜치에 push (changeset 커밋)
- **동작**:
  - "Version Packages" PR 생성 또는 업데이트
  - PR 머지 시 npm publish

### 3. Commit Lint (`commit-lint.yml`)
- **트리거**: PR 생성/업데이트
- **동작**:
  - Conventional Commits 형식 검증
  - 잘못된 형식 시 실패

## 패키지별 버전 관리

### 자동 감지 규칙

| 변경된 파일 | 영향받는 패키지 |
|------------|----------------|
| `packages/ui/**` | @repo/ui |
| `packages/hooks/**` | @repo/hooks |
| `apps/web/**` | web |

### 의존성 자동 업데이트

web 앱은 @repo/ui와 @repo/hooks에 의존하므로:
- @repo/ui 업데이트 → web도 자동으로 patch 업데이트
- @repo/hooks 업데이트 → web도 자동으로 patch 업데이트

## 문제 해결

### Q: Changeset이 자동 생성되지 않았어요
**A:** 커밋 메시지가 Conventional Commits 형식인지 확인하세요.
```bash
# ❌ 잘못된 형식
git commit -m "added button"

# ✅ 올바른 형식
git commit -m "feat(ui): add button"
```

### Q: 버전이 잘못 올라갔어요
**A:** "Version Packages" PR을 머지하지 말고, changeset을 수정하세요.
```bash
git checkout changeset-release/main
# .changeset/*.md 파일 수정
git commit -m "fix: adjust version bump"
git push
```

### Q: 특정 패키지만 버전을 올리고 싶어요
**A:** 커밋 메시지에 scope를 명시하세요.
```bash
# ui 패키지만 변경
git commit -m "feat(ui): add feature"

# hooks 패키지만 변경
git commit -m "fix(hooks): fix bug"
```

## 장점

✅ **Zero Configuration**: 개발자가 설정할 것이 없음
✅ **자동화**: 버전 관리 완전 자동화
✅ **일관성**: 모든 변경사항이 CHANGELOG에 기록
✅ **검증**: PR에서 커밋 메시지 자동 검증
✅ **투명성**: Version Packages PR로 변경사항 리뷰 가능

## 더 알아보기

- [CONTRIBUTING.md](./CONTRIBUTING.md) - 상세한 기여 가이드
- [Conventional Commits](https://www.conventionalcommits.org/) - 커밋 컨벤션
- [Changesets](https://github.com/changesets/changesets) - Changesets 문서
