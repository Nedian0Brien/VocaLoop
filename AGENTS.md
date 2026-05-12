# VocaLoop AGENTS.md

## 프로젝트 개요
React + Vite 프론트엔드와 FastAPI + SQLite 백엔드를 함께 쓰는 영단어/TOEFL 학습 앱.
FastAPI가 `/api/*` REST API, `/uploads/*` 정적 업로드, Vite 빌드 산출물(`dist/`)을 단일 프로세스로 서빙한다.

- **서버 경로**: `ubuntu@<host>`, `/home/ubuntu/project/VocaLoop`
- **도메인**: `https://voca-loop.lawdigest.cloud`
- **Node 버전**: v20 (nvm, GitHub Actions도 Node 20)
- **Python 버전**: GitHub Actions 기준 Python 3.12
- **프로세스 관리**: PM2 (`/home/ubuntu/.pm2`)
- **운영 프로세스**: `voca-loop`
- **운영 포트**: `3050` (`ecosystem.config.cjs` 기준)
- **데이터 저장소**: SQLite (`vocaloop.db`, 기본 `DATABASE_URL=sqlite:///./vocaloop.db`)
- **업로드 저장소**: 로컬 디스크 (`uploads/`, 기본 `UPLOADS_ROOT=./uploads`)

AI 기능은 브라우저에서 사용자의 API 키로 provider API를 직접 호출한다.
현재 지원 provider는 Gemini, OpenAI, Claude이며 설정은 계정 설정 화면과 `/api/settings`에 저장된다.
Firebase Auth/Firestore/Storage와 Express `server.js`는 현재 런타임이 아니다. 오래된 문서에 남아 있어도 레거시 기록으로 취급한다.

---

## 작업 기본 규칙

- 작업 전 `git status --short`로 사용자/다른 에이전트의 변경을 확인한다.
- 사용자 변경을 되돌리지 않는다. 특히 `src/components/*`, `src/services/*`, 테스트 파일은 작업 중 변경이 자주 남아 있을 수 있다.
- shell 명령은 가능하면 `rtk <command>` 프록시를 붙인다. 자세한 규칙은 `/home/ubuntu/.codex/RTK.md`를 따른다.
- 운영 상태를 확인할 때는 코드 추측보다 실제 PM2, 헬스체크, 공개 도메인 응답을 우선한다.
- 사용자가 명시적으로 커밋/푸시/배포를 막지 않은 경우, 작업 완료 후 검증을 마치면 관련 변경을 커밋하고 `main`에 푸시해 GitHub Actions 배포까지 자동으로 진행한다.
- 자동 배포를 진행한 경우 `gh run list`/`gh run view` 또는 동등한 방법으로 Actions 결과를 확인하고, 공개 도메인과 `/api/health` 응답까지 확인한 뒤 완료로 보고한다.

---

## 배포 방법

### 정상 배포 (권장)
`main` 브랜치에 push하면 GitHub Actions가 빌드, 백엔드 테스트, 서버 배포, Discord 알림까지 처리한다.

```bash
git add <files>
git commit -m "..."
GIT_SSH_COMMAND="ssh -i /home/ubuntu/.ssh/id_ed25519 -o StrictHostKeyChecking=no" git push origin main
```

GitHub Actions 워크플로우 (`.github/workflows/deploy.yml`) 흐름:
1. Build job: checkout -> Node 20 설정 -> Python 3.12 설정 -> `npm install`
2. Backend deps 설치: `python -m pip install -r backend/requirements.txt`
3. Frontend build: `npm run build`
4. Backend tests: `pytest backend/tests -q`
5. Deploy job: SSH 접속 -> `cd ~/project/VocaLoop`
6. 서버 checkout 강제 동기화: `git fetch origin main` -> `git reset --hard origin/main`
7. 서버 의존성/빌드: `npm install` -> `npm run build:clean` -> `python3 -m pip install --user -r backend/requirements.txt`
8. PM2 재시작: `pm2 restart voca-loop --update-env || pm2 start ecosystem.config.cjs --only voca-loop`
9. Discord 채널에 성공/실패 알림

주의: deploy job은 서버 checkout에서 `git reset --hard origin/main`을 실행한다.
운영 서버에서 직접 수정한 파일은 커밋/푸시하지 않으면 배포 시 사라진다.

