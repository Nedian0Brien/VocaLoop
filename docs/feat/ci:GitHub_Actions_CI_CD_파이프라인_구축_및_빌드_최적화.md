# CI/CD 파이프라인 구축 및 빌드 최적화

## 문제 상황

기존에는 코드를 수정하고 배포하는 과정이 수동으로 이루어졌습니다. 이로 인해 배포 과정에서 실수가 발생할 가능성이 있었으며, 특히 로컬 빌드 환경과 서버 환경의 차이, 혹은 이전 빌드 캐시로 인한 잠재적인 버그 발생 위험이 있었습니다.

GitHub Actions를 도입하여 `main` 브랜치에 코드가 푸시될 때마다 자동으로 테스트, 빌드, 배포가 이루어지는 CI/CD 파이프라인을 구축하기로 결정했습니다. 또한, `npm run build:clean` 명령어를 사용하여 매 배포 시 깨끗한 환경에서 빌드를 수행하도록 설정합니다.

이를 통해 배포 프로세스의 신뢰성을 높이고, 개발자는 비즈니스 로직 구현에 더 집중할 수 있게 되며, 캐시 문제로 인한 런타임 오류를 사전에 방지할 수 있습니다.

## 주요 변경 사항
- 신규: GitHub Actions 워크플로우 정의 (`.github/workflows/deploy.yml`)
  - `main` 브랜치 푸시 시 자동 실행
  - Node.js 환경 설정 및 의존성 설치
  - SSH를 통한 원격 서버 배포 (코드 Pull -> 의존성 설치 -> Clean Build -> PM2 재시작)

실행 순서:
1. GitHub Repository의 Settings > Secrets and variables > Actions에 `HOST`, `USERNAME`, `KEY` (SSH Private Key)를 등록합니다.
2. `.github/workflows/deploy.yml` 파일이 포함된 코드를 `main` 브랜치에 푸시합니다.
3. GitHub Actions 탭에서 워크플로우가 성공적으로 실행되는지 확인합니다.

## 개발 결과
CI/CD 파이프라인 구축이 완료되었습니다. `.github/workflows/deploy.yml` 파일이 생성되었으며, 이제 `main` 브랜치에 코드가 푸시될 때마다 자동으로 배포가 진행됩니다.

**주의사항**:
- GitHub Repository Secrets (`HOST`, `USERNAME`, `KEY`) 설정이 반드시 완료되어야 배포가 성공합니다.
