# FastAPI Backend Internalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Firebase Auth, Firestore, and Storage with a FastAPI + SQLite backend that serves both API routes and the built React frontend.

**Architecture:** Add a Python backend under `backend/` with SQLite persistence, cookie-based auth, upload handling, and SPA/static serving. Refactor the React app to consume REST APIs instead of Firebase SDK calls, then switch deployment to run the FastAPI app as the single process.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, Pydantic, passlib/bcrypt, python-multipart, React 19, Vite 7, pytest

---

## File Structure

### Backend files to create

- `backend/requirements.txt`
- `backend/app/__init__.py`
- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/db.py`
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/auth.py`
- `backend/app/seed.py`
- `backend/app/routes/__init__.py`
- `backend/app/routes/auth.py`
- `backend/app/routes/words.py`
- `backend/app/routes/folders.py`
- `backend/app/routes/settings.py`
- `backend/app/routes/uploads.py`
- `backend/tests/conftest.py`
- `backend/tests/test_auth.py`
- `backend/tests/test_words.py`
- `backend/tests/test_folders.py`
- `backend/tests/test_settings.py`
- `backend/tests/test_uploads.py`

### Frontend files to create

- `src/services/apiClient.js`
- `src/services/authApi.js`
- `src/services/wordApi.js`
- `src/services/folderApi.js`
- `src/services/settingsApi.js`
- `src/services/uploadApi.js`

### Existing files to modify

- `package.json`
- `ecosystem.config.cjs`
- `src/App.jsx`
- `src/components/AccountSettings.jsx`
- `src/components/ToeflCompleteTheWordQuiz.jsx`
- `src/components/LoginScreen.jsx`
- `server.js`
- `.env`
- `.github/workflows/deploy.yml`
- `AGENTS.md`

### Files likely to remove after cutover

- Firebase-specific imports and setup paths inside `src/App.jsx`
- Firebase-specific imports and logic inside `src/components/AccountSettings.jsx`
- Firebase-specific Firestore write in `src/components/ToeflCompleteTheWordQuiz.jsx`
- `server.js` once PM2 and deploy scripts point at FastAPI

---

### Task 1: Add Python Backend Skeleton And Dependency Setup

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/db.py`
- Test: `backend/tests/conftest.py`

- [ ] **Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient


def test_health_endpoint_exists(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_health.py -v`
Expected: FAIL because backend app and test fixture do not exist yet

- [ ] **Step 3: Write minimal implementation**

Create the FastAPI app, config loader, DB bootstrap, and a `/api/health` endpoint in `backend/app/main.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_health.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app backend/tests
git commit -m "feat: scaffold fastapi backend"
```

### Task 2: Add SQLite Models And Startup Initialization

**Files:**
- Modify: `backend/app/db.py`
- Create: `backend/app/models.py`
- Create: `backend/app/seed.py`
- Test: `backend/tests/test_db_init.py`

- [ ] **Step 1: Write the failing test**

```python
from backend.app.db import SessionLocal
from backend.app.models import User


def test_tables_are_initialized():
    session = SessionLocal()
    try:
        users = session.query(User).all()
        assert users == []
    finally:
        session.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_db_init.py -v`
Expected: FAIL because `User` model and table initialization do not exist

- [ ] **Step 3: Write minimal implementation**

Add SQLAlchemy models for `User`, `UserSettings`, `Folder`, and `Word`, plus startup table creation and default seed wiring.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_db_init.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/db.py backend/app/models.py backend/app/seed.py backend/tests/test_db_init.py
git commit -m "feat: add sqlite models and initialization"
```

### Task 3: Implement Signup And Session Login

**Files:**
- Create: `backend/app/auth.py`
- Create: `backend/app/routes/auth.py`
- Modify: `backend/app/main.py`
- Create: `backend/app/schemas.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing test**

```python
def test_signup_creates_user_and_sets_cookie(client):
    response = client.post(
        "/api/auth/signup",
        json={"email": "user@example.com", "password": "Password123!", "display_name": "User"},
    )
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "user@example.com"
    assert "set-cookie" in response.headers
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_auth.py::test_signup_creates_user_and_sets_cookie -v`
Expected: FAIL because auth routes are not implemented

