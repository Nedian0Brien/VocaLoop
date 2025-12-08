# 📅 Daily Development Report (2025-12-07)

**주제**: Vite + React 마이그레이션 및 초기 개발 환경 안정화

## 1. 📝 개요 (Summary)
금일 작업은 기존의 단일 HTML 파일(`app.html`) 기반이었던 VocaLoop 프로젝트를 **Vite + React** 기반의 현대적인 모듈형 아키텍처로 완전히 이전하는 데 집중하였습니다.
마이그레이션 과정에서 발생한 환경 변수 로딩, Firebase 인증/권한 에러, UI 스타일링 문제를 모두 해결하였으며, 최종적으로 **컴포넌트 단위 리팩토링**을 통해 확장 가능한 코드 구조를 확립했습니다.

## 2. 🛠️ 진행 내역 (Development Log)

### A. 프로젝트 구조 개편 (Architecture)
*   [x] **Vite 초기화**: `vite.config.js`, `package.json` 설정 및 `npm run dev` 구동 환경 구축.
*   [x] **Tailwind CSS v4 설정**: `postcss.config.js` 및 `src/index.css`를 통해 최신 스타일링 환경 적용.
*   [x] **진입점 변경**: `src/main.jsx` 및 `index.html`을 생성하여 React 18 Root 렌더링 방식 적용.
*   [x] **파비콘 적용**: Loop 아이콘(SVG Data URI)을 파비콘으로 설정.

### B. 환경 변수 및 보안 (Security & Config)
*   [x] **.env 도입**: API Key와 Firebase Config를 코드에서 분리하여 `.env` 파일로 관리.
*   [x] **환경 변수 로더 구현**: `VITE_` 접두사 변수를 우선 로드하고, 로컬 스토리지(`SetupScreen`)를 Fallback으로 사용하는 `loadConfig` 로직 구현.
*   [x] **JSON 파싱 에러 해결**: `.env` 파일 내 JSON 문자열의 줄바꿈 문제로 인한 파싱 에러 수정 (Single-line 강제).

### C. 에러 해결 및 안정화 (Troubleshooting)
*   [x] **무한 로딩("Initializing...") 해결**: Firebase Config 누락 시 즉시 `SetupScreen`으로 진입하도록 예외 처리.
*   [x] **Firebase Auth 에러 해결**:
    *   `auth/configuration-not-found`: Firebase Console에서 Email/Password 로그인 활성화.
    *   `auth/email-already-in-use`: 테스트 계정 충돌 -> `tester@vocaloop.ai`로 변경하여 해결.
    *   로그인 실패 시 400 Bad Request가 뜨는 현상은 자동 가입 로직의 정상적인 흐름임을 확인.
*   [x] **Firestore 권한 문제 해결**:
    *   `Missing or insufficient permissions`: Security Rules를 개발 모드(`allow read, write: if request.auth != null;`)로 변경.

### D. 리팩토링 및 UX 개선 (Refactoring & UX)
*   [x] **컴포넌트 분리**: 거대한 `App.jsx`를 기능별로 분리.
    *   `src/components/`: `Header`, `WordCard`, `SetupScreen`, `Icons` 등.
    *   `src/hooks/`: `useWindowSize`
    *   `src/services/`: `geminiService`
*   [x] **에러 알림(Toast) 추가**: `console.error` 대신 화면 우측 하단에 붉은색 알림창이 뜨도록 UX 개선.
*   [x] **폰트 수정**: `WordCard`의 영단어 폰트가 적용되지 않던 오타(`serif-font` -> `font-serif`) 수정.

## 3. 📊 현재 상태 (Current Status)
*   **서버 실행**: `npm run dev`로 즉시 실행 가능.
*   **테스트 계정**: `tester@vocaloop.ai` (자동 로그인 설정됨).
*   **기능**: 단어 추가(Gemini AI 연동), 단어 목록 조회, 단어 삭제, TTS 재생 정상 동작.
*   **코드 품질**: 컴포넌트 분리가 완료되어 `App.jsx`가 매우 간결해짐.

## 4. 🚀 다음 단계 (Next Steps - Phase 2)
1.  **퀴즈 시스템 개발**:
    *   `QuizService` 구현: 저장된 단어들을 활용해 4지 선다/주관식 문제 생성 알고리즘 개발.
2.  **학습 모드(Study Mode) UI**:
    *   실제 퀴즈를 풀고 채점 결과를 시각적으로 보여주는 인터페이스 구현.
3.  **적응형 학습 루프 (Adaptive Loop)**:
    *   망각 곡선 이론을 적용하여 틀린 문제의 재출제 타이밍 스케줄링.
