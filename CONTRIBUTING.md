# Contributing Guide

## Commit Message Convention

이 프로젝트는 **Conventional Commits**를 사용하여 자동으로 버전을 관리합니다.

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 새로운 기능 추가 → **minor** 버전 업데이트 (0.X.0)
- `fix`: 버그 수정 → **patch** 버전 업데이트 (0.0.X)
- `docs`: 문서 변경
- `style`: 코드 포맷팅, 세미콜론 추가 등
- `refactor`: 코드 리팩토링
- `perf`: 성능 개선
- `test`: 테스트 코드 추가/수정
- `chore`: 빌드 프로세스, 도구 설정 등
- `build`: 빌드 시스템 변경
- `ci`: CI 설정 변경

### Breaking Changes

Major 버전 업데이트 (X.0.0)를 위해서는:

```bash
# 방법 1: ! 추가
feat!: change API interface

# 방법 2: BREAKING CHANGE 추가
feat: change API interface

BREAKING CHANGE: API 인터페이스가 변경되었습니다.
```

### 예시

#### Minor 버전 업데이트 (새 기능)

```bash
feat(ui): add Card component

Card 컴포넌트를 추가했습니다.
- title과 footer props 지원
- 스타일링 포함
```

#### Patch 버전 업데이트 (버그 수정)

```bash
fix(hooks): add missing reset function to useToggle

useToggle 훅에 reset 함수가 누락되어 있었습니다.
```

#### Major 버전 업데이트 (Breaking Change)

```bash
feat(ui)!: change Button API

BREAKING CHANGE: Button 컴포넌트의 API가 변경되었습니다.
- variant prop이 type prop으로 변경됨
- onClick이 필수 prop이 됨
```

## 개발 워크플로우

### 1. 브랜치 생성

```bash
git checkout -b feature/your-feature-name
```

브랜치 명명 규칙:
- `feature/`: 새로운 기능
- `fix/`: 버그 수정
- `docs/`: 문서 업데이트
- `refactor/`: 리팩토링

### 2. 코드 작성

패키지 구조에 맞게 코드를 작성하세요:

```
packages/
├── ui/          # UI 컴포넌트
├── hooks/       # React 커스텀 훅
├── eslint-config/    # ESLint 설정 (버전 관리 제외)
└── typescript-config/ # TS 설정 (버전 관리 제외)
```

### 3. 커밋

**Conventional Commits 형식**을 따라 커밋하세요:

```bash
git add .
git commit -m "feat(ui): add new Button variant"
```

### 4. Pull Request 생성

```bash
git push origin feature/your-feature-name
```

GitHub에서 PR을 생성하면:
- ✅ 커밋 메시지가 자동으로 검증됩니다
- ✅ 빌드와 테스트가 실행됩니다

### 5. 리뷰 및 머지

리뷰가 완료되면 PR을 main에 머지합니다.

### 6. 자동 릴리스

Main에 머지되면 **자동으로**:
1. 커밋 메시지를 분석하여 changeset 생성
2. "Version Packages" PR 자동 생성
3. CHANGELOG 자동 생성

Release 담당자가 "Version Packages" PR을 머지하면:
1. 버전 번호 자동 업데이트
2. (설정 시) npm 자동 배포

## Changesets을 직접 관리하지 마세요!

**개발자는 changesets를 신경쓸 필요가 없습니다.**

- ❌ `pnpm changeset` 실행하지 마세요
- ❌ `.changeset/*.md` 파일을 직접 생성하지 마세요
- ✅ Conventional Commits만 따르세요

모든 버전 관리는 Github Actions가 자동으로 처리합니다.

## 테스트

```bash
# 빌드 테스트
pnpm build

# 린트 실행
pnpm lint

# 웹 앱 실행
pnpm dev
```

## 질문이 있나요?

- [RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md) 참조
- Issue를 생성하세요
- 팀 멤버에게 문의하세요
