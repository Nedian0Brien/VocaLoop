# Rapid Word Entry Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일반 단어 입력을 즉시 대기열에 넣어 다음 단어를 계속 입력하게 하고, AI 분석과 저장은 등록 순서대로 하나씩 처리한다.

**Architecture:** 새 `useWordCreationQueue` hook이 대기열 ref, 화면용 state, single-flight worker, session generation을 소유한다. `useVocabularyCommands`는 입력 검증과 enqueue만 담당하고, `VocabularyDashboard`는 기존 카드 레이아웃 안에서 처리 중·대기 중 작업을 렌더링한다.

**Tech Stack:** React 19 hooks, Vitest 4, Testing Library, Vite 7, FastAPI/SQLite 기존 API

---

## Research Findings

### Finding 1: 단일 boolean이 입력 전체를 잠근다

- **File:** `src/hooks/useVocabularyCommands.js:36-38,59-90`
- **What:** `handleAddWord`가 `generateWordData`와 `createWord`를 모두 기다리는 동안 `isAnalyzing`을 `true`로 유지한다.
- **Why:** 입력 수락과 비동기 처리를 분리하고 boolean 대신 작업 목록을 관리해야 한다.

### Finding 2: 대시보드가 같은 boolean으로 입력과 보조 작업을 모두 막는다

- **File:** `src/components/VocabularyDashboard.jsx:228-315`
- **What:** 일반 입력, Generate, 이미지 가져오기, 여러 단어 추가가 `isAnalyzing`에 묶여 있다.
- **Why:** 일반 입력은 큐 처리 중에도 열고, bulk 작업과 일반 큐만 상호 배제해야 한다.

### Finding 3: 자동완성도 분석 중에는 멈춘다

- **File:** `src/App.jsx:195-231`
- **What:** `shouldShowWordSuggestions`와 자동완성 effect가 `isAnalyzing`을 차단 조건으로 사용한다.
- **Why:** 큐 처리 중 현재 입력값의 자동완성이 계속 작동하도록 이 결합을 제거해야 한다.

### Finding 4: 기존 카드 레이아웃에 로딩 카드 자리가 있다

- **File:** `src/components/VocabularyDashboard.jsx:85-147,149-205`
- **What:** `renderWordCards`가 단일 `loadingCard`를 모바일·2열·상태 그룹 레이아웃에 삽입한다.
- **Why:** 새 패널을 만들지 않고 이 자리를 작업별 상태 카드 배열로 확장할 수 있다.

### Finding 5: 저장 계약은 그대로 재사용할 수 있다

- **File:** `src/services/geminiService.js:47-68`, `src/services/wordApi.js:5-9`
- **What:** 단어 분석은 `(word, aiConfig)`, 저장은 기존 word payload를 받는다.
- **Why:** backend/API 변경 없이 작업마다 입력 시점의 `word`, `folderId`, `aiConfig`를 캡처하면 된다.

### Finding 6: bulk 작업은 현재 단어 목록 snapshot을 사용한다

- **File:** `src/hooks/useVocabularyCommands.js:114-167`, `src/services/bulkWordAddService.js:100-125`
- **What:** `runBulkWordAdd`가 시작 시점 `existingWords`로 중복과 폴더 배정을 계산한다.
- **Why:** 일반 큐와 bulk를 동시에 실행하면 stale 목록을 공유하므로 UI와 명령 계층에서 상호 배제한다.

### Finding 7: 디자인 변경은 기존 토큰 안에서 끝낼 수 있다

- **File:** `src/design-system/tokens.js:10-66,163-180`, `src/index.css:10-110`
- **What:** brand/surface/semantic 색상, radius, shadow 토큰이 이미 있다.
- **Why:** 새 색상·컴포넌트·라이브러리 없이 기존 로딩 카드의 상태와 문구만 바꾼다.

### FAR Check

- [x] 모든 finding이 실제 파일과 라인에 근거한다.
- [x] 추측 없이 현재 구현을 설명한다.
- [x] 모든 finding이 빠른 연속 입력과 직접 관련된다.

## File Map

- **Create:** `src/hooks/useWordCreationQueue.js` — queue ref, UI state, single worker, session generation, 성공·실패 알림
- **Create:** `src/hooks/useWordCreationQueue.test.jsx` — 순차 실행, 경계 enqueue, 실패 지속, 설정 snapshot, session 변경
- **Modify:** `src/hooks/useVocabularyCommands.js` — 단건 await 흐름을 enqueue로 교체하고 bulk 상호배제
- **Modify:** `src/components/VocabularyDashboard.jsx` — 입력 잠금 조건 분리, focus 복원, 작업별 상태 카드
- **Modify:** `src/App.jsx` — pending jobs 전달, 큐 처리 중 자동완성 허용
- **Modify:** `src/App.test.jsx` — 연속 입력과 화면 상태의 통합 계약

