# 개발자 실용 가이드

이 문서는 개발자가 일상적으로 사용할 실용적인 가이드입니다.

## 목차

- [빠른 시작](#빠른-시작)
- [일상적인 개발 플로우](#일상적인-개발-플로우)
- [Conventional Commits 완벽 가이드](#conventional-commits-완벽-가이드)
- [자주 하는 작업들](#자주-하는-작업들)
- [FAQ](#faq)
- [체크리스트](#체크리스트)

---

## 빠른 시작

### 프로젝트 설치

```bash
# Repository 클론
git clone https://github.com/YOUR_ORG/changesets-test-repo.git
cd changesets-test-repo

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
```

### 첫 Feature 만들기

```bash
# 1. Develop 브랜치로 이동
git checkout develop
git pull origin develop

# 2. Feature 브랜치 생성
git checkout -b feature/my-first-feature

# 3. 코드 작성
echo "export const hello = () => 'Hello World!';" > packages/hooks/src/hello.ts

# 4. Conventional Commit
git add .
git commit -m "feat(hooks): add hello function"

# 5. PR 생성
gh pr create --base develop \
  --title "feat(hooks): add hello function" \
  --body "Add a simple hello world function"

# 6. 코드 리뷰 받고 머지
# PR 머지 후 Changeset이 자동으로 생성됩니다! ✨
```

---

## 일상적인 개발 플로우

### 패턴 1: 단일 패키지 수정

가장 흔한 케이스입니다.

```bash
# Feature 브랜치 시작
git checkout develop
git checkout -b feature/improve-useCounter

# 코드 수정
vim packages/hooks/src/useCounter.ts

# 테스트 (선택)
pnpm --filter @repo/hooks test

# 커밋
git add packages/hooks/
git commit -m "feat(hooks): add reset callback to useCounter"

# Push & PR
git push -u origin feature/improve-useCounter
gh pr create --base develop
```

**예상 결과**:
- PR 머지 시 `@repo/hooks`에 대한 changeset 자동 생성
- 버전: minor (feat:)

### 패턴 2: 여러 패키지 동시 수정

UI 컴포넌트와 hook을 함께 수정하는 경우:

```bash
# Feature 브랜치 시작
git checkout -b feature/add-theme-support

# Hooks 패키지에 theme hook 추가
vim packages/hooks/src/useTheme.ts
git add packages/hooks/
git commit -m "feat(hooks): add useTheme hook"

# UI 패키지에 themed components 추가
vim packages/ui/src/ThemedButton.tsx
git add packages/ui/
git commit -m "feat(ui): add ThemedButton component"

# Web 앱에 통합
vim apps/web/src/App.tsx
git add apps/web/
git commit -m "feat(web): integrate theme support"

# Push & PR
git push -u origin feature/add-theme-support
gh pr create --base develop \
  --title "feat(hooks,ui,web): add theme support" \
  --body "Add complete theme support across packages"
```

**예상 결과**:
- Changeset이 3개 패키지 모두 감지
```markdown
---
"@repo/hooks": minor
"@repo/ui": minor
"web": minor
---

feat(hooks,ui,web): add theme support (#42)
```

### 패턴 3: 버그 수정

```bash
git checkout -b fix/memory-leak

vim packages/hooks/src/useEffect.ts
git add packages/hooks/
git commit -m "fix(hooks): fix memory leak in useEffect cleanup"

git push -u origin fix/memory-leak
gh pr create --base develop
```

**예상 결과**:
- 버전: patch (fix:)

### 패턴 4: Breaking Change

API를 변경해야 할 때:

```bash
git checkout -b feat/refactor-counter-api

vim packages/hooks/src/useCounter.ts
git add packages/hooks/
git commit -m "feat(hooks)!: change useCounter return type

BREAKING CHANGE: useCounter now returns an object instead of array
  Before: const [count, increment, decrement] = useCounter()
  After: const { count, increment, decrement } = useCounter()"

git push -u origin feat/refactor-counter-api
gh pr create --base develop
```

**예상 결과**:
- 버전: major (feat!:)
- CHANGELOG에 BREAKING CHANGE 섹션 추가

---

## Conventional Commits 완벽 가이드

### 기본 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type (필수)

| Type | 설명 | 버전 영향 | 예시 |
|------|------|----------|------|
| `feat` | 새 기능 | **minor** | `feat(hooks): add useDebounce` |
| `fix` | 버그 수정 | **patch** | `fix(ui): fix button alignment` |
| `feat!` | Breaking change | **major** | `feat(hooks)!: change API` |
| `docs` | 문서만 변경 | 없음 | `docs(hooks): update README` |
| `style` | 코드 포맷팅 | 없음 | `style(ui): format with prettier` |
| `refactor` | 리팩토링 | 없음 | `refactor(hooks): simplify logic` |
| `test` | 테스트 추가/수정 | 없음 | `test(hooks): add useCounter tests` |
| `chore` | 빌드/도구 변경 | 없음 | `chore: update dependencies` |
| `perf` | 성능 개선 | **patch** | `perf(hooks): optimize rendering` |
| `ci` | CI 설정 | 없음 | `ci: update github actions` |

### Scope (권장)

프로젝트의 어느 부분이 변경되었는지 명시:

```bash
feat(hooks): ...     # @repo/hooks 패키지
feat(ui): ...        # @repo/ui 패키지
feat(web): ...       # apps/web 애플리케이션
feat(ci): ...        # CI/CD 워크플로우
feat(docs): ...      # 문서
```

**여러 scope**:
```bash
feat(hooks,ui): add theme support
```

### Subject (필수)

- 현재 시제 사용 ("add" not "added")
- 첫 글자 소문자
- 마침표 없음
- 50자 이내

**좋은 예시**:
```bash
feat(hooks): add useDebounce hook
fix(ui): fix button disabled state
docs(hooks): update API documentation
```

**나쁜 예시**:
```bash
Added new feature.              # ❌ 과거형, 마침표
feat(hooks): Add useDebounce    # ❌ 첫 글자 대문자
feat: added some stuff          # ❌ 모호함, 과거형
```

### Body (선택)

더 자세한 설명이 필요할 때:

```bash
git commit -m "feat(hooks): add useDebounce hook

Add a custom hook for debouncing values with configurable delay.
Useful for search inputs and other performance-sensitive scenarios.

Usage:
  const debouncedValue = useDebounce(value, 500);"
```

### Footer (선택)

**Breaking Change 명시**:
```bash
git commit -m "feat(hooks)!: change useCounter API

BREAKING CHANGE: useCounter now returns object instead of array
  Migration:
    Before: const [count, inc, dec] = useCounter()
    After: const { count, increment, decrement } = useCounter()"
```

**Issue 참조**:
```bash
git commit -m "fix(hooks): fix memory leak

Fixes #123
Closes #456"
```

### 실전 예시

#### 예시 1: 새 Hook 추가
```bash
git commit -m "feat(hooks): add useLocalStorage hook

Add a custom hook to sync state with localStorage.
Automatically handles JSON serialization and parsing.

Example:
  const [name, setName] = useLocalStorage('name', 'John');"
```

#### 예시 2: 버그 수정 + 테스트
```bash
# 버그 수정 커밋
git commit -m "fix(ui): fix Button disabled prop not working

Button component was not respecting the disabled prop due to
incorrect CSS specificity. Fixed by using !important flag."

# 테스트 추가 커밋
git commit -m "test(ui): add Button disabled state test"
```

#### 예시 3: Breaking Change
```bash
git commit -m "feat(hooks)!: redesign useForm API

BREAKING CHANGE: Complete redesign of useForm hook API

Before:
  const form = useForm({
    name: '',
    email: ''
  })
  form.values.name
  form.setValue('name', 'John')

After:
  const { values, setValue } = useForm({
    initialValues: { name: '', email: '' }
  })
  values.name
  setValue('name', 'John')

Migration guide: See MIGRATION.md"
```

#### 예시 4: 여러 패키지 수정
```bash
git commit -m "feat(hooks,ui,web): implement dark mode

- Add useDarkMode hook in @repo/hooks
- Add dark mode variants to all UI components
- Integrate dark mode toggle in web app header

Closes #89"
```

---

## 자주 하는 작업들

### 새 Hook 추가

```bash
# 1. 파일 생성
cat > packages/hooks/src/useNewHook.ts << 'EOF'
import { useState, useEffect } from 'react';

export function useNewHook(param: string) {
  const [value, setValue] = useState(param);

  useEffect(() => {
    // Effect logic
  }, [param]);

  return value;
}
EOF

# 2. Export 추가
echo "export { useNewHook } from './useNewHook';" >> packages/hooks/src/index.ts

# 3. 빌드 테스트
pnpm --filter @repo/hooks build

# 4. 커밋
git add packages/hooks/
git commit -m "feat(hooks): add useNewHook

Add custom hook for [describe purpose]"

# 5. PR
gh pr create --base develop
```

### 새 UI 컴포넌트 추가

```bash
# 1. 컴포넌트 생성
cat > packages/ui/src/NewComponent.tsx << 'EOF'
import React from 'react';

export interface NewComponentProps {
  children: React.ReactNode;
}

export const NewComponent: React.FC<NewComponentProps> = ({ children }) => {
  return <div className="new-component">{children}</div>;
};
EOF

# 2. Export 추가
echo "export { NewComponent, type NewComponentProps } from './NewComponent';" >> packages/ui/src/index.ts

# 3. 빌드 테스트
pnpm --filter @repo/ui build

# 4. 커밋
git add packages/ui/
git commit -m "feat(ui): add NewComponent"

# 5. PR
gh pr create --base develop
```

### 새 패키지 생성

```bash
# 1. 패키지 디렉토리 생성
mkdir -p packages/utils/src

# 2. package.json 생성
cat > packages/utils/package.json << 'EOF'
{
  "name": "@repo/utils",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "~5.6.2"
  }
}
EOF

# 3. tsconfig.json 생성
cat > packages/utils/tsconfig.json << 'EOF'
{
  "extends": "@repo/typescript-config/base.json",
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
EOF

# 4. 소스 코드 생성
cat > packages/utils/src/index.ts << 'EOF'
export function formatDate(date: Date): string {
  return date.toISOString();
}
EOF

# 5. 빌드 테스트
pnpm install
pnpm --filter @repo/utils build

# 6. 커밋 (워크플로우 수정 불필요! 자동 감지됨 ✨)
git add packages/utils/
git commit -m "feat(utils): create new utils package"

# 7. PR
gh pr create --base develop
```

### 의존성 업데이트

```bash
# 특정 패키지만 업데이트
pnpm --filter @repo/hooks update react@latest

# 전체 업데이트
pnpm update --recursive

# 커밋
git add pnpm-lock.yaml packages/
git commit -m "chore: update dependencies"

# PR
gh pr create --base develop --title "chore: update dependencies"
```

### CHANGELOG 수동 확인

```bash
# 현재 대기 중인 changesets 확인
ls .changeset/*.md | grep -v README

# Changeset 내용 확인
cat .changeset/auto-*.md

# 예상 버전 확인 (dry-run)
pnpm changeset status

# 출력 예시:
# @repo/hooks: 0.3.0 → 0.4.0 (minor)
# @repo/ui: 0.2.1 → 0.2.2 (patch)
```

---

## FAQ

### Q1: Changeset을 수동으로 만들어야 하나요?

**A**: 아니요! 자동으로 생성됩니다.

```bash
# ❌ 하지 마세요
pnpm changeset

# ✅ 이것만 하세요
git commit -m "feat(hooks): add new feature"
```

**거의 항상 수동으로 생성할 필요가 없습니다.** Develop과 Hotfix 모두 자동화되어 있습니다.

### Q2: 여러 커밋을 하나의 PR로 만들면?

**A**: 괜찮습니다! PR 머지 시 모든 커밋을 분석합니다.

```bash
git commit -m "feat(hooks): add feature A"
git commit -m "feat(hooks): add feature B"
git commit -m "fix(hooks): fix bug C"

# PR 머지 → Changeset: minor (feat이 있으므로)
```

**최고 버전이 선택됨**:
- feat + fix → minor
- feat! + feat → major

### Q3: Changeset이 생성되지 않았어요!

**A**: 다음을 확인하세요:

1. **Conventional Commit 형식**:
   ```bash
   # 확인
   git log --oneline -1

   # feat:, fix: 등이 있나요?
   ```

2. **올바른 브랜치**:
   ```bash
   # develop에 머지되었나요?
   git log develop --oneline -5
   ```

3. **워크플로우 실행**:
   ```bash
   gh run list --workflow=develop-changeset-automation.yml --limit 5
   ```

4. **이미 존재하는 changeset**:
   ```bash
   ls .changeset/*.md
   ```

### Q4: 버전을 올리고 싶지 않은 커밋은?

**A**: 다음 타입을 사용하세요:

```bash
# 버전 영향 없음
git commit -m "docs(hooks): update README"
git commit -m "style(ui): format code"
git commit -m "refactor(hooks): simplify logic"
git commit -m "test(hooks): add tests"
git commit -m "chore: update dependencies"
```

### Q5: PR을 develop이 아닌 main에 실수로 만들었어요!

**A**: PR을 닫고 다시 만드세요:

```bash
# PR 닫기
gh pr close <PR_NUMBER>

# 올바른 base로 PR 재생성
gh pr create --base develop
```

### Q6: Release는 누가 만드나요?

**A**: Release 담당자(보통 Tech Lead 또는 Release Manager)가 만듭니다:

```bash
# Release 담당자만 실행
git checkout develop
git flow release start v1.0.0
git flow release finish -Fpn v1.0.0

# Hook과 GitHub Actions가 모든 걸 자동으로 처리합니다! 🚀
```

개발자는 Release를 만들 필요가 없습니다.

### Q7: Hotfix는 어떻게 하나요?

**A**: Hotfix도 Git Flow를 사용하여 완전히 자동화되어 있습니다! 🚀

```bash
# 1. Hotfix 시작
git flow hotfix start fix-critical-bug

# 2. 버그 수정 (Conventional Commit 사용)
git commit -m "fix(hooks): critical security issue"

# 3. Hotfix 완료
git flow hotfix finish -Fpn fix-critical-bug

# ✅ Git Flow Hook이 자동으로:
#    - 변경된 패키지 감지
#    - Changeset 생성
#    - 버전 업데이트
#    - main과 develop에 병합
#
# ✅ GitHub Actions가 자동으로:
#    - Git 태그 생성
#    - GitHub Release 생성
```

**중요**:
- Git Flow가 main과 develop을 자동으로 동기화합니다
- 진짜 긴급 상황에만 사용하세요
- Hook이 모든 버전 관리를 자동으로 처리합니다

### Q8: 여러 Feature를 동시에 개발 중인데, Release 타이밍은?

**A**: 원하는 때에 Release를 만들 수 있습니다:

```bash
# Feature A, B, C가 모두 develop에 머지됨
# Changeset이 3개 쌓여있음

# Release 담당자가 결정:
# "이번 주 금요일에 릴리즈하자"
git checkout -b release/v1.0.0
git push origin release/v1.0.0

# 3개 changeset이 한 번에 처리됨 ✨
```

---

## 체크리스트

### Feature 개발 전

- [ ] Develop 브랜치가 최신인가요?
  ```bash
  git checkout develop && git pull origin develop
  ```
- [ ] Feature 브랜치명이 명확한가요?
  ```bash
  feature/add-useDebounce (O)
  feature/work (X)
  ```

### 커밋 전

- [ ] Conventional Commit 형식이 맞나요?
  ```bash
  feat(hooks): add useDebounce (O)
  add useDebounce (X)
  ```
- [ ] 올바른 type을 사용했나요?
  - 새 기능: `feat`
  - 버그 수정: `fix`
  - Breaking change: `feat!`
- [ ] Scope가 명확한가요?
  - `hooks`, `ui`, `web` 등

### PR 생성 전

- [ ] Base 브랜치가 develop인가요?
  ```bash
  gh pr create --base develop
  ```
- [ ] 빌드가 성공하나요?
  ```bash
  pnpm build
  ```
- [ ] Lint가 통과하나요?
  ```bash
  pnpm lint
  ```

### PR 머지 후

- [ ] Changeset이 자동 생성되었나요?
  ```bash
  ls .changeset/*.md | grep auto
  ```
- [ ] Develop 브랜치를 pull 받았나요?
  ```bash
  git checkout develop && git pull origin develop
  ```

### Release 생성 시 (Release 담당자)

- [ ] Develop에 changeset이 있나요?
  ```bash
  ls .changeset/*.md | grep -v README
  ```
- [ ] Release 브랜치명이 올바른가요?
  ```bash
  release/v1.0.0 (O)
  release/release (X)
  ```
- [ ] 워크플로우가 성공했나요?
  ```bash
  gh run list --branch release/v1.0.0
  ```
- [ ] PR이 자동 생성되었나요?
  ```bash
  gh pr list --head release/v1.0.0
  ```
- [ ] Auto-merge가 활성화되어 있나요?
  ```bash
  gh pr view <PR_NUMBER> --json autoMergeRequest
  ```

---

## 참고 문서

- [Automation Guide](./AUTOMATION_GUIDE.md) - 전체 자동화 시스템 가이드
- [Test Scenarios](./TEST_SCENARIOS.md) - 테스트 시나리오
- [Workflows](./WORKFLOWS.md) - 워크플로우 상세 설명
- [Conventional Commits](https://www.conventionalcommits.org/) - Conventional Commits 공식 문서
- [Changesets](https://github.com/changesets/changesets) - Changesets 공식 문서
