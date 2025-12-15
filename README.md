# Changesets Test Repository

Changesets과 Github Actions를 사용한 모노레포 버전 관리 자동화 테스트 프로젝트입니다.

## 프로젝트 구조

```
changesets-test-repo/
├── apps/
│   └── web/                    # React + Vite 앱
├── packages/
│   ├── ui/                     # @repo/ui - UI 컴포넌트 라이브러리
│   ├── hooks/                  # @repo/hooks - React 커스텀 훅
│   ├── eslint-config/          # @repo/eslint-config - ESLint 설정
│   └── typescript-config/      # @repo/typescript-config - TypeScript 설정
├── docs/                       # 📚 상세 문서
│   ├── AUTOMATION_GUIDE.md     # 자동화 시스템 가이드
│   ├── DEVELOPER_GUIDE.md      # 개발자 실용 가이드
│   ├── TEST_SCENARIOS.md       # 테스트 시나리오
│   └── WORKFLOWS.md            # 워크플로우 상세 설명
└── .github/
    └── workflows/              # Github Actions 워크플로우
```

## 기술 스택

- **빌드 도구**: Vite 6
- **프레임워크**: React 18
- **언어**: TypeScript 5.6
- **컴파일러**: SWC
- **패키지 매니저**: pnpm 10 (workspace)
- **버전 관리**: Changesets
- **CI/CD**: Github Actions

## 빠른 시작

### 설치

```bash
# 의존성 설치 (Git hooks 자동 설치됨)
pnpm install
```

**중요**: `pnpm install` 실행 시 [Husky](https://typicode.github.io/husky/)가 Git Flow hooks를 자동으로 설치합니다.

### 개발

```bash
# 웹 앱 개발 서버 실행
pnpm dev

# 모든 패키지 빌드
pnpm build

# 린트 실행
pnpm lint
```

## ✨ 완전 자동화된 버전 관리

이 프로젝트는 **Git Flow + Husky**로 버전 관리를 **완전히 자동화**합니다.

### 브랜치 전략 (Git Flow)

```
feature/* → develop → release/* → main
                       ↓
                   (자동 버전 업데이트)
```

- **feature/**: 기능 개발
- **develop**: 통합 개발 (changesets 수집)
- **release/**: 릴리즈 준비 (Git Flow hook이 자동 버전 업데이트)
- **main**: 프로덕션 릴리스

### 일상적인 개발 (Feature)

```bash
# 1. Feature 브랜치에서 코드 작성
git checkout develop
git checkout -b feature/my-feature

# 2. Conventional Commits로 커밋
git commit -m "feat(ui): add new component"

# 3. PR 생성 및 머지 (develop으로!)
gh pr create --base develop
gh pr merge --squash

# ✅ Changeset이 자동으로 생성됩니다!
```

### 릴리즈 프로세스 (Release Manager)

```bash
# 1. Release 시작
git flow release start v1.0.0

# 2. Release 종료
git flow release finish -Fpn v1.0.0

# ✅ Git Flow hook이 자동으로:
#    - pnpm changeset version 실행
#    - package.json 버전 업데이트
#    - CHANGELOG.md 생성
#    - 커밋 생성
#    - main과 develop에 병합

# ✅ GitHub Actions가 자동으로:
#    - Git 태그 생성
#    - GitHub Release 생성
```

### Hotfix 프로세스 (긴급 수정)

```bash
# 1. Hotfix 시작
git flow hotfix start fix-critical-bug

# 2. 버그 수정 및 커밋
git commit -m "fix(ui): resolve critical bug"

# 3. Hotfix 종료
git flow hotfix finish -Fpn fix-critical-bug

# ✅ Git Flow hook이 자동으로:
#    - Changeset 생성
#    - 버전 업데이트
#    - 즉시 릴리즈
```

### 자동으로 처리되는 것들

✅ **Feature → Develop**: Changeset 자동 생성 (GitHub Actions)
✅ **Release Finish**: 버전 업데이트 자동 실행 (Git Flow Hook)
✅ **Hotfix Finish**: Changeset 생성 + 버전 업데이트 (Git Flow Hook)
✅ 버전 번호 자동 계산 (feat→minor, fix→patch)
✅ CHANGELOG 자동 생성
✅ Git 태그 & GitHub Release 자동 생성

**개발자는 Conventional Commits만 작성하면 됩니다!**

자세한 내용은 [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)를 참조하세요.

## 명령어

```bash
# 개발 서버 실행
pnpm dev

# 모든 패키지 빌드
pnpm build

# 린트 실행
pnpm lint

# Changeset 추가 (Release 담당자용)
pnpm changeset

# 버전 업데이트 (Github Actions가 자동 실행)
pnpm version

# 패키지 배포 (Github Actions가 자동 실행)
pnpm release
```

## 패키지 설명

### @repo/ui
UI 컴포넌트 라이브러리
- Button: 버튼 컴포넌트
- Card: 카드 컴포넌트

### @repo/hooks
React 커스텀 훅 라이브러리
- useCounter: 카운터 상태 관리
- useToggle: 토글 상태 관리

### @repo/eslint-config
공유 ESLint 설정
- 기본 설정
- React 전용 설정

### @repo/typescript-config
공유 TypeScript 설정
- base.json: 기본 설정
- react-library.json: React 라이브러리용
- react-app.json: React 앱용

## 버전 이력

현재 버전:
- @repo/ui: 0.1.0
- @repo/hooks: 0.0.1
- web: 0.0.2

자세한 변경 이력은 각 패키지의 CHANGELOG.md를 참조하세요.

## 📚 문서

상세한 가이드와 문서는 [docs](./docs/) 폴더를 참조하세요:

### 개발자용
- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** - 개발자를 위한 실용 가이드
  - 빠른 시작
  - 일상적인 개발 플로우
  - Conventional Commits 완벽 가이드
  - 자주 하는 작업들
  - FAQ

### 시스템 이해
- **[Automation Guide](./docs/AUTOMATION_GUIDE.md)** - 전체 자동화 시스템 가이드
  - 워크플로우 설명
  - 개발자 경험
  - Release 담당자 가이드
  - 트러블슈팅

- **[Workflows](./docs/WORKFLOWS.md)** - Github Actions 워크플로우 상세 설명
  - auto-changeset.yml 상세
  - release-branch.yml 상세
  - release.yml 상세
  - 커스터마이징 가이드

### 테스트
- **[Test Scenarios](./docs/TEST_SCENARIOS.md)** - 테스트 시나리오 및 체크리스트
  - 12가지 테스트 시나리오
  - 우선순위별 분류
  - 테스트 체크리스트

### 기존 문서
- [Branching Strategy](./BRANCHING_STRATEGY.md) - Git Flow 브랜치 전략
- [Release Workflow](./RELEASE_WORKFLOW.md) - 릴리즈 워크플로우
- [Contributing](./CONTRIBUTING.md) - 기여 가이드

## 테스트 시나리오

이 프로젝트에서는 다음 시나리오를 테스트했습니다:

1. ✅ Feature 개발 및 Release 브랜치 관리
2. ✅ Hotfix 긴급 배포
3. ✅ 자동 버전 관리 및 CHANGELOG 생성
4. ✅ 내부 패키지 의존성 자동 업데이트

## 라이선스

MIT