## Task 1: 순차 단어 생성 queue hook

**Files:**

- Create: `src/hooks/useWordCreationQueue.test.jsx`
- Create: `src/hooks/useWordCreationQueue.js`

- [ ] **Step 1: 단일 작업과 StrictMode 중복 방지 테스트 작성**

```jsx
const first = deferred();
generateWordData.mockReturnValueOnce(first.promise);

const { result } = renderHook(() => useWordCreationQueue(props), {
  wrapper: StrictMode,
});
act(() => {
  result.current.enqueue({ word: 'abate', folderId: 1, aiConfig: configA });
});

expect(generateWordData).toHaveBeenCalledTimes(1);
await act(() => first.resolve({ word: 'abate' }));
await waitFor(() => expect(createWord).toHaveBeenCalledTimes(1));
```

- [ ] **Step 2: focused test를 실행해 RED 확인**

Run: `rtk npm test -- src/hooks/useWordCreationQueue.test.jsx`

Expected: FAIL because `useWordCreationQueue.js` does not exist.

- [ ] **Step 3: 최소 queue hook 구현**

```js
export function useWordCreationQueue({ onWordSaved, showNotification, userId }) {
  const [jobs, setJobs] = useState([]);
  const queueRef = useRef([]);
  const workerActiveRef = useRef(false);
  const sessionGenerationRef = useRef(0);

  const enqueue = useCallback(({ word, folderId, aiConfig, folderName }) => {
    const job = {
      id: nextIdRef.current++,
      word,
      folderId,
      folderName,
      aiConfig: { ...aiConfig },
      sessionGeneration: sessionGenerationRef.current,
      status: 'queued',
    };
    queueRef.current.push(job);
    syncJobs();
    startWorker();
    return job;
  }, [startWorker]);

  return { enqueue, isBusy: jobs.length > 0, jobs };
}
```

최소 worker는 `workerActiveRef`를 먼저 잠그고 첫 작업 하나만 처리한다. AI 완료 후와 저장 완료 후 session generation을 확인하고 작업이 끝나면 active ref를 해제한다. 이 단계에서는 다음 작업 재시작과 failure continuation을 아직 구현하지 않는다.

- [ ] **Step 4: 순차 실행 테스트 GREEN 확인**

Run: `rtk npm test -- src/hooks/useWordCreationQueue.test.jsx`

Expected: PASS.

- [ ] **Step 5: 빠른 연속 enqueue, 실패 지속, worker handoff 테스트 작성**

테스트 계약:

- 첫 분석이 pending인 동안 두 번째 작업을 enqueue해도 첫 작업 뒤에 처리한다.
- 첫 분석이 reject되어도 두 번째 작업을 처리하고, 오류 알림에는 실패한 첫 단어가 포함된다.
- 첫 `createWord`가 reject되어도 두 번째 작업을 처리하고, 저장 실패 알림에는 실패한 첫 단어가 포함된다.
- 마지막 작업의 `createWord`가 resolve되는 같은 `act` 경계에서 enqueue한 작업도 새 worker가 처리한다.

- [ ] **Step 6: 새 테스트를 실행해 RED 확인**

Run: `rtk npm test -- src/hooks/useWordCreationQueue.test.jsx`

Expected: 두 번째 작업이 queue에 남아 처리되지 않아 rapid enqueue 또는 handoff 테스트 FAIL.

- [ ] **Step 7: worker handoff와 오류 격리 구현**

```js
const startWorker = useCallback(() => {
  if (workerActiveRef.current) return;
  workerActiveRef.current = true;

  void (async () => {
    try {
      while (queueRef.current.length > 0) {
        const job = queueRef.current[0];
        await processJob(job);
        if (queueRef.current[0]?.id === job.id) queueRef.current.shift();
        syncJobs();
      }
    } finally {
      workerActiveRef.current = false;
      if (queueRef.current.length > 0) startWorker();
    }
  })();
}, [processJob, syncJobs]);
```

작업 오류는 `processJob` 내부에서 알림 후 종료하고 worker loop 밖으로 던지지 않는다.

- [ ] **Step 8: worker 경계 테스트 GREEN 확인**

