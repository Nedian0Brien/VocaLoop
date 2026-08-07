# iOS 앱 지원 (Capacitor) Implementation Plan

**Goal:** 기존 React/Vite 프론트엔드를 그대로 재사용해 VocaLoop를 iOS 네이티브 앱으로 패키징하고, 앱에서 `https://vocaloop.lawdigest.kr`의 FastAPI API를 인증까지 정상적으로 호출하게 만든다.

**배포 목표:** TestFlight / 개인 기기 설치 (App Store 정식 심사는 이번 범위 밖)

**Architecture:** Capacitor 8이 `dist/`를 `capacitor://localhost`에서 서빙하는 네이티브 WKWebView 컨테이너를 만든다. 웹 코드는 단일 코드베이스를 유지하고, 플랫폼 차이는 `src/native/*` 어댑터 한 겹에서만 흡수한다. 백엔드는 쿠키 세션을 유지하면서 네이티브 클라이언트용 Bearer 토큰 경로를 추가로 지원한다.

**Tech Stack:** Capacitor 8.5, React 19, Vite 7, FastAPI, Xcode 27 / iOS 26+ 시뮬레이터

---

## Research Findings

### Finding 1: 네이티브 WebView는 API와 cross-origin이 된다

- **File:** `backend/app/main.py:38-48`, `src/services/apiClient.js:1,125-134`
- **What:** 현재 FastAPI에는 CORS 미들웨어가 전혀 없다. 프론트가 항상 같은 origin(`dist/` 정적 서빙)에서 실행되기 때문이다.
- **Why:** Capacitor에서 앱 origin은 `capacitor://localhost`가 되고 API는 `https://vocaloop.lawdigest.kr`이므로, CORS를 추가하지 않으면 모든 `/api/*` 호출이 브라우저 단계에서 차단된다.

### Finding 2: HttpOnly 쿠키 세션은 네이티브에서 신뢰할 수 없다

- **File:** `backend/app/auth.py:17-19,72-110`
- **What:** 인증은 `vocaloop_session` HttpOnly 쿠키(`samesite="lax"`) 하나에만 의존한다.
- **Why:** `SameSite=Lax` 쿠키는 cross-site 요청에 실려 나가지 않고, WKWebView의 ITP는 서드파티 쿠키를 기본 차단한다. `SameSite=None`으로 바꿔도 iOS에서는 안정적이지 않다. 네이티브 클라이언트에는 `Authorization: Bearer` 경로가 필요하다.

### Finding 3: 세션 토큰 포맷을 그대로 재사용할 수 있다

- **File:** `backend/app/auth.py:45-69`
- **What:** 세션 값은 `"{user_id}:{session_version}.{hmac}"` 형태의 자체 서명 문자열이고, 로그아웃 시 `session_version`을 올려 무효화한다.
- **Why:** 별도 토큰 저장소나 JWT 도입 없이 같은 문자열을 Bearer 토큰으로 발급하면 로그아웃 무효화 로직까지 그대로 재사용된다.

### Finding 4: 업로드 이미지 경로가 상대경로다

- **File:** `src/components/AccountSettings.jsx:163-165`, `backend/app/main.py:39`
- **What:** 프로필 이미지는 `/uploads/...` 상대 경로로 내려오고 `<img src>`에 그대로 들어간다.
- **Why:** 네이티브에서는 `capacitor://localhost/uploads/...`로 잘못 해석되므로 API origin을 붙여주는 헬퍼가 필요하다.

### Finding 5: 브라우저 TTS는 iOS WKWebView에서 불안정하다

- **File:** `src/utils/speechSynthesis.js:13,95-108`
- **What:** 발음 재생이 `window.speechSynthesis`와 `getPreferredEnglishVoice`의 'Samantha' 계열 보이스 탐색에 의존한다.
- **Why:** WKWebView의 `speechSynthesis`는 voice 목록이 비거나 무음이 되는 사례가 잦다. 단어 학습 앱에서 발음은 핵심 기능이므로 네이티브 AVSpeechSynthesizer 경로가 필요하다.

### Finding 6: 반응형 UI는 이미 있고 safe-area만 없다

- **File:** `src/components/mobileNavAutoHide.js`, `src/hooks/useWindowSize.js`, `index.html:6`
- **What:** 모바일 레이아웃과 네비 자동 숨김은 구현되어 있으나 viewport에 `viewport-fit=cover`가 없고 CSS에 `env(safe-area-inset-*)` 사용이 없다.
- **Why:** 노치/홈 인디케이터 영역 대응만 추가하면 기존 화면을 거의 그대로 쓸 수 있다.

### Finding 7: 이미지 단어 가져오기는 추가 플러그인이 필요 없다

