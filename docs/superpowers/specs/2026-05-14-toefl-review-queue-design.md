# TOEFL Review Queue Design

## Goal

Build a systematic TOEFL review system that turns saved problems and attempts into a durable review queue. The user should see what to review today, which mistakes are still active, which saved problems can be replayed, and which weak items are mastered.

## Existing Context

VocaLoop already persists generated TOEFL problems as `ToeflQuizAsset` and stores submitted results as `ToeflQuizAttempt`. The current dashboard lists saved assets, but it does not read attempts back, extract mistakes, or track review status over time.

The new system extends this contract instead of replacing it.

## Data Model

Create `ToeflReviewItem`.

Fields:

- `user_id`
- `asset_id`
- `attempt_id`
- `mode`
- `task_type`
- `item_key`
- `title`
- `prompt`
- `user_answer`
- `correct_answer`
- `explanation`
- `source_snapshot`
- `skill_tag`
- `topic_tags`
- `status`: `new`, `reviewing`, `mastered`
- `due_date`
- `review_count`
- `success_streak`
- `last_result`
- timestamps

Review items keep a small source snapshot so the review note remains readable even if the original quiz payload shape evolves.

## Review Rules

- New mistakes are due today.
- Repeated failure keeps the item in `reviewing` and moves the next due date to tomorrow.
- A successful review increments `success_streak` and schedules the next interval as 1 day, then 3 days, then 7 days.
- After three consecutive successful reviews, the item becomes `mastered`.
- A mastered item can return to `reviewing` if a later attempt fails the same item again.

## UI

Review is a top-level navigation tab at `/review`. Study remains focused on choosing learning modes, while Review owns the saved-problem replay and mistake queue.

Use the existing design-system primitives:

- `Card` for review surfaces and list items.
- `Badge` for status and metadata.
- `Button` for actions.
- `Stat` for queue metrics.
- `SectionHeading` for the main review module heading.

Do not introduce a separate visual language, decorative card nesting, or ad hoc colors outside the current token families.

Review tabs:

- `Today`: due review items.
- `Mistakes`: active non-mastered review items.
- `Saved`: saved TOEFL problem sets.
- `Mastered`: completed review items.

Review detail:

- Shows prompt, user answer, correct answer, explanation, tags, and source context.
- Allows marking a review as correct or still difficult.
- Links back to the full saved problem set when available.

## Backend API

Add endpoints under `/api/toefl/review-items`.

- `GET /api/toefl/review-items?scope=today|active|mastered|all`
- `GET /api/toefl/review-items/{id}`
- `PATCH /api/toefl/review-items/{id}`

Attempt creation should extract review items from the attempt payload and upsert them by user, asset, and item key when possible.

## Extraction Scope

First implementation targets the currently stored payload shapes:

- Reading task and Reading mock: incorrect selected-option items.
- Complete the Words: questions with incorrect blanks.
- Build a Sentence: incorrect sentence arrangements.
- Writing task and Writing mock: low-scoring responses as rewrite review items.

When exact answer reconstruction is not possible, store the available prompt/result snapshot and keep the item useful as a review note.

## Verification

- Backend tests for review item creation, listing, isolation by user, and status transitions.
- Frontend tests for dashboard review tabs and opening a review detail.
- Build and backend test gates remain `npm run build`, `npm test` where touched, and `pytest backend/tests -q`.