### 파이프라인 트리거만 필요할 때
```bash
git commit --allow-empty -m "ci: retrigger deploy"
GIT_SSH_COMMAND="ssh -i /home/ubuntu/.ssh/id_ed25519 -o StrictHostKeyChecking=no" git push origin main
```

---

## 배포 시 주의사항

### root로 직접 빌드 절대 금지
GitHub Actions는 `ubuntu` 유저로 SSH 접속해 `npm run build:clean` (= `rm -rf dist && vite build`)을 실행한다.
root로 직접 빌드하면 `dist/` 파일 소유권이 root가 되어 ubuntu 유저가 삭제하지 못하고 배포가 실패할 수 있다.

만약 긴급하게 로컬에서 빌드/배포해야 한다면:
```bash
# 빌드 후 반드시 소유권 복구
export HOME=/home/ubuntu && export NVM_DIR=/home/ubuntu/.nvm && . /home/ubuntu/.nvm/nvm.sh && nvm use 20
npm run build
chown -R ubuntu:ubuntu /home/ubuntu/project/VocaLoop/dist/
```

### PM2 데몬 유의사항
- PM2는 `ubuntu` 유저 환경(`/home/ubuntu/.pm2`)에서 실행되어야 함
- `root` 유저로 PM2를 띄우면 GitHub Actions 배포 시 `pm2 restart voca-loop`가 ubuntu 데몬을 못 찾아 실패
- 실제 운영 프로세스 확인:
  ```bash
  export HOME=/home/ubuntu
  export PM2_HOME=/home/ubuntu/.pm2
  pm2 describe voca-loop
  ```
- PM2가 죽었을 때 재시작 방법:
  ```bash
  export HOME=/home/ubuntu && export NVM_DIR=/home/ubuntu/.nvm && . /home/ubuntu/.nvm/nvm.sh && nvm use 20
  export PM2_HOME=/home/ubuntu/.pm2
  cd /home/ubuntu/project/VocaLoop
  pm2 start ecosystem.config.cjs
  pm2 save
  ```
- node v20 환경에 pm2가 없을 경우 먼저 설치:
  ```bash
  npm install -g pm2
  ```

### 헬스체크와 공개 URL 확인
`/api/health`는 GET으로 확인한다. `curl -I`처럼 HEAD 요청을 쓰면 404가 나올 수 있다.
현재 live nginx 설정은 `/etc/nginx/sites-enabled/voca-loop`에서 `http://localhost:3050`으로 프록시한다.
루트의 `nginx.conf`는 템플릿/레거시일 수 있으므로 공개 라우팅을 판단할 때는 `sudo nginx -T`와 실제 응답을 우선한다.

```bash
curl -fsS http://127.0.0.1:3050/api/health
curl -fsS https://voca-loop.lawdigest.cloud/api/health
curl -I -sS https://voca-loop.lawdigest.cloud/
```

PM2가 온라인이어도 잘못된 cwd/포트로 떠 있을 수 있으니, 장애 시에는 먼저 `pm2 describe voca-loop`의 `exec cwd`, `script args`, `PM2_HOME`을 확인한다.

### git 설정
- remote URL은 SSH 방식 사용: `git@github.com:Nedian0Brien/VocaLoop.git`
- SSH 키: `/home/ubuntu/.ssh/id_ed25519`
- git 사용자: Minjae Park / parkmj9260@gmail.com

### GitHub Actions 로그 확인
우선 `gh run list`, `gh run view --log`를 사용한다.
gh CLI가 없을 경우 node 스크립트로 확인:
- `/tmp/gh_final2.js` 참고 (GH_TOKEN은 `/home/ubuntu/.config/gh/hosts.yml`에서 확인)

---

## 기술 스택 및 주요 파일

| 항목 | 내용 |
|------|------|
| 빌드 도구 | Vite 7 |
| UI | React 19 + Tailwind CSS 4 |
| 백엔드 | FastAPI + SQLAlchemy |
| DB | SQLite (`vocaloop.db`) |
| 인증 | 자체 이메일/비밀번호 + 쿠키 세션 |
| 업로드 | FastAPI static mount + 로컬 `uploads/` |
| AI | Gemini/OpenAI/Claude, 계정별 API 키 |
| 서버 | Uvicorn (`backend.app.main:app`) behind PM2 |