Run: `rtk npm test -- src/hooks/useWordCreationQueue.test.jsx`

Expected: rapid enqueue/failure/lost-wakeup 테스트 PASS이고 AI 분석 실패와 저장 실패 알림이 각각 해당 word를 포함한다.

- [ ] **Step 9: config snapshot과 session 전환 테스트 작성**

테스트 계약:

- 작업마다 enqueue 시점 `aiConfig` 복사본을 `generateWordData`에 전달한다.
- AI 분석 중 `userId`가 바뀌면 queue를 비우고 이전 작업은 `createWord`를 호출하지 않는다.
- 저장 요청 뒤 `userId`가 바뀌면 이전 응답으로 `onWordSaved`나 알림을 호출하지 않는다.
- 이전 worker가 active인 동안 새 사용자가 enqueue해도 새 작업은 최신 `onWordSaved`와 `showNotification` callback으로 처리한다.

- [ ] **Step 10: session 테스트 RED 확인**

Run: `rtk npm test -- src/hooks/useWordCreationQueue.test.jsx`

Expected: session clear 또는 stale callback 테스트 FAIL.

- [ ] **Step 11: generation과 latest callback ref 구현**

```js
const callbacksRef = useRef({ onWordSaved, showNotification });
callbacksRef.current = { onWordSaved, showNotification };

useLayoutEffect(() => {
  sessionGenerationRef.current += 1;
  queueRef.current = [];
  setJobs([]);
}, [userId]);
```

각 job에 현재 generation과 `aiConfig: { ...aiConfig }`를 저장한다. AI 완료 뒤와 저장 완료 뒤 job generation이 현재 값과 같은지 확인한다. stale job은 저장·callback·알림을 건너뛴다. 기존 worker가 active인 상태에서 새 session job이 들어오면 old job `finally`가 새 job을 제거하지 않고 같은 loop가 최신 `callbacksRef.current`로 처리한다.

- [ ] **Step 12: queue hook 전체 GREEN 확인**

Run: `rtk npm test -- src/hooks/useWordCreationQueue.test.jsx`

Expected: 모든 queue hook 테스트 PASS.

## Task 2: 일반 단어 명령을 queue에 연결

**Files:**

- Modify: `src/hooks/useVocabularyCommands.js:1-167,270-289`
- Test: `src/App.test.jsx`

- [ ] **Step 1: 연속 입력과 folder snapshot 통합 테스트 작성**

첫 번째 `generateWordData`를 deferred promise로 멈춘다. 첫 단어를 folder 1에서 제출하고, 입력값이 비고 입력이 enabled인지 확인한 뒤 folder 2로 바꿔 두 번째 단어를 제출한다. 첫 promise를 풀기 전에는 분석 호출이 1회인지, 이후 두 저장 payload의 `folder_id`가 각각 1과 2인지 확인한다.

- [ ] **Step 2: App focused test RED 확인**

Run: `rtk npm test -- src/App.test.jsx -t "queues rapid word entries"`

Expected: FAIL because the input remains disabled and the second word cannot be queued.

- [ ] **Step 3: `handleAddWord`를 enqueue 방식으로 교체**

```js
const handleAddWord = (event) => {
  event.preventDefault();
  const queuedWord = inputWord.trim();
  if (!queuedWord || !user || bulkAddActiveRef.current) return false;
  if (activeAiProviderNeedsKey) {
    showNotification(activeAiProviderAccessError, 'error');
    return false;
  }

  const folderId = getNullableFolderId(addToFolderId);
  enqueueWord({
    word: queuedWord,
    folderId,
    folderName: folders.find((folder) => folder.id === folderId)?.name || null,
    aiConfig: activeAiConfig,
  });
  setInputWord('');
  setIsWordSuggestOpen(false);
  return true;
};
```

`isAnalyzing`은 `pendingWordCreations.length > 0`에서 파생한다. `handleBulkAddWords`는 일반 queue가 남아 있으면 명시적 오류로 중단한다.

- [ ] **Step 4: App focused test GREEN 확인**

Run: `rtk npm test -- src/App.test.jsx -t "queues rapid word entries"`

Expected: PASS.

- [ ] **Step 5: 일반 queue와 bulk 동기 상호배제 테스트 작성**

테스트 계약:

- 일반 queue가 남아 있으면 image/bulk 버튼이 disabled다.
- `handleBulkAddWords` 호출 직후 progress callback 전에도 일반 입력이 disabled다.
- bulk가 끝나면 일반 입력이 다시 enabled다.
- 명령 계층에서 일반 queue 중 bulk 호출과 bulk 중 일반 enqueue가 각각 거부된다.

