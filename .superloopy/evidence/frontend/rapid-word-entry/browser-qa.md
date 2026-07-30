# Rapid Word Entry Browser QA

## 환경

- 앱: worktree의 최신 `dist/`를 FastAPI가 서빙
- 데이터: `/tmp/vocaloop-rapid-qa.*` 임시 SQLite
- 인증: 임시 QA 계정
- AI 경계: `/api/ai/codex` 응답을 5초 지연하고 실제 `{ "text": "<JSON>" }` 계약으로 반환
- 저장: 실제 로컬 `/api/words`

## 검증

- `limerence` 제출 직후 입력창이 비워지고 focus가 유지됐다.
- 첫 AI 응답 전에 `susurrus`를 제출할 수 있었다.
- `limerence`는 `단어 생성 중...`, `susurrus`는 `생성 대기 중`으로 표시됐다.
- 두 AI 응답 뒤 두 단어 모두 실제 로컬 words API를 거쳐 화면에 저장됐다.
- 390px: `scrollWidth=390`, `clientWidth=390`
- 768px: `scrollWidth=768`, `clientWidth=768`
- 1280px: `scrollWidth=1280`, `clientWidth=1280`
- 세 viewport 모두 active element는 `새 영어 단어 입력`이었다.
- page error는 없었다.

## 증거

- `390.png`
- `768.png`
- `1280.png`
- `browser-results.json`
- `run-browser-qa.cjs`
