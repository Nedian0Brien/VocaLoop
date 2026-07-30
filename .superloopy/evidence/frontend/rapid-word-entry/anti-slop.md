# Rapid Word Entry Anti-Slop Pre-flight

## 기준

- 기준 UI: `src/components/VocabularyDashboard.jsx`의 기존 단어 생성 로딩 카드
- 색상·형태·그림자: `src/design-system/tokens.js`, `src/index.css`
- 변경 범위: 기존 로딩 카드가 처리 중인 단어와 대기 중인 단어를 각각 표시하도록 확장

## 확인 결과

- 새 visual direction, 카드 shell, 색상, radius, shadow, icon dependency를 추가하지 않았다.
- 기존 brand/surface 토큰과 `Loader2` 아이콘을 그대로 사용했다.
- 처리 중인 단어와 대기 중인 단어를 실제 client queue 상태에서 읽어 표시한다.
- placeholder, 가짜 진행률, 성공으로 위장한 실패 상태를 추가하지 않았다.
- 화면 문구는 `단어 생성 중...`, `생성 대기 중`, `앞 단어가 끝나면 시작합니다`로 짧게 유지했다.
- 390px, 768px, 1280px에서 root horizontal overflow가 없다.
- 처리·대기 카드의 단어는 blur 위 overlay에 선명하게 표시된다.
- 입력 focus와 자동완성은 queue 처리 중에도 유지된다.

## 로컬 환경 예외

`/_vercel/speed-insights/script.js`는 Vercel 배포 환경에서 제공되는 외부 script라 로컬 FastAPI QA에서만 404를 반환한다. 제품 queue 동작이나 배포 asset 실패가 아니며 `browser-results.json`에 그대로 기록했다.
