# Screenshot Vocabulary Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build screenshot-to-vocabulary import so a signed-in user can upload a vocabulary screenshot, review extracted words, and approve them for the existing AI-enriched bulk save flow.

**Architecture:** Add a backend extraction endpoint that validates one image, calls server-side Codex with `--image`, normalizes word candidates, and returns no persisted records. Add a focused frontend upload service and modal, then wire the modal into the existing vocabulary dashboard and bulk-add handler.

**Tech Stack:** FastAPI, SQLAlchemy test fixture, subprocess-backed Codex CLI, React 19, Vite, Vitest, Testing Library.

---

## File Structure

- Create `backend/app/image_uploads.py`: shared safe raster image detection and streamed upload persistence used by profile uploads and screenshot extraction.
- Create `backend/app/routes/vocabulary_imports.py`: authenticated screenshot extraction route and Codex response normalization.
- Modify `backend/app/routes/uploads.py`: reuse `image_uploads.py` helper for profile images.
- Modify `backend/app/main.py`: register vocabulary import router.
- Modify `backend/app/schemas.py`: add screenshot extraction response schema if a typed response is useful.
- Create `backend/tests/test_vocabulary_imports.py`: route tests for auth, validation, normalization, Codex invocation, no DB write, and error cases.
- Create `src/services/vocabularyImportApi.js`: multipart upload client.
- Create `src/services/vocabularyImportApi.test.js`: service test for FormData call shape.
- Create `src/components/ScreenshotWordImportModal.jsx`: upload, extraction result editing, folder choice, approval.
- Create `src/components/ScreenshotWordImportModal.test.jsx`: modal behavior tests.
- Modify `src/components/VocabularyDashboard.jsx`: add `이미지에서 추가` action and modal wiring.
- Modify existing dashboard tests if needed to cover opening the import modal.

## Task 1: Backend Shared Image Helper

**Files:**
- Create: `backend/app/image_uploads.py`
- Modify: `backend/app/routes/uploads.py`
- Test: `backend/tests/test_uploads.py`

- [ ] **Step 1: Write the failing regression test**

Add a test to `backend/tests/test_uploads.py` proving existing profile upload behavior still rejects spoofed image bytes after helper extraction:

```python
def test_spoofed_image_content_type_with_non_image_bytes_is_rejected(client):
    ...
    assert response.status_code == 422
```

This test already exists, so run it before edits as the baseline.

- [ ] **Step 2: Run the focused upload tests**

Run:

```bash
pytest backend/tests/test_uploads.py -q
```

Expected: PASS before refactor.

- [ ] **Step 3: Extract the helper**

Implement `backend/app/image_uploads.py` with:

```python
SAFE_IMAGE_SIGNATURES = (...)
CHUNK_SIZE = 1024 * 1024

def detect_safe_image_extension(header_bytes: bytes) -> str | None: ...

async def save_validated_image_upload(file, destination, *, max_size, content_type_error, signature_error, size_error) -> None:
    ...
```

Move signature detection and chunked size enforcement out of `uploads.py`.

- [ ] **Step 4: Reuse helper in profile uploads**

Modify `upload_profile_image()` to call `save_validated_image_upload()` and keep existing cleanup behavior.

- [ ] **Step 5: Verify profile upload tests still pass**

Run:

```bash
pytest backend/tests/test_uploads.py -q
```

Expected: PASS.

## Task 2: Backend Screenshot Extraction Route

**Files:**
- Create: `backend/app/routes/vocabulary_imports.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/tests/test_vocabulary_imports.py`

- [ ] **Step 1: Write failing route tests**

Create `backend/tests/test_vocabulary_imports.py` with tests for:

```python
def test_screenshot_extraction_requires_authentication(client): ...
def test_screenshot_extraction_rejects_non_image(client): ...
def test_screenshot_extraction_invokes_codex_with_image_and_normalizes_words(client, monkeypatch): ...
def test_screenshot_extraction_does_not_create_words_or_folders(client, monkeypatch): ...
def test_screenshot_extraction_rejects_empty_results(client, monkeypatch): ...
```

The happy-path fake `subprocess.run` should write this last message:

```json
{"words":[" Abate ","abate","candid","123"],"suggested_folder_name":" TOEFL "}
```

Expected normalized response:

```json
{"words":["Abate","candid"],"suggested_folder_name":"TOEFL"}
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pytest backend/tests/test_vocabulary_imports.py -q
```

Expected: FAIL because the route is not registered.

