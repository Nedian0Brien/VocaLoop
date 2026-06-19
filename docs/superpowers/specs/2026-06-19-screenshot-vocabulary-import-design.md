# Screenshot Vocabulary Import Design

## Goal

Let a signed-in user turn a vocabulary-list screenshot into a real VocaLoop folder with saved words.

The feature should keep the user review step fast: the screenshot extraction step returns only the words, the user quickly removes or edits mistakes, and only after approval does the app generate meanings, pronunciations, definitions, examples, synonyms, and nuance through the existing AI word-analysis flow.

## Existing Context

VocaLoop already has the pieces needed for the approved save path:

- `/api/uploads/profile-image` validates and stores profile images, but there is no general screenshot import upload route yet.
- `/api/ai/codex` runs `codex exec` for text prompts, but it does not currently attach images.
- `codex exec` supports `--image <FILE>`, so the backend can pass a validated temporary image to Codex.
- `/api/folders` creates user-scoped folders.
- `/api/words` creates user-scoped words and links them to folders.
- `BulkWordAddModal` and `runBulkWordAdd` already handle approved word queues, duplicate detection, folder assignment, AI enrichment, partial failure reporting, and progress state.

The new feature should extend these paths rather than creating a second word-save pipeline.

Screenshot extraction is always a server-side Codex operation. It should not depend on the user's selected fallback provider or browser-held API keys. The later word enrichment step should keep using the existing bulk-add AI configuration path.

## User Flow

1. The user opens the vocabulary dashboard.
2. The user chooses the screenshot import action near the existing word-add controls.
3. The user selects or drops one image file.
4. The app uploads the image to the backend for extraction.
5. The backend validates the image, calls Codex with the image, and returns extracted word candidates.
6. The app shows a compact editable word list.
7. The user removes wrong items, fixes small OCR mistakes, chooses an existing folder or enters a new folder name, then approves.
8. The approved words enter the existing bulk-add save flow.
9. The existing AI word-analysis flow fills meanings and examples before saving new words.

No database records should be created before step 8.

## Backend API

Add an authenticated extraction endpoint:

```text
POST /api/vocabulary-imports/screenshot/extract
```

Request:

- `multipart/form-data`
- field: `file`
- supported raster image formats should match the safe image signatures already used for profile images.

Response:

```json
{
  "words": ["abate", "candid", "ephemeral"],
  "suggested_folder_name": "TOEFL Vocabulary"
}
```

The response is intentionally small. Do not expose OCR confidence, Codex logs, file paths, or implementation state in the UI contract.

### Validation

The endpoint should:

- require authentication,
- reject non-image uploads,
- reject unsupported raster formats,
- enforce a small upload limit, initially 5 MB to match profile image uploads,
- store the image in a temporary directory for the Codex invocation,
- remove temporary files after the request completes,
- leave the database unchanged.

Image signature detection and streaming size checks should be extracted from the profile upload route into a shared backend helper instead of being duplicated inside the new route.

### Codex Invocation

The backend should call `codex exec` with:

- the configured Codex binary,
- the default valid Codex model from the existing provider contract,
- `--image <temporary-image-path>`,
- a read-only or otherwise constrained working directory,
- a timeout using the existing Codex timeout setting unless a separate extraction timeout is needed.

The prompt should ask Codex to:

- read the image as a vocabulary list,
- extract only English words or short English vocabulary phrases,
- ignore numbering, checkboxes, Korean meanings, section headers, dates, page chrome, and decorative text,
- preserve visible order,
- remove duplicates case-insensitively,
- avoid guessing unclear text,
- return JSON only.

Expected Codex JSON:

```json
{
  "words": ["abate", "candid", "ephemeral"],
  "suggested_folder_name": "TOEFL Vocabulary"
}
```

The backend should parse and normalize this response before returning it.

Normalization rules:

- trim every word,
- drop empty values,
- drop values that do not contain at least one ASCII letter,
- remove duplicates case-insensitively,
- cap the returned list to a reasonable first-version maximum, such as 100 words,
- trim or omit `suggested_folder_name` if it is empty.

If no words remain after normalization, return a user-actionable error rather than an empty successful import.

## Frontend Design

Add a screenshot import action near the existing "여러 단어 추가" action in the vocabulary dashboard.

Use a dedicated modal, tentatively `ScreenshotWordImportModal`, because image extraction and approved word saving are separate tasks:

- upload/drop image,
- show extraction progress,
- show editable extracted word chips or rows,
- allow removing words,
- allow editing a word inline or through a simple input,
- allow folder selection or new folder name entry,
- approve and save.

The modal should stay focused on quick confirmation. It should not preview meanings, definitions, examples, or Codex internals.

Approved words should call the same app-level handler currently used by `BulkWordAddModal`, so duplicate handling, folder creation, AI enrichment, save progress, and notifications remain consistent.

The UI should disable close-destructive actions while extraction or save is in progress, matching the existing bulk-add modal behavior. If a save partially fails, the modal should not imply that all extracted words were saved.

## User-Facing Copy

Copy should be short and user-centered.

Recommended visible labels:

- action: `이미지에서 추가`
- extraction progress: `단어 읽는 중`
- empty result: `추출된 단어가 없습니다.`
- unsupported file: `이미지 파일만 업로드할 수 있습니다.`
- size limit: `5MB 이하 이미지만 업로드해 주세요.`
- extraction failure: `이미지에서 단어를 읽지 못했습니다.`

Avoid exposing terms such as fallback, runtime, artifact, OCR confidence, Codex logs, prompt, or parser.

## Error Handling

Extraction errors should not create words or folders.

Expected cases:

- invalid file type,
- unsupported image signature,
- image too large,
- Codex timeout,
- Codex non-zero exit,
- invalid JSON response,
- no extracted words.

Save errors after user approval should use the existing bulk-add behavior:

- keep successfully saved words,
- report failed count,
- preserve enough UI state for the user to retry failed words manually when practical.

## Testing

Backend tests:

- authenticated extraction rejects non-image uploads,
- unsupported signatures are rejected,
- oversized images are rejected,
- Codex JSON is parsed and normalized,
- duplicate and empty word candidates are removed,
- no database folders or words are created during extraction,
- Codex timeout or invalid output returns a clear error,
- extraction uses the server Codex path and does not require user API keys.

Frontend tests:

- screenshot import action opens the modal,
- successful extraction renders editable word candidates,
- removing and editing candidates changes the approved list,
- approval calls the existing bulk-add submit handler with only approved words,
- extraction failure shows a concise user-facing error.

Manual verification:

- run backend tests for the new route,
- run touched frontend tests,
- run `npm run build`,
- test one real screenshot with `codex exec --image` through the backend endpoint.

## Out Of Scope

Do not add these in the first version:

- background jobs,
- persisted import history,
- confidence scores,
- per-word screenshot coordinates,
- automatic saving before user approval,
- non-Codex OCR providers,
- batch upload of multiple screenshots,
- direct browser calls to third-party vision APIs.
