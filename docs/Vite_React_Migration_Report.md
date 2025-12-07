# 🚀 React Migration Report

VocaLoop 프로젝트가 기존 **단일 HTML 파일 구조**에서 **Vite + React 기반의 현대적 아키텍처**로 성공적으로 전환되었습니다.

## 1. 개요 (Overview)

*   **마이그레이션 일시**: 2025년 4월
*   **목표**: 보안 강화(.env), 유지보수성 향상(컴포넌트 분리), 개발 생산성 증대(HMR).
*   **결과**: 초기 로딩 에러 해결 및 컴포넌트 기반 구조 확립 완료.

## 2. 주요 변경 사항

### A. 폴더 구조 개선
단일 파일에 몰려있던 코드를 기능별로 분리하여 관리 효율을 높였습니다.

```
src/
├── components/         # UI 컴포넌트 (WordCard, Header 등)
├── hooks/              # 커스텀 훅 (useWindowSize)
├── services/           # 외부 API 로직 (Gemini API)
├── App.jsx             # 메인 비즈니스 로직
├── main.jsx            # React 진입점
└── index.css           # Tailwind CSS 설정
```

### B. 주요 문제 해결 (Troubleshooting)
1.  **환경 변수 로딩 이슈**:
    *   `src/app.html`에서 환경 변수가 없어 무한 로딩되던 문제를 해결.
    *   `.env` 파일을 도입하여 API Key를 안전하게 분리.
    *   Vite 환경 변수 접두사(`VITE_`) 규칙 적용 및 JSON 파싱 에러 해결.
2.  **Firebase 인증 에러**:
    *   `auth/configuration-not-found`: Firebase Console에서 Email/Password 로그인 활성화로 해결.
    *   `auth/email-already-in-use`: 테스트 계정 충돌 문제를 이메일 변경(`tester@vocaloop.ai`)으로 해결.
3.  **데이터베이스 권한 문제**:
    *   `Missing or insufficient permissions`: Firestore 보안 규칙을 개발 모드(`allow read, write: if request.auth != null;`)로 수정하여 해결.

### C. 신규 기능
*   **에러 알림 (Toast)**: 시스템 에러나 삭제 실패 시, 우측 하단에 사용자 친화적인 알림 UI가 뜹니다.

## 3. 실행 가이드

### 개발 서버 실행
```bash
npm run dev
```
*   `http://localhost:3000` (또는 터미널에 표시된 포트)로 접속.

### 빌드 및 배포
```bash
npm run build
```
*   `dist/` 폴더에 최적화된 정적 파일이 생성됩니다.

## 4. 향후 로드맵 (Phase 2 & 3)

1.  **퀴즈 시스템 구현 (우선순위 높음)**:
    *   `src/services/quizService.js` 생성 예정.
    *   저장된 단어를 기반으로 4지 선다형 퀴즈 자동 생성 로직 구현.
2.  **학습 모드 화면**:
    *   `src/components/StudyMode.jsx` 구현.
    *   퀴즈 풀기 및 즉각적인 피드백 UI 제공.
3.  **망각 곡선 스케줄링**:
    *   Firebase 데이터 모델에 `nextReviewDate` 필드 추가.
    *   정답/오답 여부에 따라 다음 복습 시간 계산 알고리즘 적용.

---
**작성자**: VocaLoop AI Assistant