- **File:** `src/components/ScreenshotWordImportModal.jsx:172-177`
- **What:** `<input type="file" accept="image/*">`로 파일을 받는다.
- **Why:** WKWebView는 이 입력에 대해 사진 라이브러리/카메라/파일 피커를 네이티브로 띄운다. `@capacitor/camera` 없이 동작하고, Info.plist 권한 문구만 있으면 된다.

---

## 구현 단계

### Phase 1 — 백엔드: 네이티브 클라이언트 경계

- [ ] `backend/app/config.py`: `native_app_origins` 설정 추가 (`NATIVE_APP_ORIGINS` env로 확장)
- [ ] `backend/app/main.py`: `CORSMiddleware` 추가 (`allow_credentials=True`, 명시적 origin 목록)
- [ ] `backend/app/auth.py`: `Authorization: Bearer <token>` 수락, `create_session_token()` 공개, 네이티브 클라이언트 판별 의존성 추가
- [ ] `backend/app/schemas/auth.py`: `AuthResponse.session_token` optional 필드
- [ ] `backend/app/routes/auth.py`: 네이티브 클라이언트 요청일 때만 `session_token` 반환
- [ ] `backend/tests/test_auth.py` / `test_health.py`: Bearer 인증, 웹 응답에 토큰 미노출, CORS preflight 테스트

### Phase 2 — 프론트엔드: 네이티브 어댑터

- [ ] `capacitor.config.json` 추가 (appId `kr.lawdigest.vocaloop`, webDir `dist`)
- [ ] `src/native/platform.js`: 네이티브 여부 판별 단일 소스
- [ ] `src/native/sessionStore.js`: 세션 토큰 저장/조회/삭제
- [ ] `src/native/bootstrap.js`: 상태바·스플래시·키보드·앱 라이프사이클 초기화
- [ ] `src/native/speech.js`: 네이티브 TTS 경로
- [ ] `src/native/haptics.js`: 정답/오답 햅틱
- [ ] `src/services/apiClient.js`: Bearer 헤더 부착, `X-VocaLoop-Client` 헤더, `resolveAssetUrl()`
- [ ] `src/services/authApi.js`: 로그인/회원가입 시 토큰 저장, 로그아웃 시 삭제
- [ ] `src/utils/speechSynthesis.js`: 네이티브 TTS 우선 사용
- [ ] `index.html` / `src/index.css`: `viewport-fit=cover` + safe-area 패딩
- [ ] `src/main.jsx`: 네이티브에서 SpeedInsights 비활성화, 네이티브 부트스트랩 호출

### Phase 3 — iOS 네이티브 프로젝트

- [ ] `npx cap add ios` 로 `ios/App` 생성
- [ ] `Info.plist`: 앱 표시 이름, 사진 라이브러리/카메라 권한 문구(한국어), 지원 방향
- [ ] 앱 아이콘 / 스플래시 에셋
- [ ] `.gitignore`: Pods, DerivedData, xcuserdata 제외

### Phase 4 — 스크립트 · 문서 · 검증

- [ ] `package.json`: `ios:build`, `ios:sync`, `ios:open`, `ios:run` 스크립트
- [ ] `.env.ios.example`: 네이티브 빌드용 `VITE_API_BASE_URL`
- [ ] `AGENTS.md` / `README.md` / `README.en.md`: iOS 섹션
- [ ] `npm test`, `npm run build`, `pytest backend/tests -q` 통과
- [ ] iOS 시뮬레이터 실행 및 로그인 → 단어 목록 → 퀴즈 흐름 확인

---

## 결정 사항과 트레이드오프

| 결정 | 근거 | 트레이드오프 |
|---|---|---|
| 웹 자산을 앱에 번들 (server.url 미사용) | 오프라인 기동, 앱스토어 4.2 리스크 완화, 콜드스타트 속도 | 프론트 변경 시 앱 재빌드 필요 |
| 기존 서명 세션 문자열을 Bearer 토큰으로 재사용 | JWT/토큰 테이블 도입 없이 로그아웃 무효화 로직 유지 | 토큰 만료가 쿠키 `max_age`와 달리 서버측에 없음 (`session_version`으로만 무효화) |
| 토큰 저장에 `@capacitor/preferences` 사용 | 공식 플러그인, 의존성 최소화 | UserDefaults 기반이라 Keychain보다 약함. App Store 배포 시 `sessionStore.js` 한 파일만 Keychain 플러그인으로 교체 |
| 네이티브 클라이언트에만 토큰 반환 | 웹은 HttpOnly 쿠키 유지 → XSS로 토큰 탈취 불가 | 클라이언트 판별이 헤더 기반이라 위조 가능. 단, 위조해도 이미 인증에 성공한 요청이라 권한 상승은 없음 |
