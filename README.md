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
pnpm install
```

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

이 프로젝트는 **Conventional Commits**로 버전 관리를 **완전히 자동화**합니다.

### 브랜치 전략

```
feature/* → develop → main
```

- **feature/**: 기능 개발
- **develop**: 통합 개발 (changesets 수집)
- **main**: 프로덕션 릴리스 (버전 업데이트)

### 개발자는 이것만 하면 됩니다

```bash
# 1. Feature 브랜치에서 코드 작성
git checkout develop
git checkout -b feature/my-feature

# 2. Conventional Commits로 커밋
git commit -m "feat(ui): add new component"

# 3. PR 생성 (develop으로!)
gh pr create --base develop
```

### 자동으로 처리되는 것들

✅ **Feature → Develop**: Changeset 자동 생성
✅ **Develop → Main**: "Version Packages" PR 자동 생성
✅ 버전 번호 자동 계산 (feat→minor, fix→patch)
✅ CHANGELOG 자동 생성
✅ (설정 시) npm 자동 배포

**개발자는 changesets을 전혀 신경쓰지 않아도 됩니다!**

자세한 내용은 [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md)와 [RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md)를 참조하세요.

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

## 테스트 시나리오

이 프로젝트에서는 다음 시나리오를 테스트했습니다:

1. ✅ Feature 개발 및 Release 브랜치 관리
2. ✅ Hotfix 긴급 배포
3. ✅ 자동 버전 관리 및 CHANGELOG 생성
4. ✅ 내부 패키지 의존성 자동 업데이트

## 라이선스

MIT
