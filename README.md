<div align="center">

# VocaLoop

**AI 기반 단어 분석과 반복 학습 루프를 하나로 묶은 단어 학습 앱**

![React 19](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)

[English](./README.en.md)

</div>

---

## 소개

VocaLoop는 영어 단어를 추가하고, AI가 뜻·발음·예문·동의어를 보강한 뒤, 사용자의 학습 상태에 맞춰 반복 학습과 퀴즈를 이어가는 개인 단어장 앱입니다.

현재 저장소는 React/Vite 프론트엔드와 FastAPI 백엔드를 함께 포함합니다. 백엔드는 사용자 계정, 단어·폴더 API, TOEFL 학습 기능, 업로드, 이미지 기반 단어 추출 API를 담당하고, 빌드된 프론트엔드 정적 파일도 함께 서빙합니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| AI 단어 보강 | 단어의 한국어 의미, 발음, 정의, 예문, 유의어 정보를 생성해 학습 데이터로 저장합니다. |
| 적응형 학습 루프 | 단어 상태와 오답 기록을 바탕으로 학습 큐와 복습 흐름을 관리합니다. |
| 퀴즈 모드 | 객관식, 주관식, 빈칸, TOEFL 스타일 문제 흐름을 지원합니다. |
| 이미지 단어 가져오기 | 단어장 스크린샷에서 후보 단어를 추출하고, 사용자가 검토한 뒤 기존 bulk-add 저장 흐름으로 넘깁니다. |
| 단일 배포 단위 | FastAPI 서버가 API와 빌드된 Vite 정적 파일을 함께 제공합니다. |

## 저장소 구조

| 경로 | 역할 |
|---|---|
| src/ | React frontend source, hooks, components, services, quiz flows |
| src/native/ | Capacitor 네이티브 어댑터 (플랫폼 판별, 세션 토큰, TTS, 햅틱, 부트스트랩) |
| backend/app/ | FastAPI app, routers, database bootstrap, settings, upload and AI routes |
| ios/ | Capacitor iOS 네이티브 프로젝트 (Xcode, Swift Package Manager) |
| docs/ | Design notes, feature specs, troubleshooting reports, implementation plans |
| shared/ | Shared provider metadata and cross-runtime configuration |
| public/ | Static assets and dictionary data |

## 빠른 시작

### 의존성 설치

```bash
npm install
```

### 백엔드 의존성 설치

```bash
python3 -m venv backend/.venv && source backend/.venv/bin/activate && pip install -r backend/requirements.txt
```

### 프론트엔드 개발 서버

```bash
npm run dev
```

### 백엔드/API 실행

```bash
npm run start
```

### 프로덕션 빌드

```bash
npm run build
```

## iOS 앱

`ios/`는 SwiftUI로 만든 **네이티브 앱**입니다. 웹 코드를 감싸지 않고 같은 FastAPI API만 공유합니다.

### 요구 사항

- Xcode 26 이상 (최소 지원 iOS 26.0)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`

`VocaLoop.xcodeproj`는 `ios/project.yml`에서 생성하며 커밋하지 않습니다. pbxproj 병합 충돌을 피하기 위함입니다.

### 빌드와 실행

```bash
npm run ios:open
```

| 명령 | 역할 |
|---|---|
| `npm run ios:gen` | `project.yml`에서 Xcode 프로젝트 생성 |
| `npm run ios:open` | 프로젝트 생성 후 Xcode로 열기 |
| `npm run ios:test` | 시뮬레이터에서 유닛 테스트 실행 |

실기기에 설치할 때는 팀 ID를 넘깁니다 (프로젝트에는 커밋하지 않습니다).

```bash
cd ios && xcodebuild -project VocaLoop.xcodeproj -scheme VocaLoop -configuration Debug -destination 'id=<device-udid>' -derivedDataPath ./DerivedData DEVELOPMENT_TEAM=<team-id> -allowProvisioningUpdates build
```

API 서버는 기본이 `https://vocaloop.lawdigest.kr`입니다. 로컬 백엔드로 붙일 때는 실행 인자로 덮어씁니다.

```bash
xcrun simctl launch <udid> kr.lawdigest.vocaloop -VocaLoopAPIBaseURL "http://localhost:3050"
```

### 구조

| 경로 | 역할 |
|---|---|
| `ios/VocaLoop/Core/Networking` | `APIClient`(actor), 엔드포인트, JSON 코딩 규칙 |
| `ios/VocaLoop/Core/Auth` | Keychain 세션 저장, 로그인/세션 복원 |
| `ios/VocaLoop/Core/Models` | 백엔드 스키마와 대응하는 도메인 모델 |
| `ios/VocaLoop/Features` | 화면별 뷰와 `@Observable` 스토어 |
| `ios/VocaLoopTests` | 퀴즈 채점·출제 로직과 디코딩 테스트 |

### 웹과 다른 점

| 항목 | 웹 | iOS 앱 |
|---|---|---|
| 인증 | `vocaloop_session` HttpOnly 쿠키 | `Authorization: Bearer` + Keychain 저장 토큰 |
| 발음 재생 | `window.speechSynthesis` | `AVSpeechSynthesizer` |
| 정답/오답 피드백 | 효과음 | `sensoryFeedback` 햅틱 |

백엔드는 `X-VocaLoop-Client` 헤더가 붙은 요청에만 로그인/회원가입 응답에 `session_token`을 실어 보냅니다. 웹 응답에는 항상 `null`이라 브라우저에서는 토큰이 노출되지 않습니다.

네이티브 앱은 `Authorization` 헤더만 쓰므로 CORS가 필요 없지만, 백엔드의 `NATIVE_APP_ORIGINS` 설정은 그대로 두었습니다 (쉼표 구분으로 origin 추가 가능).

## 검증

| 항목 | 명령 |
|---|---|
| Frontend/unit tests | `npm test` |
| Frontend build | `npm run build` |
| Backend tests | `pytest backend/tests -q` |
| Health check | `curl http://localhost:3050/api/health` |
| iOS 시뮬레이터 빌드 | `npm run ios:run` |

## 운영 메모

- 프로덕션 PM2 프로세스 이름은 `voca-loop`입니다.
- 운영 포트는 `3050`이며, `ecosystem.config.cjs`에서 `CODEX_BIN`, `PIPER_*` 경로와 timeout 환경 변수를 설정합니다.
- 이미지 단어 추출은 DB 저장 전에 사용자 검토 단계를 거치도록 설계되어 있습니다.

## 문서 작성 근거

이 README는 저장소 안의 다음 파일과 문서를 기준으로 작성했습니다.

- `package.json`
- `backend/requirements.txt`
- `backend/app/main.py`
- `docs/plan/Specification.md`
- `docs/superpowers/specs/2026-06-19-screenshot-vocabulary-import-design.md`
- `ecosystem.config.cjs`