- [ ] **Step 3: Write minimal implementation**

Implement password hashing, signup route, login route, logout route, and current-user session lookup with `HttpOnly` cookies.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_auth.py -v`
Expected: PASS for signup, login, logout, and invalid-credential cases

- [ ] **Step 5: Commit**

```bash
git add backend/app/auth.py backend/app/routes/auth.py backend/app/schemas.py backend/app/main.py backend/tests/test_auth.py
git commit -m "feat: add session auth endpoints"
```

### Task 4: Seed New Accounts With Default Settings And Sample Words

**Files:**
- Modify: `backend/app/routes/auth.py`
- Modify: `backend/app/seed.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the failing test**

```python
def test_signup_seeds_default_settings_and_words(client):
    response = client.post(
        "/api/auth/signup",
        json={"email": "seed@example.com", "password": "Password123!", "display_name": "Seed"},
    )
    assert response.status_code == 201

    words = client.get("/api/words")
    settings = client.get("/api/settings")

    assert words.status_code == 200
    assert len(words.json()) > 0
    assert settings.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_auth.py::test_signup_seeds_default_settings_and_words -v`
Expected: FAIL because seeded defaults are missing

- [ ] **Step 3: Write minimal implementation**

Create default user settings and insert the current sample word set at signup time.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_auth.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/auth.py backend/app/seed.py backend/tests/test_auth.py
git commit -m "feat: seed new accounts with defaults"
```

### Task 5: Implement Words API

**Files:**
- Create: `backend/app/routes/words.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/tests/test_words.py`

- [ ] **Step 1: Write the failing test**

```python
def test_authenticated_user_can_create_word(authenticated_client):
    response = authenticated_client.post(
        "/api/words",
        json={
            "word": "ubiquitous",
            "meaning_ko": "어디에나 있는",
            "pronunciation": "/juːˈbɪk.wɪ.təs/",
            "pos": "Adjective",
            "definitions": ["present everywhere"],
            "definitions_ko": ["어디에나 존재하는"],
            "examples": [{"en": "Phones are ubiquitous.", "ko": "휴대폰은 어디에나 있다."}],
            "synonyms": ["omnipresent"],
            "nuance": "common everywhere",
        },
    )
    assert response.status_code == 201
    assert response.json()["word"] == "ubiquitous"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_words.py -v`
Expected: FAIL because words routes do not exist

- [ ] **Step 3: Write minimal implementation**

Implement list, create, patch, and delete endpoints for words with user scoping and JSON field serialization.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_words.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/words.py backend/app/main.py backend/app/schemas.py backend/tests/test_words.py
git commit -m "feat: add words api"
```

### Task 6: Implement Folders API

**Files:**
- Create: `backend/app/routes/folders.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/tests/test_folders.py`

- [ ] **Step 1: Write the failing test**

```python
def test_authenticated_user_can_create_folder(authenticated_client):
    response = authenticated_client.post(
        "/api/folders",
        json={"name": "Academic", "color": "#2563EB"},
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Academic"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_folders.py -v`
Expected: FAIL because folders routes do not exist

- [ ] **Step 3: Write minimal implementation**

Implement list, create, update, delete, and reorder endpoints for folders and user-scoped ownership checks.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_folders.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/folders.py backend/app/main.py backend/app/schemas.py backend/tests/test_folders.py
git commit -m "feat: add folders api"
```

### Task 7: Implement Settings API

**Files:**
- Create: `backend/app/routes/settings.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/tests/test_settings.py`

- [ ] **Step 1: Write the failing test**

```python
def test_authenticated_user_can_update_settings(authenticated_client):
    response = authenticated_client.put(
        "/api/settings",
        json={
            "ai_provider": "gemini",
            "ai_model": "gemini-2.5-flash",
            "gemini_api_key": "test-key",
            "openai_api_key": "",
            "claude_api_key": "",
            "toefl_target": 100,
        },
    )
    assert response.status_code == 200
    assert response.json()["ai_model"] == "gemini-2.5-flash"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_settings.py -v`
Expected: FAIL because settings endpoints are not implemented

- [ ] **Step 3: Write minimal implementation**

Implement read and update endpoints for per-user settings, preserving the current frontend shape where practical.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_settings.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/settings.py backend/app/main.py backend/app/schemas.py backend/tests/test_settings.py
git commit -m "feat: add settings api"
```