- [ ] **Step 6: bulk 상호배제 테스트 RED 확인**

Run: `rtk npm test -- src/App.test.jsx -t "locks bulk and rapid entry against each other"`

Expected: FAIL because `bulkAddProgress`가 설정되기 전 일반 입력이 잠기지 않는다.

- [ ] **Step 7: synchronous bulk lock 구현**

`useVocabularyCommands`에 `bulkAddActiveRef`와 `isBulkAdding` state를 추가한다. `handleBulkAddWords` 진입 시 queue ref를 검사한 뒤 ref/state를 즉시 잠그고, `finally`에서 해제한다. queue hook은 `hasPendingJobs()`를 제공해 stale React state 없이 guard한다.

- [ ] **Step 8: bulk 상호배제 테스트 GREEN 확인**

Run: `rtk npm test -- src/App.test.jsx -t "locks bulk and rapid entry against each other"`

Expected: PASS.

## Task 3: 기존 레이아웃 안에서 pending jobs 표시

**Files:**

- Modify: `src/components/VocabularyDashboard.jsx:18-205,228-355`
- Modify: `src/App.jsx:117-145,195-231,367-397`
- Test: `src/App.test.jsx`

- [ ] **Step 1: 처리 중·대기 중 상태와 focus 통합 테스트 작성**

두 작업을 enqueue한 뒤 `abate` 카드에 `단어 생성 중...`, `candid` 카드에 `생성 대기 중`이 보이는지 확인한다. 두 번째 제출 뒤 입력에 focus가 돌아오고, queue 처리 중 새 입력 자동완성이 열리는지도 확인한다.

- [ ] **Step 2: UI focused test RED 확인**

Run: `rtk npm test -- src/App.test.jsx -t "shows queued word status"`

Expected: FAIL because only one loading card exists and input stays disabled.

- [ ] **Step 3: 기존 카드 renderer를 pending job 배열로 확장**

```jsx
const renderPendingCard = (job) => {
  const isProcessing = job.status === 'processing';
  return (
    <div key={`pending-word-${job.id}`} className="w-full h-64 relative">
      <div className="w-full h-full rounded-xl bg-white shadow-[var(--shadow-soft)] border border-brand-200 overflow-hidden relative">
        <div className="p-6 flex flex-col items-center justify-center text-center h-full">
          <h3 className="text-3xl font-bold text-surface-400 font-serif">{job.word}</h3>
        </div>
        <div className="absolute inset-0 bg-white/50 flex flex-col items-center justify-center">
          <Loader2 className={isProcessing ? 'animate-spin' : ''} />
          <p>{isProcessing ? '단어 생성 중...' : '생성 대기 중'}</p>
        </div>
      </div>
    </div>
  );
};
```

`pendingCards = pendingWordCreations.map(renderPendingCard)`로 작업마다 고유 key를 만든다.

- 모바일: `pendingCards` 뒤에 기존 word card를 붙인다.
- 데스크톱 2열: pending card를 먼저 index 짝수/홀수로 좌우 열에 배치하고, 기존 word card는 pending 개수만큼 offset한 index로 이어 붙인다.
- `status-group`: 상단 `Creating New Word` 구역에서 `renderWordCards([], pendingWordCreations)`를 호출하고 각 학습 상태 그룹에는 pending 배열을 넘기지 않는다.
- 일반 정렬: `renderWordCards(filteredWords, pendingWordCreations)`를 호출한다.

기존 surface/brand/radius/shadow class를 유지한다. 새 패널, 카드 셸, 토큰, 아이콘 dependency는 추가하지 않는다.

- [ ] **Step 4: 입력·bulk·자동완성 조건 분리**

- 일반 input/Generate: `isBulkAdding`일 때 잠금
- 이미지/bulk 버튼: `isAnalyzing || isBulkAdding`일 때 잠금 유지
- 자동완성: `isAnalyzing` 조건 제거
- 제출 성공 시 `wordInputRef.current?.focus()` 호출

- [ ] **Step 5: UI focused test GREEN 확인**

Run: `rtk npm test -- src/App.test.jsx -t "shows queued word status"`

Expected: PASS.

## Task 4: 회귀·시각·배포 검증

**Files:**

