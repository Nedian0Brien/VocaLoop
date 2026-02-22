# VocaLoop AGENTS.md

## 프로젝트 개요
React + Vite + Firebase 기반 영단어 학습 앱. Gemini API로 단어 분석/채점 기능 제공.

- **서버**: `ubuntu@<host>`, `/home/ubuntu/project/voca-loop/VocaLoop`
- **도메인**: `https://voca-loop.lawdigest.cloud`
- **Node 버전**: v20 (nvm)
- **프로세스 관리**: PM2 (`/home/ubuntu/.pm2`)

---

## 배포 방법

### 정상 배포 (권장)
`main` 브랜치에 push하면 **GitHub Actions**가 자동으로 빌드 + 배포 + Discord 알림까지 처리한다.

```bash
git add <files>
git commit -m "..."
GIT_SSH_COMMAND="ssh -i /home/ubuntu/.ssh/id_ed25519 -o StrictHostKeyChecking=no" git push origin main
```

GitHub Actions 워크플로우 (`.github/workflows/deploy.yml`) 흐름:
1. Node 18로 빌드 테스트 (`npm ci`)
2. SSH로 서버 접속 → `git pull` → `npm install` → `npm run build:clean` → `pm2 restart voca-loop --update-env`
3. Discord 채널에 성공/실패 알림

### 파이프라인 트리거만 필요할 때
```bash
git commit --allow-empty -m "ci: retrigger deploy"
GIT_SSH_COMMAND="ssh -i /home/ubuntu/.ssh/id_ed25519 -o StrictHostKeyChecking=no" git push origin main
```

---

## ⚠️ 배포 시 주의사항

### root로 직접 빌드 절대 금지
GitHub Actions는 `ubuntu` 유저로 SSH 접속해 `npm run build:clean` (= `rm -rf dist && vite build`)을 실행한다.
**root로 직접 빌드하면 `dist/` 파일 소유권이 root가 되어 ubuntu 유저가 삭제 불가 → 배포 실패.**

만약 긴급하게 로컬에서 빌드/배포해야 한다면:
```bash
# 빌드 후 반드시 소유권 복구
export HOME=/home/ubuntu && export NVM_DIR=/home/ubuntu/.nvm && . /home/ubuntu/.nvm/nvm.sh && nvm use 20
npm run build
chown -R 1001:1001 /home/ubuntu/project/voca-loop/VocaLoop/dist/
```

### PM2 데몬 유의사항
- PM2는 `ubuntu` 유저 환경(`/home/ubuntu/.pm2`)에서 실행되어야 함
- `root` 유저로 PM2를 띄우면 GitHub Actions 배포 시 `pm2 restart voca-loop`가 ubuntu 데몬을 못 찾아 실패
- PM2가 죽었을 때 재시작 방법:
  ```bash
  export HOME=/home/ubuntu && export NVM_DIR=/home/ubuntu/.nvm && . /home/ubuntu/.nvm/nvm.sh && nvm use 20
  export PM2_HOME=/home/ubuntu/.pm2
  cd /home/ubuntu/project/voca-loop/VocaLoop
  pm2 start ecosystem.config.cjs
  pm2 save
  ```
- node v20 환경에 pm2가 없을 경우 먼저 설치:
  ```bash
  npm install -g pm2
  ```

### git 설정
- remote URL은 SSH 방식 사용: `git@github.com:Nedian0Brien/VocaLoop.git`
- SSH 키: `/home/ubuntu/.ssh/id_ed25519`
- git 사용자: Minjae Park / parkmj9260@gmail.com

### GitHub Actions 로그 확인
gh CLI가 없을 경우 node 스크립트로 확인:
- `/tmp/gh_final2.js` 참고 (GH_TOKEN은 `/home/ubuntu/.config/gh/hosts.yml`에서 확인)

---

## 기술 스택 및 주요 파일

| 항목 | 내용 |
|------|------|
| 빌드 도구 | Vite 7 |
| UI | React 19 + Tailwind CSS 4 |
| 백엔드 | Firebase (Firestore + Auth + Storage) |
| AI | Gemini API (계정별 개인 키 필수) |
| 서버 | Express (`server.js`) |

### 주요 파일
- `src/App.jsx` - 메인 앱, 인증/데이터 로직
- `src/components/AccountSettings.jsx` - 프로필 탭 (Gemini API 키 설정)
- `src/services/geminiService.js` - Gemini API 호출
- `ecosystem.config.cjs` - PM2 설정 (포트 3000)
- `.github/workflows/deploy.yml` - CI/CD 파이프라인

### Gemini API 키 정책
- 계정별 개인 키를 프로필 탭에서 필수 입력
- 서버 공용 DEFAULT_GEMINI_API_KEY fallback 없음 (제거됨)
- 키 미입력 시 단어 추가 및 AI 채점 기능 사용 불가
