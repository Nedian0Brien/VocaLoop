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
| backend/app/ | FastAPI app, routers, database bootstrap, settings, upload and AI routes |
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

## 검증

| 항목 | 명령 |
|---|---|
| Frontend/unit tests | `npm test` |
| Frontend build | `npm run build` |
| Backend tests | `pytest backend/tests -q` |
| Health check | `curl http://localhost:3050/api/health` |

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