- [ ] **Step 3: Implement route and schemas**

Implement:

- `ScreenshotVocabularyImportResponse` in `schemas.py`,
- `router = APIRouter(prefix="/api/vocabulary-imports", tags=["vocabulary-imports"])`,
- `POST /screenshot/extract`,
- temporary file save through the shared image helper,
- Codex command with `--image`,
- JSON parsing and normalization,
- 422 for no extracted words,
- 502/504 for Codex failure/timeout.

- [ ] **Step 4: Register router**

Add the route to `backend/app/main.py`.

- [ ] **Step 5: Verify backend import tests pass**

Run:

```bash
pytest backend/tests/test_vocabulary_imports.py -q
```

Expected: PASS.

## Task 3: Frontend Upload Service

**Files:**
- Create: `src/services/vocabularyImportApi.js`
- Create: `src/services/vocabularyImportApi.test.js`

- [ ] **Step 1: Write failing service test**

Mock `global.fetch` and assert `extractWordsFromScreenshot(file)` calls:

```text
POST /api/vocabulary-imports/screenshot/extract
```

with a `FormData` body and no manual JSON content type.

- [ ] **Step 2: Run service test and verify RED**

Run:

```bash
npm test -- src/services/vocabularyImportApi.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement service**

Create:

```js
import { apiRequest } from './apiClient';

export const extractWordsFromScreenshot = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/api/vocabulary-imports/screenshot/extract', {
    method: 'POST',
    body: formData,
  });
};
```

- [ ] **Step 4: Verify service test passes**

Run:

```bash
npm test -- src/services/vocabularyImportApi.test.js
```

Expected: PASS.

## Task 4: Screenshot Import Modal

**Files:**
- Create: `src/components/ScreenshotWordImportModal.jsx`
- Create: `src/components/ScreenshotWordImportModal.test.jsx`

- [ ] **Step 1: Write failing modal tests**

Tests should verify:

- file upload calls `extractWordsFromScreenshot`,
- extracted words render as editable/removable items,
- approving calls `onSubmit({ words, folderId, newFolderName })`,
- empty approved list blocks save,
- extraction failure shows `이미지에서 단어를 읽지 못했습니다.`.

- [ ] **Step 2: Run modal tests and verify RED**

Run:

```bash
npm test -- src/components/ScreenshotWordImportModal.test.jsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement modal**

Build a focused modal with:

- image file input,
- progress state `단어 읽는 중`,
- editable word inputs or chips,
- remove buttons,
- folder select with `새 폴더 생성`,
- approve button using `onSubmit`.

Use existing icon and styling patterns from `BulkWordAddModal`.

- [ ] **Step 4: Verify modal tests pass**

Run:

```bash
npm test -- src/components/ScreenshotWordImportModal.test.jsx
```

Expected: PASS.

## Task 5: Dashboard Wiring

**Files:**
- Modify: `src/components/VocabularyDashboard.jsx`
- Modify: `src/App.jsx` only if the existing `handleBulkAddWordsWithFolder` contract needs no wrapper changes.
- Test: existing or new dashboard/component tests.

- [ ] **Step 1: Write failing wiring test**

Add or update a test that renders the dashboard, clicks `이미지에서 추가`, and sees the screenshot modal.

- [ ] **Step 2: Run test and verify RED**

Run the focused test file.

- [ ] **Step 3: Wire modal**

Add local open state, render `ScreenshotWordImportModal`, pass:

- `folders`,
- `defaultFolderId`,
- `onSubmit={onBulkAddWords}`,
- `progress={bulkAddProgress}` if reused,
- close handler.

- [ ] **Step 4: Verify wiring test passes**

Run the focused test file again.

## Task 6: Full Verification And Commit

**Files:**
- All touched files.

- [ ] **Step 1: Run focused backend tests**

```bash
pytest backend/tests/test_uploads.py backend/tests/test_vocabulary_imports.py -q
```

- [ ] **Step 2: Run focused frontend tests**

```bash
npm test -- src/services/vocabularyImportApi.test.js src/components/ScreenshotWordImportModal.test.jsx
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

- [ ] **Step 4: Run broader gates if focused tests are clean**

```bash
npm test
pytest backend/tests -q
```

- [ ] **Step 5: Inspect diff**

```bash
git diff --check
git status --short
```

- [ ] **Step 6: Commit**

```bash
git add <touched files>
git commit -m "feat: import vocabulary from screenshots"
```
