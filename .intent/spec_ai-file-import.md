---
title: VocaLoop AI — 파일에서 단어장 가져오기
slug: ai-file-import
stage: spec
status: accepted     # draft | accepted | rejected
intent: .intent/intent_ai-file-import.md
date: 2026-09-17
---

# VocaLoop AI — 파일에서 단어장 가져오기 — 명세

## 요구사항

네비게이션
- [ ] 데스크톱·모바일 네비의 네 번째 항목이 `AI`(`/ai`, Sparkles 아이콘)다. `Settings` 항목은 없다.
- [ ] 헤더 계정 아이콘을 누르면 `/settings`로 간다 (지금도 그렇다). `/settings` 직접 진입도 계속 된다.

대화
- [ ] `GET /api/ai/conversations`는 내 대화를 `updated_at` 내림차순으로 준다. 다른 사용자 대화는 404.
- [ ] `POST /api/ai/conversations` → 빈 대화 생성. `PATCH …/{id}` → 제목 변경. `DELETE …/{id}` → 대화와 메시지 삭제(204).
- [ ] `POST …/{id}/messages`(multipart: `content` 선택, `file` 선택, 둘 중 하나는 필수)는 사용자 메시지와 어시스턴트 메시지를 만들어 둘 다 돌려준다. 대화 제목이 비어 있으면 파일명 또는 메시지 앞 40자로 채운다.
- [ ] 파일 없는 메시지의 어시스턴트 답은 `kind=text`, 지금 할 수 있는 일(파일 첨부)을 안내하는 고정 문구다. Codex를 부르지 않는다.
- [ ] 파일이 있으면 어시스턴트 메시지는 `kind=file_import`, `status=pending`으로 만들고 응답을 먼저 보낸 뒤 백그라운드에서 추출한다. 추출이 끝나면 `status=ready`와 `payload.entries`, 실패하면 `status=failed`와 `payload.error`.
- [ ] 서버가 시작될 때 `pending`으로 남은 메시지는 `failed`("서버가 다시 시작되어 중단되었습니다. 파일을 다시 첨부해 주세요.")로 바꾼다.
- [ ] `PATCH …/{id}/messages/{mid}`는 `file_import` 메시지의 배치 결과(`{batch_index, status: saved|cancelled, folder_id, folder_name, summary}`)를 `payload.results`에 덧붙인다. 마지막 배치가 끝나면 메시지 `status=done`.

파일 추출
- [ ] 받는 확장자·MIME: `.pdf`, `.csv`, `.xlsx`. 그 밖은 422 "PDF, CSV, XLSX 파일만 올릴 수 있습니다." `.xls`는 422 "xlsx로 저장해서 올려 주세요."
- [ ] 100MB 초과는 413.
- [ ] PDF는 `pypdf`로 페이지 텍스트를 잇는다. 암호 걸린 PDF, 텍스트가 200자 미만인 PDF는 실패 메시지("텍스트가 없는 PDF입니다. 스크린샷으로 '이미지에서 추가'를 써 주세요.").
- [ ] CSV는 `csv` 모듈(인코딩 utf-8-sig → cp949 순서로 시도), XLSX는 `openpyxl` read-only로 모든 시트의 행을 탭 구분 텍스트로 만든다.
- [ ] 텍스트를 줄 경계에서 30,000자 단위로 나눠 Codex에 순서대로 보내고 결과를 합친다. 총 2,000개에서 자른다. 중복은 대소문자 무시로 제거.
- [ ] Codex는 `{"entries":[{"word":"abate","meaning_ko":"줄이다"|null}],"suggested_folder_name":"…","target_folder_name":"기존 폴더명"|null}`을 돌려준다. 프롬프트에 사용자 메시지와 기존 폴더명 목록을 넣어 "TOEFL 폴더에 넣어줘"를 `target_folder_name`으로 받는다. 서버가 이름→`target_folder_id`로 바꾼다.
- [ ] `entries`가 비면 `failed` "파일에서 영어 단어를 찾지 못했습니다."
- [ ] 추출 중·후에 단어·폴더 테이블에는 아무것도 쓰지 않는다.

