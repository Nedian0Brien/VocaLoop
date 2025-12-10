# ci: GitHub Actions CI/CD 파이프라인 구축 및 빌드 최적화

## 🎯 목적
코드 푸시 시 자동으로 테스트 및 배포를 수행하여 배포 프로세스의 신뢰성을 확보하고, 수동 배포로 인한 실수를 방지합니다. 또한, 빌드 과정에서 캐시 문제를 방지하여 안정적인 배포를 보장합니다.

## 📝 세부 작업 내용

### 1. GitHub Actions 워크플로우 생성 (`.github/workflows/deploy.yml`)
- **Trigger**: `main` 브랜치에 `push` 발생 시 실행
- **Jobs**:
    1. **Build & Test**:
        - Node.js 환경 셋업 (v18+)
        - 의존성 설치 (`npm ci`)
        - 린트 및 테스트 실행 (테스트 스크립트가 있다면)
    2. **Deploy (CD)**:
        - `appleboy/ssh-action`을 사용하여 VM에 접속
        - 최신 코드 풀 (`git pull origin main`)
        - 의존성 업데이트 (`npm ci`)
        - **Clean Build 수행**: 캐시 문제 방지를 위해 `npm run build:clean` 실행
        - PM2 재시작 (`pm2 restart voca-loop`)

### 2. 빌드 스크립트 활용
- 앞서 추가한 `build:clean` 스크립트(`rm -rf node_modules/.vite dist && vite build`)를 파이프라인에서 명시적으로 호출하여 빌드 무결성 보장

### 3. GitHub Secrets 설정 필요
- `HOST`: 서버 IP
- `USERNAME`: 서버 사용자명 (ubuntu)
- `KEY`: SSH Private Key

## ✅ 완료 조건
- [x] `.github/workflows/deploy.yml` 파일 생성
- [x] GitHub Repository Secrets 설정 완료
- [x] `main` 브랜치 푸시 후 Actions 탭에서 빌드 및 배포 성공 확인
- [x] 배포 로그에서 `clean` 단계 실행 확인 및 해시 변경 확인

## 🔒 종료 (Closed)
- **완료 일자**: 2025-12-10
- **결과**: CI/CD 파이프라인 구축 완료.
- **상세 내용**: [ci:GitHub_Actions_CI_CD_파이프라인_구축_및_빌드_최적화.md](../feat/ci:GitHub_Actions_CI_CD_파이프라인_구축_및_빌드_최적화.md) 참고.

### 코멘트
GitHub Actions를 통한 자동 배포 환경을 성공적으로 구축했습니다.
초기 배포 시 발생했던 모듈 미발견 오류는 `docs/troubleshooting/issue_ci_cd_deployment_failure.md`에 정리하여 해결했습니다.
이제 `main` 브랜치 푸시 시 안정적인 자동 배포가 이루어집니다.

