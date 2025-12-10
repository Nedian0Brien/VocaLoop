# perf: 클라이언트 빌드 최적화 및 Code Splitting

## 🎯 목적
현재 클라이언트 빌드 시 번들 파일의 용량이 커서 경고(`Some chunks are larger than 500 kB`)가 발생하고 있습니다. 이는 초기 로딩 속도를 저하시킬 수 있으므로, Code Splitting 및 번들 최적화를 통해 빌드 아티팩트의 크기를 줄이고 로딩 성능을 개선합니다.

## 📝 세부 작업 내용

### 1. 번들 분석 도구 설정
- **`rollup-plugin-visualizer` 설치**: 현재 번들에서 어떤 패키지가 가장 많은 용량을 차지하는지 시각적으로 분석합니다.
- **분석 리포트 생성**: 최적화 전/후의 번들 사이즈를 비교할 수 있는 근거 자료를 마련합니다.

### 2. Code Splitting 적용
- **Route 기반 Splitting**: `React.lazy`와 `Suspense`를 사용하여 페이지 단위로 컴포넌트를 비동기 로딩합니다.
  - 예: `Profile`, `WordList` 등 초기 진입 시 필요 없는 페이지는 분리.
- **Library Splitting (`manualChunks`)**: `vite.config.js` 설정을 통해 무거운 라이브러리(`firebase`, `react-dom` 등)를 별도 청크로 분리하여 캐싱 효율을 높입니다.

### 3. Vite 설정 최적화
- **Tree Shaking 점검**: 불필요한 모듈이 포함되지 않았는지 확인합니다.
- **Chunk Size Limit 조정**: 적절한 청크 사이즈 경고 기준을 설정합니다.

## ✅ 완료 조건
- [ ] `vite build` 시 500kB 이상 청크 경고가 해소되거나, 합리적인 수준으로 관리됨.
- [ ] `routes`에 `React.lazy`가 적용되어 라우팅 시 필요한 파일만 로드됨.
- [ ] 초기 로딩 시 다운로드 받는 JS 파일의 총량이 감소하거나 분산됨.

## ⚠️ 유의사항
- Code Splitting 적용 시 유저가 페이지 이동할 때 로딩 지연이 발생할 수 있으므로, 적절한 `Loading Spinner` 등을 `Suspense`의 `fallback`으로 제공해야 합니다.
