# 📘 VocaLoop 프론트엔드 개발 가이드

이 문서는 VocaLoop 프로젝트의 프론트엔드 아키텍처, 디렉토리 구조, 그리고 개발 환경 설정에 대해 설명합니다. React 개발이 처음인 분들도 이해할 수 있도록 상세하게 작성되었습니다.

## 1. 아키텍처 변경 사항 (Migration)

기존에는 하나의 `app.html` 파일 안에 HTML, CSS, JavaScript(React)가 모두 들어있는 단순한 구조였습니다. 이를 **Vite + React** 기반의 현대적인 프로젝트 구조로 변경했습니다.

### 왜 변경했나요?
*   **보안**: 민감한 API Key 등을 코드에서 분리하여 `.env` 파일로 안전하게 관리할 수 있습니다.
*   **생산성**: 코드를 저장하면 브라우저가 자동으로 새로고침되는 HMR(Hot Module Replacement) 기능을 사용할 수 있습니다.
*   **확장성**: 코드가 길어지면 여러 파일로 나누어 관리(모듈화)하기가 훨씬 쉽습니다.

---

## 2. 현재 디렉토리 구조 및 파일 설명

현재 프로젝트의 폴더와 파일들이 어떤 역할을 하는지 설명합니다.

```
VocaLoop/
├── .env                # (중요) 환경 변수 파일 (API Key 등 저장)
├── .gitignore          # Git에 업로드하지 않을 파일 목록 설정
├── index.html          # 웹사이트의 진입점 (Entry Point)
├── package.json        # 프로젝트 정보 및 라이브러리(의존성) 목록
├── vite.config.js      # Vite 빌드 도구 설정 파일
├── tailwind.config.js  # Tailwind CSS 스타일 설정 파일
├── src/                # 실제 소스 코드가 위치하는 곳
│   ├── main.jsx        # React 앱을 HTML에 연결하는 파일
│   ├── App.jsx         # 메인 로직이 들어있는 핵심 컴포넌트
│   └── index.css       # 전역 CSS 스타일 (Tailwind 포함)
└── docs/               # 기획서 및 개발 문서
```

### 주요 파일 상세
*   **`src/App.jsx`**: 기존 `app.html`에 있던 핵심 로직(화면 그리기, 데이터 처리 등)이 모두 여기로 옮겨졌습니다. 앞으로의 **기능 개발은 주로 이 파일을 수정**하게 됩니다.
*   **`src/main.jsx`**: `App.jsx`를 가져와서 `index.html`의 `<div id="root">` 안에 집어넣는 역할을 합니다. 특별한 일이 없으면 건드릴 필요가 없습니다.
*   **`.env`**: API Key 같은 비밀 정보를 담는 금고입니다. 이 파일은 절대 **GitHub나 다른 곳에 공유하면 안 됩니다.**

---

## 3. 권장 디렉토리 구조 설계 (Best Practices)

프로젝트 규모가 커지면 파일을 종류별로 나누어 관리해야 합니다. 향후 다음과 같은 폴더 구조로 정리하는 것을 추천합니다.

```
src/
├── components/         # 재사용 가능한 UI 조각들
│   ├── layout/         # Header, Footer 등 레이아웃 관련
│   ├── common/         # Button, Input 등 공통 컴포넌트
│   └── text/           # 텍스트, 타이포그래피 관련
├── hooks/              # 복잡한 로직을 분리한 커스텀 훅 (예: useGemini)
├── services/           # 외부 API 통신 코드 (Firebase, Gemini API 호출 함수)
├── pages/              # 각 페이지 단위 컴포넌트 (Dashboard, Study 등)
├── assets/             # 이미지, 폰트, 아이콘 파일
└── utils/              # 날짜 변환 등 단순 도움 함수들
```

### 💡 팁: 언제 파일을 분리하나요?
*   한 파일(`App.jsx`)의 코드가 300줄을 넘어가기 시작할 때.
*   똑같은 UI(예: 버튼)를 다른 곳에서도 쓰고 싶을 때.
*   로직이 너무 복잡해서 UI 코드와 섞여있어 읽기 힘들 때.

---

## 4. 개발 환경 실행 방법

이제부터는 터미널(Terminal)을 통해 개발 서버를 켜야 합니다.

1.  **패키지 설치** (최초 1회)
    프로젝트에 필요한 도구들을 다운로드합니다.
    ```bash
    npm install
    ```

2.  **개발 서버 시작**
    작업지시서와 같은 명령어로 서버를 켭니다.
    ```bash
    npm run dev
    ```
    서버가 켜지면 터미널에 나오는 주소(예: `http://localhost:5173`)를 클릭해서 브라우저를 엽니다.

3.  **빌드 (배포용)**
    실제 인터넷에 올릴 파일을 만들 때 사용합니다.
    ```bash
    npm run build
    ```

---

## 5. 환경 변수 (.env) 설정 가이드

Vite 환경에서 `.env` 파일의 변수는 반드시 `VITE_`로 시작해야 코드에서 읽을 수 있습니다.

**올바른 예시 (`.env`):**
```env
# Gemini API Key
VITE_GEMINI_API_KEY=AIzaSy...

# Firebase Config (반드시 한 줄로 된 JSON 문자열이어야 함)
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}
```

**코드에서 사용하는 법:**
```javascript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

---
