# Branching Strategy & Release Workflow

## 브랜치 구조

```
feature/* → develop → main
```

### 브랜치 설명

- **feature/**: 기능 개발 브랜치
- **develop**: 개발 통합 브랜치 (changesets 수집)
- **main**: 프로덕션 배포 브랜치 (버전 릴리스)

## 완전 자동화된 워크플로우

### 1️⃣ Feature 개발

```bash
# Feature 브랜치 생성
git checkout develop
git pull
git checkout -b feature/my-feature

# 코드 작성 및 Conventional Commits로 커밋
git commit -m "feat(ui): add new component"
git commit -m "fix(hooks): fix bug"

# Push 및 PR 생성 (develop으로)
git push origin feature/my-feature
gh pr create --base develop
```

**중요**: PR을 **develop 브랜치**로 생성하세요!

### 2️⃣ Develop에 머지 (Changeset 자동 생성)

PR이 develop에 머지되면:

1. ✅ **auto-changeset.yml** 실행
2. ✅ 커밋 메시지 분석 (`feat:` → minor, `fix:` → patch)
3. ✅ 변경된 패키지 감지
4. ✅ Changeset 자동 생성 및 develop에 푸시

```
feat(ui): add component
          ↓
[auto-changeset.yml]
          ↓
.changeset/auto-xxx.md 생성
          ↓
develop 브랜치에 자동 커밋
```

### 3️⃣ Develop → Main PR 생성 (수동)

여러 feature의 changeset이 develop에 쌓이면:

```bash
# Main으로 PR 생성
git checkout develop
git pull
gh pr create --base main --title "Release: v0.2.0"
```

### 4️⃣ Main에 머지 (Version Packages PR 자동 생성)

develop → main PR이 머지되면:

1. ✅ **release.yml** 실행
2. ✅ 모든 changeset 분석
3. ✅ 버전 계산 (semantic versioning)
4. ✅ CHANGELOG 생성
5. ✅ **"Version Packages" PR 자동 생성**

```
develop → main 머지
          ↓
[release.yml]
          ↓
PR: chore(release): version packages
          ↓
@repo/ui: 0.1.0 → 0.2.0
@repo/hooks: 0.0.1 → 0.1.0
```

### 5️⃣ Version Packages PR 머지 (최종 릴리스)

Release 담당자가 "Version Packages" PR을 머지하면:

1. ✅ 버전 자동 업데이트
2. ✅ CHANGELOG 커밋
3. ✅ Changesets 파일 삭제
4. ✅ (설정 시) npm 자동 배포

## 전체 플로우 시각화

```
┌─────────────────┐
│ feature/button  │  feat(ui): add Button
└────────┬────────┘
         │ PR (base: develop)
         ↓
┌─────────────────┐
│    develop      │  ← auto-changeset.yml 실행
│                 │  → .changeset/auto-xxx.md 생성
│  [changesets]   │
│  - auto-123.md  │
│  - auto-456.md  │
└────────┬────────┘
         │ PR (base: main)
         ↓
┌─────────────────┐
│      main       │  ← release.yml 실행
│                 │  → "Version Packages" PR 생성
└────────┬────────┘
         │ PR 머지
         ↓
┌─────────────────┐
│   Released!     │  ✅ @repo/ui@0.2.0
│                 │  ✅ @repo/hooks@0.1.0
└─────────────────┘
```

## Commit Convention

### Version Bump Rules

| Commit Type | 브랜치 | 동작 | 버전 변경 |
|------------|--------|------|----------|
| `feat:` | feature → develop | changeset 생성 | minor (0.X.0) |
| `fix:` | feature → develop | changeset 생성 | patch (0.0.X) |
| `feat!:` | feature → develop | changeset 생성 | major (X.0.0) |
| Any | develop → main | Version PR 생성 | 모든 changeset 기반 |

### Commit 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**예시:**
```bash
# Feature 개발 시
git commit -m "feat(ui): add Card component"
git commit -m "fix(hooks): fix useToggle bug"
git commit -m "feat(ui)!: redesign Button API

BREAKING CHANGE: variant prop renamed to type"
```

## 예시 시나리오

### 시나리오: 여러 Feature 개발 후 릴리스

#### 개발자 A: Button 컴포넌트 추가
```bash
git checkout -b feature/button
git commit -m "feat(ui): add Button component"
gh pr create --base develop
# → develop에 머지
# → .changeset/auto-111.md 생성
```

#### 개발자 B: useCounter 훅 수정
```bash
git checkout -b feature/counter
git commit -m "feat(hooks): add incrementBy to useCounter"
gh pr create --base develop
# → develop에 머지
# → .changeset/auto-222.md 생성
```

#### Release 담당자: Develop → Main
```bash
# develop에 changesets이 2개 쌓임
git checkout develop
gh pr create --base main --title "Release: v0.2.0"
# → main에 머지
# → "Version Packages" PR 자동 생성
# → @repo/ui: 0.1.0 → 0.2.0
# → @repo/hooks: 0.0.1 → 0.1.0
```

## 장점

✅ **Feature별 추적**: 각 feature마다 changeset이 생성되어 추적 가능
✅ **Develop 통합**: Develop에서 changesets을 모아서 확인 가능
✅ **안전한 릴리스**: Main 머지 전에 모든 변경사항 리뷰 가능
✅ **완전 자동화**: Conventional Commits만 따르면 모든 버전 관리 자동

## 주의사항

### ⚠️ PR Base 브랜치 확인
- Feature → **develop** (✅)
- Develop → **main** (✅)
- Feature → main (❌) - 하지 마세요!

### ⚠️ Changeset 수동 생성 금지
- ❌ `pnpm changeset` 실행하지 마세요
- ❌ `.changeset/*.md` 파일 직접 생성하지 마세요
- ✅ Conventional Commits만 사용하세요

### ⚠️ Develop 브랜치 보호
Develop 브랜치에 직접 push하지 마세요. 항상 PR을 통해 머지하세요.

## Github Actions Workflows

### 1. auto-changeset.yml
- **트리거**: feature → develop PR 머지
- **동작**: Changeset 자동 생성 및 develop에 푸시

### 2. release.yml
- **트리거**: develop → main PR 머지
- **동작**: Version Packages PR 자동 생성

### 3. commit-lint.yml
- **트리거**: 모든 PR 생성 시
- **동작**: Conventional Commits 형식 검증

## 문제 해결

### Q: Changeset이 생성되지 않았어요
**A**: Conventional Commits 형식을 확인하세요.
```bash
# ❌ 잘못된 형식
git commit -m "added button"

# ✅ 올바른 형식
git commit -m "feat(ui): add button"
```

### Q: PR을 잘못된 브랜치로 만들었어요
**A**: PR을 닫고 올바른 base 브랜치로 다시 생성하세요.
```bash
gh pr close <pr-number>
gh pr create --base develop
```

### Q: Develop에 직접 push했어요
**A**: Force push는 위험하니, 새 feature 브랜치를 만들어 PR로 머지하세요.

## 더 알아보기

- [RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md) - 자동화 워크플로우 상세
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 기여 가이드
- [Conventional Commits](https://www.conventionalcommits.org/)