### Task 8: Implement Local Profile Image Upload API

**Files:**
- Create: `backend/app/routes/uploads.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/config.py`
- Test: `backend/tests/test_uploads.py`

- [ ] **Step 1: Write the failing test**

```python
def test_profile_image_upload_returns_public_path(authenticated_client):
    response = authenticated_client.post(
        "/api/uploads/profile-image",
        files={"file": ("avatar.png", b"fakepngdata", "image/png")},
    )
    assert response.status_code == 200
    assert response.json()["photo_url"].startswith("/uploads/profile/")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_uploads.py -v`
Expected: FAIL because upload route and static mount do not exist

- [ ] **Step 3: Write minimal implementation**

Implement image validation, unique filename generation, local file write, previous file replacement, and static mounting for uploads.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_uploads.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/uploads.py backend/app/main.py backend/app/config.py backend/tests/test_uploads.py
git commit -m "feat: add profile image uploads"
```

### Task 9: Serve Built React App From FastAPI

**Files:**
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_static_serving.py`

- [ ] **Step 1: Write the failing test**

```python
def test_non_api_route_serves_spa_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_static_serving.py -v`
Expected: FAIL because SPA static serving is not wired up

- [ ] **Step 3: Write minimal implementation**

Mount the Vite `dist/` assets and return `dist/index.html` for non-API paths.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_static_serving.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/tests/test_static_serving.py
git commit -m "feat: serve spa from fastapi"
```

### Task 10: Add Frontend API Client Layer

**Files:**
- Create: `src/services/apiClient.js`
- Create: `src/services/authApi.js`
- Create: `src/services/wordApi.js`
- Create: `src/services/folderApi.js`
- Create: `src/services/settingsApi.js`
- Create: `src/services/uploadApi.js`
- Test: `src/services/__tests__/apiClient.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
import { apiRequest } from '../apiClient';

test('apiRequest sends credentials by default', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  });

  await apiRequest('/api/test');

  expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
    credentials: 'include',
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/__tests__/apiClient.test.js`
Expected: FAIL because client layer does not exist

- [ ] **Step 3: Write minimal implementation**

Add a shared API request helper and small service wrappers for auth, words, folders, settings, and uploads.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/__tests__/apiClient.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services package.json
git commit -m "feat: add frontend api client layer"
```

### Task 11: Replace Firebase Auth Bootstrap In App.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/LoginScreen.jsx`
- Test: `src/App.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
test('loads authenticated session from backend on startup', async () => {
  // mock authApi.getCurrentUser and settings/words/folders loaders
  // assert dashboard renders after bootstrap
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL because App still depends on Firebase session bootstrap

- [ ] **Step 3: Write minimal implementation**

Remove Firebase imports and replace login, signup, logout, and session bootstrap with backend API calls and local state updates.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/LoginScreen.jsx src/App.test.jsx
git commit -m "refactor: move auth flow to backend api"
```

### Task 12: Replace Words And Folders Firebase Mutations In App.jsx

**Files:**
- Modify: `src/App.jsx`
- Test: `src/App.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
test('creates folder and updates word status through backend apis', async () => {
  // mock folderApi and wordApi calls
  // assert local state updates after success
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL because App still uses Firestore writes

- [ ] **Step 3: Write minimal implementation**

Replace word create/update/delete and folder create/update/delete/reorder logic with REST calls plus explicit local state updates.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "refactor: move word and folder state to backend api"
```

### Task 13: Replace Firebase Profile And Settings Logic

