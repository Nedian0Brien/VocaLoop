---
title: VocaLoop AI — 파일에서 단어장 가져오기
slug: ai-file-import
stage: plan
status: accepted     # draft | accepted | rejected
intent: .intent/intent_ai-file-import.md
spec: .intent/spec_ai-file-import.md
date: 2026-09-17
---

# VocaLoop AI — 파일에서 단어장 가져오기 — 구현 계획

## 바뀌는 파일

| 파일 | 무엇을 |
|---|---|
| `backend/requirements.txt` | `pypdf`, `openpyxl` 추가 |
| `backend/app/codex_cli.py` (신규) | `run_codex_exec`, `CodexError` — 세 호출자가 공유하는 subprocess 블록 |
| `backend/app/routes/ai.py` | subprocess 블록을 `run_codex_exec`로 교체 |
| `backend/app/routes/vocabulary_imports.py` | 같은 교체 (`--image` 경로 전달) |
| `backend/app/file_vocabulary.py` (신규) | 업로드 검증·저장, PDF/CSV/XLSX 텍스트 추출, 분할, Codex 프롬프트·파싱, 정규화 |
| `backend/app/models.py` | `AiConversation`, `AiMessage` |
| `backend/app/schemas/ai.py`, `schemas/__init__.py` | 대화·메시지 스키마 |
| `backend/app/routes/ai_conversations.py` (신규), `routes/__init__.py` | 대화 CRUD, 메시지 전송(백그라운드 추출), 배치 결과 PATCH, `fail_stale_pending_imports` |
| `backend/app/main.py` | 라우터 등록, lifespan에서 stale pending 정리 |
| `backend/tests/test_codex_cli.py`, `test_file_vocabulary.py`, `test_ai_conversations.py` (신규) | 헬퍼·파서·API 테스트 |
| `src/components/Header.jsx`, `Header.test.jsx` | Settings → AI 탭 |
| `src/App.jsx`, `App.test.jsx` | `/ai` 라우트, `AiAssistantView` 연결 |
| `src/services/aiAssistantApi.js` (신규) | API 래퍼 |
| `src/services/bulkWordAddService.js`, `.test.js` | `{word, meaning_ko}` 큐 항목, 뜻 덮어쓰기 |
| `src/services/geminiService.js` | `glosses` 힌트 |
| `src/hooks/useVocabularyCommands.js` | `handleBulkAddWords` 반환값을 결과 객체로 |
| `src/hooks/useAiAssistant.js`, `.test.js` (신규) | 대화·메시지·폴링·배치 저장 상태 |
| `src/components/ai/AiAssistantView.jsx`, `AiConversationList.jsx`, `AiMessageThread.jsx`, `AiComposer.jsx`, `AiFileImportCard.jsx` (신규) + `AiFileImportCard.test.jsx`, `AiConversationList.test.jsx` | 화면 — agent-chat-framework thread/threadlist 구조 |
| `src/components/Icons.jsx` | Paperclip·Send·MessageSquare·ArrowUp·ArrowDown·PanelLeft·MoreHorizontal·Copy |
| `README.md`, `AGENTS.md` | AI 탭과 새 API·의존성 한 줄씩 |

구현 중 이 표에서 벗어나면 같은 커밋에서 이 파일을 고친다.

## 작업 순서

