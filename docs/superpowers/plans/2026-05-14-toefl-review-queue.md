# TOEFL Review Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution for this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a systematic TOEFL review queue backed by saved assets and attempts.

**Architecture:** Extend the existing TOEFL persistence layer with `ToeflReviewItem`, generate review items when attempts are saved, expose list/detail/update APIs, then add a design-system-compliant top-level Review tab.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, Pydantic, React 19, Vite, Tailwind CSS 4, VocaLoop design-system primitives.

---

### Task 1: Backend Review Model And API

**Files:**

- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/db.py`
- Modify: `backend/app/routes/toefl.py`
- Test: `backend/tests/test_toefl_assets.py`

- [ ] Add `ToeflReviewItem` model and relationship.
- [ ] Add SQLite bootstrap column/table creation support.
- [ ] Add Pydantic read/update schemas.
- [ ] Add list/detail/update API endpoints.
- [ ] Add tests for creation, list scopes, user isolation, and status updates.

### Task 2: Attempt-To-Review Extraction

**Files:**

- Modify: `backend/app/routes/toefl.py`
- Test: `backend/tests/test_toefl_assets.py`

- [ ] Add extractor helpers for stored attempt payloads.
- [ ] Create or update review items after `create_attempt`.
- [ ] Keep extraction defensive for partial payloads.
- [ ] Test Reading-style mistakes and low-score Writing-style review items.

### Task 3: Frontend API And Review Tab

**Files:**

- Create: `src/services/toeflReviewApi.js`
- Create: `src/components/ToeflReviewPanel.jsx`
- Create: `src/components/ToeflReviewView.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/QuizDashboard.jsx`
- Modify: `src/components/QuizView.jsx`
- Test: `src/components/ToeflReviewView.test.jsx`

- [ ] Add API client functions.
- [ ] Add `/review` route and top navigation entry.
- [ ] Load review items next to saved TOEFL assets in the Review tab.
- [ ] Render tabs for Today, Mistakes, Saved, and Mastered.
- [ ] Use `Card`, `Badge`, `Button`, `Stat`, and `SectionHeading`.
- [ ] Keep cards flat and scannable, with no nested card layouts.

### Task 4: Review Detail And State Transitions

**Files:**

- Create: `src/components/ToeflReviewDetail.jsx`
- Modify: `src/components/ToeflReviewView.jsx`
- Modify: `src/components/QuizView.jsx`
- Test: `src/components/ToeflReviewView.test.jsx`
- Test: `src/components/QuizView.test.jsx`

- [ ] Open a selected review item from the Review tab.
- [ ] Show prompt, user answer, correct answer, explanation, tags, and due status.
- [ ] Add `Still difficult` and `Got it` actions.
- [ ] Refresh review queue after status update.
- [ ] Link to the full saved problem set by handing the asset to Study mode.

### Task 5: Verification And Release

**Commands:**

- `rtk pytest backend/tests -q`
- `rtk npm test -- --run`
- `rtk npm run build`
- `rtk git status --short`

- [ ] Run targeted and full verification.
- [ ] Commit changes.
- [ ] Push `main`.
- [ ] Watch GitHub Actions deploy.
- [ ] Verify `https://vocaloop.lawdigest.kr/` and `/api/health`.
