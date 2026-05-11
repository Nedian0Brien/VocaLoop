# VocaLoop 프론트엔드 개발 가이드

이 문서는 현재 VocaLoop 프론트엔드 구조와 개발 흐름을 정리합니다. 앱은 React + Vite로 빌드되고, 데이터와 인증은 FastAPI 백엔드가 담당합니다.

## 1. 현재 구조

```
VocaLoop/
├── backend/            # FastAPI 백엔드
├── src/                # React 프론트엔드
├── dist/               # Vite 빌드 산출물
├── package.json        # 프론트엔드 스크립트와 의존성
└── ecosystem.config.cjs # PM2 실행 설정
```

프론트엔드의 역할은 화면 렌더링과 `/api` 호출입니다. 인증, 단어 데이터, 폴더, 프로필 이미지 업로드는 모두 백엔드 API를 사용합니다.

## 2. 주요 파일

- `src/App.jsx`: 앱 상태와 라우팅 흐름, 로그인 후 초기 데이터 로딩
- `src/services/*.js`: 백엔드 API 호출 래퍼
- `src/components/*`: 화면별 UI 컴포넌트
- `backend/app/main.py`: FastAPI 엔트리포인트, API와 정적 파일 서빙

## 3. 실행 방법

개발 서버:

```bash
npm run dev
```

백엔드가 필요한 기능을 같이 확인하려면 FastAPI 서버도 함께 띄워야 합니다.

프로덕션 실행:

```bash
npm start
```

`npm start`는 `uvicorn backend.app.main:app`를 실행합니다. 즉, 프로덕션에서는 FastAPI가 API와 빌드된 프론트엔드를 함께 서빙합니다.

## 4. 환경 변수

프론트엔드에서 주로 쓰는 변수는 Gemini 키입니다.

```env
VITE_GEMINI_API_KEY=...
```

백엔드 쪽에서는 보통 다음 값을 사용합니다.

```env
DATABASE_URL=sqlite:///...
AUTH_SECRET_KEY=...
UPLOADS_ROOT=...
```

## 5. 작업 기준

- 외부 인증 SDK는 더 이상 사용하지 않습니다. 과거 설정 문서는 레거시로만 남아 있습니다.
- 새 기능은 가능하면 `src/services`에 API 래퍼를 먼저 두고, 컴포넌트는 그 래퍼만 호출하게 만듭니다.
- 데이터 저장 방식은 Firestore가 아니라 FastAPI + SQLite입니다.