1. **Codex 헬퍼 추출** — `codex_cli.py` 만들고 `ai.py`·`vocabulary_imports.py`가 쓰게 바꾼다. 확인: 기존 `test_ai.py`, `test_vocabulary_imports.py` 통과. 커밋 `refactor:`.
2. **파일 추출 모듈** — `file_vocabulary.py`와 단위 테스트(CSV utf-8/cp949, XLSX 시트 2개, 텍스트 PDF, 빈 PDF, 분할 경계, Codex JSON 정규화·중복·2,000개 상한). 확인: `pytest backend/tests/test_file_vocabulary.py`. 커밋 `feat:`.
3. **대화 모델·API** — 모델, 스키마, 라우트, stale 정리, API 테스트(권한 분리, CRUD, 파일 없는 메시지 고정 답, 파일 메시지 pending→ready with fake Codex, failed 경로, 배치 PATCH→done, 확장자·크기 거절). 확인: `pytest backend/tests -q`. 커밋 `feat:`.
4. **bulk add 확장** — `bulkWordAddService`·`geminiService`·`useVocabularyCommands`. 확인: `bulkWordAddService.test.js`에 뜻 보존·덮어쓰기 케이스 추가 후 통과. 커밋 `feat:`.
5. **네비게이션** — `Header`와 `Header.test.jsx`만. `App` 라우트는 화면이 생기는 6단계 커밋에 넣는다 — 이 커밋 시점에 `ai` 뷰가 빈 화면으로 남지 않게. 확인: `Header.test.jsx` 통과. 커밋 `feat:`.
6. **AI 화면** — `App` 라우트(`/ai`)와 `App.test.jsx` 포함. `design-ops` 프로필로 측정값을 잡고 API 래퍼 → 훅 → 컴포넌트 순서. 훅 테스트(폴링 시작·중지, 배치 인덱스 계산, 취소가 남은 배치 전부 기록)와 카드 테스트(행 편집·삭제, 폴더 기본값, 저장 호출 인자). 확인: `npx vitest run src/components/ai src/hooks/useAiAssistant.test.js`, `npm run build`. 커밋 `feat:`.
6-1. **채팅 화면 재구성** — 첫 구현은 카드 안에 카드가 들어간 모양이었다. 사용자 요청으로 agent-chat-framework 의 thread.aui / thread-list.aui 구조(전체 높이, 접히는 사이드바, 44rem 가운데 스레드, 평문 어시스턴트, 둥근 컴포저)로 다시 짰다. `App.jsx` 는 AI 뷰를 `main` 여백 밖에 붙인다. 확인: 같은 테스트 + 브라우저(1280·390). 커밋 `feat:`.
7. **로컬 통합 확인** — `npm run build` → `npm run start` → 브라우저에서 CSV/XLSX/PDF 각 1회, 250개 CSV로 두 번째 카드, 새로고침 유지, 스캔 PDF 실패 문구. 로컬 Codex CLI(`codex-cli 0.154`)를 실제로 쓴다.
8. **문서·푸시** — README/AGENTS 갱신, PR 생성.

## 가장 위험한 단계

3단계의 백그라운드 추출. 위험: (a) 세션을 요청 스코프 것과 섞어 `DetachedInstanceError`, (b) 테스트에서 백그라운드가 안 돌아 `pending`이 안 바뀜, (c) 프로세스 재시작으로 영원한 `pending`. 대응: 백그라운드 함수는 메시지 id만 받고 자체 세션을 연다; `TestClient`는 응답 후 백그라운드를 동기 실행하므로 테스트에서 바로 `ready`를 확인한다; 시작 시 stale 정리. 되돌리기: 라우터 등록 한 줄과 새 파일이라 `git revert`로 깨끗이 돌아간다. 새 테이블은 기존 데이터에 손대지 않는다.

1단계 리팩터도 기존 두 라우트를 건드린다. 기존 테스트가 monkeypatch하는 `subprocess.run` 키워드 인자를 바꾸지 않는다.

## 검증

```
backend/.venv/bin/python -m pytest backend/tests -q
npm run build
npx vitest run src/components/Header.test.jsx src/App.test.jsx src/services/bulkWordAddService.test.js src/components/ai src/hooks/useAiAssistant.test.js
npx vitest run   # 기준선 35 failed / 179 passed 대비 실패 수가 늘지 않는다
```

UI 확인 경로: 로그인 → 상단 `AI` → 왼쪽 `새 대화` → 하단 첨부 버튼으로 `words.csv` → "단어 읽는 중" → 카드 → 폴더명 확인 → `저장` → 진행 표시 → 요약 카드 → 상단 `Dashboard`에서 새 폴더 확인. 모바일 폭(390px)에서 하단 네비 4칸에 `AI`가 있고 대화 목록이 드로어로 열리는지 본다.