카드와 저장
- [ ] `ready` 메시지는 200개 단위 배치 카드로 보인다. 첫 카드 제목 "N개 단어를 찾았습니다", 두 번째부터 "나머지 M개 중 다음 200개". 각 행은 단어(수정 가능)·뜻(수정 가능)·삭제.
- [ ] 폴더 선택: 기본 `새 폴더`(이름은 `suggested_folder_name`). `target_folder_id`가 있고 그 폴더가 아직 있으면 그 폴더가 선택된 채 시작. 셀렉트로 기존 폴더/새 폴더를 바꿀 수 있다.
- [ ] 저장을 누르면 새 폴더면 `handleCreateFolder`로 만들고, `handleBulkAddWords`에 `{word, meaning_ko}` 목록을 넘긴다. 파일 뜻이 있으면 AI 결과의 `meaning_ko`를 덮어쓴다. 없으면 AI 값. 뜻 힌트는 분석 프롬프트에도 넣어 뜻갈래를 맞춘다.
- [ ] 진행 중에는 카드 안에 `bulkAddProgress`(분석 중 n/N, 저장 중)가 보이고 카드 조작·닫기·대화 전환이 막힌다.
- [ ] 끝나면 카드가 결과 요약(저장·폴더 추가·중복·실패 개수, 실패 단어 목록)으로 바뀌고 PATCH로 기록된다. 다음 배치가 있으면 다음 카드가 바로 나온다.
- [ ] 취소는 남은 배치 전부를 `cancelled`로 기록한다.
- [ ] 새로고침 후 같은 대화를 열면 완료된 카드는 요약으로, 진행 안 한 배치는 카드로, `pending`은 "단어 읽는 중"으로 보인다. 폴링은 `pending` 메시지가 있을 때만 2초 간격.

빈 화면
- [ ] 대화가 없거나 메시지가 없을 때 "PDF·CSV·XLSX 단어장 파일을 첨부하면 단어를 뽑아 폴더로 만들어 드립니다. 단어 검색·학습 조언·시험지는 준비 중입니다." 안내와 첨부 버튼이 보인다.

## 설계

백엔드
- `backend/app/models.py`에 `AiConversation(id, user_id, title, created_at, updated_at)`, `AiMessage(id, conversation_id, user_id, role, kind, content, payload JSON, status, created_at, updated_at)` 추가. `create_all`이 새 테이블을 만들므로 마이그레이션 코드는 없다.
- `backend/app/codex_cli.py`(신규): `run_codex_exec(prompt, *, image_path=None, timeout=None) -> str`. `routes/ai.py`와 `routes/vocabulary_imports.py`의 중복 subprocess 블록을 여기로 옮기고 둘 다 이걸 쓴다. 실패는 `CodexError(status_code, detail)`; 라우트가 HTTPException으로 바꾼다. `subprocess.run`은 지금 테스트가 monkeypatch하는 키워드(`args, input, text, capture_output, timeout, check, cwd, env`)를 그대로 쓴다.
- `backend/app/file_vocabulary.py`(신규): 파일 저장·검증(`save_validated_document_upload`), 텍스트 추출(`extract_document_text`), 분할(`split_text`), Codex 프롬프트와 파싱(`extract_entries`). 순수 함수 위주로 두어 Codex 없이 테스트한다.
- `backend/app/routes/ai_conversations.py`(신규): 위 엔드포인트. 추출은 `BackgroundTasks`에 동기 함수로 넣는다(Starlette가 스레드풀에서 돌리므로 이벤트 루프를 막지 않는다). 백그라운드 함수는 자체 `SessionLocal()`을 연다.
- `backend/app/schemas/ai.py`에 `AiConversationRead/Create/Update`, `AiMessageRead`, `AiMessageBatchResult` 추가.
- `main.py` lifespan에서 `bootstrap_db()` 뒤 `fail_stale_pending_imports()` 호출.
- `backend/requirements.txt`에 `pypdf>=5,<7`, `openpyxl>=3.1,<4` 추가.