**Files:**
- Modify: `src/components/AccountSettings.jsx`
- Modify: `src/App.jsx`
- Test: `src/components/AccountSettings.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
test('saves profile settings through backend api', async () => {
  // mock settingsApi.updateSettings and uploadApi.uploadProfileImage
  // assert save handler sends expected payload
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/AccountSettings.test.jsx`
Expected: FAIL because component still imports Firebase auth/storage/firestore helpers

- [ ] **Step 3: Write minimal implementation**

Remove Firebase storage, auth, and Firestore logic from `AccountSettings.jsx`, replacing it with backend settings and upload endpoints.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/AccountSettings.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AccountSettings.jsx src/components/AccountSettings.test.jsx src/App.jsx
git commit -m "refactor: move profile settings to backend api"
```

### Task 14: Replace Remaining Firestore Usage In TOEFL Quiz Save Flow

**Files:**
- Modify: `src/components/ToeflCompleteTheWordQuiz.jsx`
- Test: `src/components/ToeflCompleteTheWordQuiz.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
test('saves generated vocabulary word through word api', async () => {
  // mock generateWordData and wordApi.createWord
  // assert save call uses backend api instead of firestore
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ToeflCompleteTheWordQuiz.test.jsx`
Expected: FAIL because component still imports Firestore helpers

- [ ] **Step 3: Write minimal implementation**

Swap the remaining direct Firestore write for the shared backend word API client.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ToeflCompleteTheWordQuiz.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ToeflCompleteTheWordQuiz.jsx src/components/ToeflCompleteTheWordQuiz.test.jsx
git commit -m "refactor: remove quiz firestore dependency"
```

### Task 15: Remove Firebase Runtime Dependencies And Setup Screen Requirement

**Files:**
- Modify: `package.json`
- Modify: `src/App.jsx`
- Modify: `src/components/SetupScreen.jsx`
- Modify: `.env`

- [ ] **Step 1: Write the failing test**

```javascript
test('app no longer requires firebase config to render login screen', async () => {
  // clear env-dependent firebase config
  // assert login screen still renders
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL because the app still guards on Firebase config

- [ ] **Step 3: Write minimal implementation**

Remove `firebase` from dependencies, remove Firebase config bootstrap paths, and repurpose or remove the setup screen.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/App.jsx src/components/SetupScreen.jsx .env
git commit -m "refactor: remove firebase runtime dependency"
```

### Task 16: Switch Deployment To FastAPI Process

**Files:**
- Modify: `ecosystem.config.cjs`
- Modify: `.github/workflows/deploy.yml`
- Modify: `AGENTS.md`
- Modify: `server.js`

- [ ] **Step 1: Write the failing test**

```bash
pm2 describe voca-loop
```

Expected: current process definition still points at Node `server.js`, so deployment target is incorrect

- [ ] **Step 2: Run verification to confirm current behavior**

Run: `node -e "const cfg=require('./ecosystem.config.cjs'); console.log(cfg.apps[0])"`
Expected: output still references `server.js`

- [ ] **Step 3: Write minimal implementation**

Update PM2 and deploy scripts to build the frontend, install backend dependencies, and start `uvicorn backend.app.main:app --host 0.0.0.0 --port 3000`.

- [ ] **Step 4: Run verification to confirm new behavior**

Run: `node -e "const cfg=require('./ecosystem.config.cjs'); console.log(cfg.apps[0])"`
Expected: process command now points at FastAPI runtime

- [ ] **Step 5: Commit**

```bash
git add ecosystem.config.cjs .github/workflows/deploy.yml AGENTS.md server.js
git commit -m "chore: switch deployment to fastapi"
```

### Task 17: Full Verification Pass

**Files:**
- No new source files
- Verify: backend and frontend test suites

- [ ] **Step 1: Run backend tests**

Run: `pytest backend/tests -v`
Expected: PASS

- [ ] **Step 2: Run frontend tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Build frontend**

Run: `npm run build`
Expected: PASS and fresh `dist/` output

- [ ] **Step 4: Run local app smoke test**

Run: `uvicorn backend.app.main:app --host 127.0.0.1 --port 3000`
Expected: app starts without Firebase config and serves both API and frontend routes

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: verify fastapi backend cutover"
```
