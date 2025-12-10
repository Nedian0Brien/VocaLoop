# CI/CD 배포 실패 및 502 에러 해결

## 1. 개요
- **이슈 제목**: GitHub Actions 배포 후 서버 502 에러 및 모듈 로딩 실패
- **발생일**: 2025-12-10
- **상태**: ✅ 해결됨 (Resolved)

## 2. 증상
- GitHub Actions 배포 워크플로우는 성공했으나, 실제 사이트 접속 시 `502 Bad Gateway` 에러 발생.
- PM2 로그 확인 시 `Error: Cannot find package 'express'` 에러가 반복적으로 출력되며 서버 프로세스가 재시작을 반복함.
- 수동 복구 시도 중, 서버 프로세스는 정상 실행되었으나 브라우저에서 `404 Not Found` (빈 화면) 발생.

## 3. 원인
1. **의존성 설치 문제**: `npm ci` 또는 `npm install` 실행 과정에서 로컬 환경과 원격 서버 환경의 차이, 혹은 `package-lock.json` 불일치 등으로 인해 `node_modules`가 손상되거나 `express` 패키지가 누락됨.
2. **PM2 환경 변수 및 캐시**: 기존 프로세스가 유지된 상태에서 `restart`만 수행할 경우, 변경된 환경 변수나 의존성 경로를 제대로 인식하지 못하는 경우가 있음.
3. **빌드 단계 누락**: 수동 복구(`node_modules` 재설치) 후, 프로덕션 빌드(`npm run build`)를 실행하지 않아 `dist` 폴더가 없는 상태에서 서버가 실행됨.

## 4. 해결 방법
1. **의존성 클린 설치 (Clean Install)**:
   - 기존 `node_modules`와 `package-lock.json`을 완전히 삭제 후 재설치.
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. **PM2 프로세스 초기화**:
   - 단순히 `restart` 하는 대신 프로세스를 완전히 삭제 후 다시 시작.
   ```bash
   pm2 delete voca-loop
   pm2 start ecosystem.config.cjs
   ```
3. **CI/CD 스크립트 강화**:
   - `.github/workflows/deploy.yml` 파일에서 단순히 `npm ci`를 사용하는 대신, `rm -rf node_modules`를 포함하여 강제 재설치를 수행하도록 수정.

## 5. 예방책
- **배포 스크립트 견고화**: CI/CD 파이프라인에서 의존성 설치 실패 가능성을 염두에 두고, 필요 시 `clean install` 옵션을 사용하거나 캐시 전략을 신중하게 적용.
- **배포 후 검증 절차**: 배포 직후 `curl`이나 헬스 체크 API를 통해 서버가 정상 응답(200 OK)하는지 확인하는 단계를 추가.
- **수동 작업 매뉴얼**: 긴급 복구 시 '의존성 설치 -> 빌드 -> 서버 시작'의 필수 단계를 누락하지 않도록 주의.

## 6. 관련 파일
- `.github/workflows/deploy.yml`
- `ecosystem.config.cjs`
- `package.json`