### 주요 파일
- `src/App.jsx` - 메인 앱 상태, SPA 라우팅, 로그인 후 초기 데이터 로딩
- `src/services/apiClient.js` - `/api` 호출 공통 래퍼 (`credentials: include`)
- `src/services/authApi.js` - 로그인/회원가입/로그아웃/세션 확인
- `src/services/wordApi.js` - 단어 CRUD
- `src/services/folderApi.js` - 폴더 CRUD/정렬
- `src/services/settingsApi.js` - 프로필/AI provider/model/API key 설정
- `src/services/uploadApi.js` - 프로필 이미지 업로드
- `src/services/aiModelService.js` - Gemini/OpenAI/Claude 호출 및 모델 목록
- `src/services/geminiService.js` - 단어 분석 프롬프트와 JSON 파싱
- `src/components/AccountSettings.jsx` - 프로필, 통계, 폴더, 데이터, 계정 설정
- `src/components/ToeflReadingTaskQuiz.jsx` - TOEFL Reading task practice
- `src/components/ToeflReadingMockTest.jsx` - TOEFL Reading mock test
- `src/services/toeflService.js` - TOEFL 문제 생성, Reading mock 라우팅/채점 보조
- `src/services/toeflReadingStats.js` - Reading practice localStorage 통계
- `backend/app/main.py` - FastAPI 앱, `/api/health`, 업로드 mount, SPA/static serving
- `backend/app/models.py` - SQLAlchemy 모델
- `backend/app/db.py` - DB engine/session/bootstrap, SQLite legacy column 보정
- `backend/app/routes/*.py` - auth/settings/account/folders/uploads/words API
- `backend/tests/*.py` - 백엔드 pytest
- `ecosystem.config.cjs` - PM2 설정 (운영 포트 3050)
- `.github/workflows/deploy.yml` - CI/CD 파이프라인

### 로컬 실행

프론트엔드 개발 서버:

```bash
npm run dev
```

FastAPI 프로덕션형 실행:

```bash
npm run build
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 3050
```

참고: `package.json`의 `npm start`는 현재 `--port 3000`으로 되어 있지만, 운영 PM2 설정과 실제 공개 도메인은 `3050`을 사용한다.
운영 기준을 확인할 때는 `ecosystem.config.cjs`와 `pm2 describe voca-loop`를 우선한다.

### 테스트/검증

```bash
npm run build
npm test
pytest backend/tests -q
```

GitHub Actions의 필수 게이트는 `npm run build`와 `pytest backend/tests -q`다.
Vitest(`npm test`)는 로컬 변경 폭이 프론트엔드 UI/서비스 테스트에 닿을 때 함께 실행한다.

### 환경 변수

프론트엔드:

```env
VITE_API_BASE_URL=
VITE_GEMINI_API_KEY=
VITE_OPENAI_API_KEY=
VITE_CLAUDE_API_KEY=
```

`VITE_API_BASE_URL`이 비어 있으면 같은 origin의 `/api/*`를 호출한다.
`VITE_*_API_KEY`는 로컬 fallback 용도이며, 기본 운영 흐름은 계정 설정에 저장된 사용자별 키를 사용한다.

백엔드:

```env
DATABASE_URL=sqlite:///./vocaloop.db
AUTH_SECRET_KEY=
AUTH_SECRET_FILE=/home/ubuntu/project/VocaLoop/.auth_secret
UPLOADS_ROOT=./uploads
ENVIRONMENT=production
```

`AUTH_SECRET_KEY`가 없으면 `AUTH_SECRET_FILE` 또는 기본 `.auth_secret` 파일을 사용/생성한다.
실제 secret, API key, DB 파일, 업로드 파일은 커밋하지 않는다.

### AI API 키 정책

- 계정별 API 키를 프로필 탭에서 설정한다.
- 서버 공용 DEFAULT_GEMINI_API_KEY fallback은 사용하지 않는다.
- 키 미입력 시 단어 분석, AI 채점, TOEFL 문제 생성 기능은 사용할 수 없다.
- provider별 모델 목록과 키 저장은 계정 설정 화면에서 관리한다.