프론트엔드
- `Header.jsx` NAV_LINKS: `settings` → `{ view: 'ai', href: '/ai', label: 'AI', Icon: Sparkles }`.
- `App.jsx`: `PATH_TO_VIEW`/`VIEW_TO_PATH`에 `/ai`, lazy `AiAssistantView`에 `folders, words, onCreateFolder, onBulkAddWords, bulkAddProgress, isBulkAdding, showNotification` 전달.
- `src/services/aiAssistantApi.js`(신규): 엔드포인트 래퍼. `apiRequest` 사용.
- `src/hooks/useAiAssistant.js`(신규): 대화 목록·선택·메시지·폴링·전송·배치 저장 오케스트레이션. 배치 저장은 `onCreateFolder` → `onBulkAddWords` → PATCH 순서.
- `src/components/ai/AiAssistantView.jsx`, `AiConversationList.jsx`, `AiMessageThread.jsx`, `AiComposer.jsx`, `AiFileImportCard.jsx`(신규). 디자인 토큰과 `Button/Card/Input` 프리미티브를 쓴다. 측정값은 `design-ops` 프로필에서 가져온다.
- `bulkWordAddService.js`: 큐 항목을 문자열 또는 `{word, meaning_ko}`로 받는다. `normalizeBulkWordQueue`가 뜻을 보존하고 `buildBulkWordPayload`가 파일 뜻으로 덮어쓴다. `generateBulkWordData/generateWordData`에 `glosses` 힌트 옵션.
- `useVocabularyCommands.handleBulkAddWords`가 `{createdWords, assignedWords, skippedWords, failedWords, processedWords}`를 돌려준다 (지금 호출자는 반환값을 쓰지 않는다).

## 버린 대안

- 동기 추출(스크린샷 라우트처럼 요청 안에서 Codex 완료까지 대기): 100MB PDF는 Codex 호출이 여러 번이라 nginx/브라우저 타임아웃에 걸린다. 새로고침하면 결과도 사라진다.
- 텍스트 메시지를 Codex에 그대로 넘겨 자유 대화: 도구가 없는 상태에서 할 수 없는 일을 약속한다. 다음 단계에서 기능이 붙을 때 에이전트 루프로 바꾼다.
- 저장까지 서버에서 처리: 사용자별 AI provider(Gemini/OpenAI/Claude 직접 호출) 설정을 서버가 모른다. 기존 클라이언트 파이프라인을 유지한다.
- 스캔 PDF를 페이지 이미지로 렌더해 `--image`로 보내기: poppler 의존성과 페이지당 Codex 호출. 범위 밖.

## 함정

- `BackgroundTasks`는 프로세스가 죽으면 사라진다 → 시작 시 `pending`을 `failed`로 정리한다.
- 테스트 conftest는 `app.*` 모듈을 매번 다시 import한다. 백그라운드 함수 안에서 `from .database import SessionLocal`을 지연 import 하지 말고 모듈 상단에서 가져오되, 테스트는 `TestClient`가 백그라운드 태스크를 응답 뒤에 동기로 실행한다는 점을 이용한다.
- Codex `--sandbox read-only --cd <tmpdir>`: 프롬프트가 stdin이므로 파일 텍스트를 tmpdir에 둘 필요는 없다. 프롬프트에 `Do not inspect local files`를 넣는다(기존 `_build_codex_prompt`와 같다).
- CSV 인코딩: 한국어 엑셀 CSV는 cp949가 흔하다. utf-8-sig가 실패하면 cp949로 다시 읽는다.
- `openpyxl`은 `.xls`(BIFF)를 못 읽는다. 시그니처(`PK\x03\x04`)로 xlsx를 확인하고 아니면 422.
- 폴더 이름 매칭은 대소문자·앞뒤 공백을 무시한다. Codex가 목록에 없는 이름을 돌려주면 무시하고 `suggested_folder_name`만 쓴다.
- `Header.test.jsx`가 `['Dashboard','Study','Review','Settings']`를 기대한다. `AI`로 고친다. 프론트 테스트 기준선은 main에서 이미 35건 실패(jsdom 환경 미설정)다. 회귀는 기준선 대비로 본다.
- 운영 nginx `client_max_body_size`·`proxy_read_timeout`은 저장소에서 확인할 수 없다. 배포 후 100MB 업로드를 실제로 한 번 해 본다.

## 완료 기준

```
backend/.venv/bin/python -m pytest backend/tests -q        # 신규 테스트 포함 통과 (static_serving 3건은 dist 없을 때만 실패)
npm run build                                               # 성공
npx vitest run src/components/Header.test.jsx src/services/bulkWordAddService.test.js src/components/ai src/hooks/useAiAssistant.test.js
```

수동: 로컬 백엔드(`npm run start`)에 로그인 → AI 탭 → CSV(단어,뜻) 첨부 → 카드에서 폴더명 확인 → 저장 → 단어장 탭에 새 폴더와 단어(파일 뜻)가 있다. 250개짜리 CSV로 두 번째 카드가 이어지는 것, 새로고침 뒤 카드 상태가 남는 것, 텍스트 없는 PDF의 실패 문구를 확인한다.