- Create: `.superloopy/evidence/frontend/rapid-word-entry/anti-slop.md`
- Create: `.superloopy/evidence/frontend/rapid-word-entry/browser-qa.md`
- Create: `.superloopy/evidence/frontend/rapid-word-entry/390.png`
- Create: `.superloopy/evidence/frontend/rapid-word-entry/768.png`
- Create: `.superloopy/evidence/frontend/rapid-word-entry/1280.png`

- [ ] **Step 1: 전체 로컬 검증**

Run:

```bash
rtk npm test -- --run
rtk npm run build
rtk pytest backend/tests -q
rtk git diff --check
```

Expected: 모든 명령 exit 0.

- [ ] **Step 2: 브라우저 QA**

운영 DB 대신 `mktemp -d` 아래 임시 SQLite와 임시 auth secret으로 로컬 FastAPI를 port 3051에 띄운다.

```bash
qa_dir="$(mktemp -d /tmp/vocaloop-rapid-qa.XXXXXX)"
qa_db="$qa_dir/vocaloop.db"
qa_secret="$qa_dir/auth_secret"
DATABASE_URL="sqlite:///$qa_db" \
AUTH_SECRET_FILE="$qa_secret" \
UPLOADS_ROOT="$qa_dir/uploads" \
ENVIRONMENT=development \
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 3051 \
  >"$qa_dir/server.log" 2>&1 &
qa_pid=$!
curl -fsS http://127.0.0.1:3051/api/health
```

Expected: health JSON이 `status: healthy`를 반환하고 `qa_db`가 `/tmp/vocaloop-rapid-qa.*` 아래에만 생성된다.

로컬 QA 계정을 등록하고 서버의 실제 Codex provider를 사용한다. 첫 AI 응답을 기다리는 동안 두 번째 단어를 제출해 처리/대기 상태를 캡처한다.

390px, 768px, 1280px에서 입력 활성, focus, 처리/대기 카드, 가로 overflow 부재를 확인하고 screenshot과 QA 메모를 남긴다. QA가 끝나면 임시 서버를 종료하고 임시 디렉터리만 제거한다.

```bash
kill "$qa_pid"
wait "$qa_pid" || true
case "$qa_dir" in
  /tmp/vocaloop-rapid-qa.*) rm -rf -- "$qa_dir" ;;
  *) echo "Refusing unexpected QA cleanup path: $qa_dir" >&2; exit 1 ;;
esac
```

Expected: PID가 종료되고 검증된 `/tmp/vocaloop-rapid-qa.*` 디렉터리만 제거된다.

- [ ] **Step 3: anti-slop pre-flight 기록**

`src/design-system/tokens.js`, `src/index.css`, 기존 `VocabularyDashboard`를 기준 UI로 기록한다. 디자인 영향은 기존 로딩 카드가 작업별 상태를 표시하도록 확장되는 범위이며, 새 visual direction은 없다고 명시한다.

- [ ] **Step 4: 변경 파일 커밋**

```bash
rtk git add src/hooks/useWordCreationQueue.js src/hooks/useWordCreationQueue.test.jsx \
  src/hooks/useVocabularyCommands.js src/components/VocabularyDashboard.jsx \
  src/App.jsx src/App.test.jsx docs/superpowers/plans/2026-07-30-rapid-word-entry-queue.md \
  .superloopy/evidence/frontend/rapid-word-entry
rtk git commit -m "feat: queue rapid word creation"
```

- [ ] **Step 5: `main` push와 Actions 확인**

```bash
GIT_SSH_COMMAND="ssh -i /home/ubuntu/.ssh/id_ed25519 -o StrictHostKeyChecking=no" rtk git push origin main
rtk gh run list --limit 5
rtk gh run watch <run-id> --exit-status
```

Expected: deploy workflow completed successfully.

- [ ] **Step 6: 운영 검증**

```bash
rtk curl -fsS https://vocaloop.lawdigest.kr/api/health
rtk curl -I -sS https://vocaloop.lawdigest.kr/
rtk pm2 describe voca-loop
```

실제 homepage가 참조하는 JS asset을 가져와 새 queue 상태 문구가 배포됐는지 확인한다.

## FACTS Validation

- [x] **F:** React/Vitest와 기존 API 안에서 구현 가능하다.
- [x] **A:** 각 task는 queue, 명령 연결, UI, 검증 한 가지 책임을 가진다.
- [x] **C:** 모든 task에 파일, 현재 라인, 코드 sketch가 있다.
- [x] **T:** RED/GREEN focused test와 전체 검증 명령이 있다.
- [x] **S:** backend/API/bulk 저장 계약과 단어 카드 디자인은 변경하지 않는다.
