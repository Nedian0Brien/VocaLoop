# VocaLoop FastAPI Backend Internalization Design

## Goal

Replace Firebase Auth, Firestore, and Storage with an internal backend built on FastAPI.

The first migration target is:

- FastAPI backend
- SQLite database
- Email/password authentication only
- Cookie-based session auth
- Local disk storage for profile images
- FastAPI serving both API routes and the built React frontend

This migration explicitly removes:

- Firebase Auth
- Firestore
- Firebase Storage
- Google login
- Firebase password reset flow

## Scope

The first delivery must preserve the current core user flows:

- Sign up with email and password
- Log in and log out
- Manage words
- Manage folders
- Update learning state and word stats
- Store AI provider, model, and API keys per user
- Upload and update profile image
- Serve the React app from the same backend process

Out of scope for phase 1:

- Automatic migration of existing Firebase data
- Google OAuth
- Email-based password reset
- Multi-server deployment
- External object storage

## Recommended Architecture

FastAPI becomes the single application entrypoint.

- `/api/*` serves backend JSON endpoints
- `/uploads/*` serves locally stored user-uploaded files
- `/assets/*` and the SPA entry HTML are served from the Vite build output

The current Express server at [server.js](/home/ubuntu/project/VocaLoop/server.js) becomes obsolete after the migration.

### Backend layout

Recommended backend package layout:

- `backend/app/main.py`: FastAPI app initialization, middleware, route registration, static mounting
- `backend/app/config.py`: environment configuration
- `backend/app/db.py`: SQLite engine, session factory, startup initialization
- `backend/app/models.py`: SQLAlchemy models
- `backend/app/schemas.py`: Pydantic request and response schemas
- `backend/app/auth.py`: password hashing, session cookie helpers, current user dependency
- `backend/app/routes/auth.py`: signup, login, logout, password change, session check
- `backend/app/routes/words.py`: word CRUD and status updates
- `backend/app/routes/folders.py`: folder CRUD and ordering
- `backend/app/routes/settings.py`: profile and AI settings
- `backend/app/routes/uploads.py`: profile image upload and deletion

### Frontend layout changes

The React app stops importing Firebase SDKs directly.

- Remove Firebase initialization and direct Auth/Firestore/Storage calls from [src/App.jsx](/home/ubuntu/project/VocaLoop/src/App.jsx)
- Replace direct SDK usage with API client calls
- Replace Firestore real-time listeners with explicit fetch + local React state refresh
- Remove Firebase-specific logic from [src/components/AccountSettings.jsx](/home/ubuntu/project/VocaLoop/src/components/AccountSettings.jsx)
- Replace `addDoc`, `updateDoc`, `deleteDoc`, `onSnapshot`, and Firebase auth calls with REST requests

## Data Model

SQLite is the phase 1 datastore.

### users

Fields:

- `id`
- `email` unique
- `password_hash`
- `display_name`
- `photo_path`
- `created_at`
- `updated_at`

### user_settings

One row per user.

Fields:

- `id`
- `user_id` unique foreign key
- `ai_provider`
- `ai_model`
- `gemini_api_key`
- `openai_api_key`
- `claude_api_key`
- `toefl_target`
- `created_at`
- `updated_at`

### folders

Fields:

- `id`
- `user_id` foreign key
- `name`
- `color`
- `order_index`
- `created_at`
- `updated_at`

### words

Fields:

- `id`
- `user_id` foreign key
- `folder_id` nullable foreign key
- `word`
- `meaning_ko`
- `pronunciation`
- `pos`
- `definitions_json`
- `definitions_ko_json`
- `examples_json`
- `synonyms_json`
- `nuance`
- `status`
- `learning_rate`
- `stats_json`
- `created_at`
- `updated_at`

### Serialization choice

Fields that are already naturally list-shaped in the current frontend can remain JSON-serialized text columns in SQLite for phase 1.

This keeps the migration small and avoids unnecessary table explosion:

- definitions
- translated definitions
- examples
- synonyms
- word stats

If later reporting requirements grow, these fields can be normalized without changing the public API shape.

## Authentication Design

Authentication is email/password only.

### Session model

Use cookie-based sessions with secure server-side verification.

Recommended behavior:

- login issues an `HttpOnly` session cookie
- logout invalidates the session cookie
- all authenticated `/api` endpoints resolve the current user from the cookie

Cookie settings:

- `HttpOnly = true`
- `SameSite = Lax`
- `Secure = true` in production behind HTTPS

### Password handling

- Use `bcrypt` or `passlib[bcrypt]`
- Never store plain-text passwords
- Password reset by email is removed in phase 1
- Add authenticated password change endpoint instead

### Session APIs

Required endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

## API Surface

### auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### words

- `GET /api/words`
- `POST /api/words`
- `PATCH /api/words/{word_id}`
- `DELETE /api/words/{word_id}`

### folders

- `GET /api/folders`
- `POST /api/folders`
- `PATCH /api/folders/{folder_id}`
- `DELETE /api/folders/{folder_id}`
- `POST /api/folders/reorder`

### settings

- `GET /api/settings`
- `PUT /api/settings`

### uploads

- `POST /api/uploads/profile-image`
- `DELETE /api/uploads/profile-image`

## File Upload Strategy

Profile images are stored on local disk.

Recommended path:

- `backend/uploads/profile/`

Rules:

- store only relative paths in the database
- generate server-side unique filenames
- validate content type and file size
- delete replaced files during profile image updates
- serve uploaded files through FastAPI static mounting

## Frontend Migration Strategy

The biggest change is removing Firebase assumptions from the React tree.

### Current coupling points

Current Firebase usage is concentrated in:

- [src/App.jsx](/home/ubuntu/project/VocaLoop/src/App.jsx)
- [src/components/AccountSettings.jsx](/home/ubuntu/project/VocaLoop/src/components/AccountSettings.jsx)
- [src/components/ToeflCompleteTheWordQuiz.jsx](/home/ubuntu/project/VocaLoop/src/components/ToeflCompleteTheWordQuiz.jsx)

### Frontend migration approach

1. Introduce a thin API client layer
2. Introduce explicit auth bootstrap via `GET /api/auth/me`
3. Replace Firestore subscriptions with fetch-on-load and mutation-triggered refetch or optimistic local updates
4. Remove Firebase-specific profile and upload logic
5. Remove Firebase config requirement from the setup flow

### State behavior changes

The app currently relies on `onSnapshot` for live updates.

Phase 1 changes to pull-based state:

- fetch words, folders, and settings after login
- update local state immediately after successful mutation
- optionally refetch after mutation where correctness matters more than latency

Real-time sync is not required in phase 1 because the deployment target is a single-user, single-session-first workflow.

## Sample Data Strategy

The current app seeds sample words when the user has no data.

That behavior can be preserved on the backend:

- on first successful signup, create sample words and default settings

This is safer than doing it in the frontend because the backend owns user initialization.

## Static File Serving

FastAPI serves the Vite build output directly.

Recommended behavior:

- mount built assets from `dist/`
- return `dist/index.html` for non-API, non-upload routes

This keeps deployment to one backend process and removes the current Express dependency.

## Deployment Changes

The runtime process changes from Node/Express to Python/FastAPI.

### Recommended runtime

- `uvicorn` behind PM2 or systemd

Suggested PM2 command pattern:

- start FastAPI with `uvicorn backend.app.main:app --host 0.0.0.0 --port 3000`

### Build and deploy flow

Recommended deploy sequence:

1. install Python dependencies
2. create or update virtual environment
3. install frontend dependencies
4. build frontend to `dist/`
5. start or restart FastAPI process

## Environment Configuration

New environment variables should replace Firebase config.

Recommended variables:

- `APP_ENV`
- `SECRET_KEY`
- `DATABASE_URL` or SQLite file path
- `UPLOAD_DIR`
- `VITE_*` AI defaults only if still needed for local fallback

Firebase-specific variables should be removed from active runtime use.

## Testing Strategy

### Backend

Required automated coverage:

- signup success and duplicate email rejection
- login success and invalid credentials rejection
- authenticated route access control
- word CRUD
- folder CRUD
- settings read and update
- profile image upload validation

### Frontend

Minimum regression verification:

- signup and login
- add word
- create folder
- move word to folder
- update learning status
- save AI settings
- upload profile image
- reload page and confirm persistence

## Risks

### Data migration gap

Existing Firebase data will not automatically appear after cutover unless a migration script is created.

Mitigation:

- treat this as a fresh backend cutover
- add optional one-time importer later if needed

### Real-time behavior regression

The Firebase version uses live snapshot updates.

Mitigation:

- use explicit reload after mutations
- keep local optimistic state updates where easy

### Password reset regression

Firebase password reset mail will disappear in phase 1.

Mitigation:

- add authenticated password change immediately
- defer email reset until SMTP or transactional mail is chosen

### Local file handling

Profile image storage on disk introduces cleanup concerns.

Mitigation:

- centralize upload path logic
- delete replaced files
- use relative paths and file validation

## Phased Implementation Plan

### Phase 1

- create FastAPI backend skeleton
- add SQLite models and startup initialization
- implement auth and session handling
- implement words, folders, settings, and uploads APIs
- serve `dist/` from FastAPI

### Phase 2

- refactor React frontend to call backend APIs
- remove Firebase SDK usage
- remove Firebase setup screen dependency

### Phase 3

- switch deployment from Node server to FastAPI
- verify production startup and uploads path permissions

### Phase 4

- optional cleanup of leftover Firebase code and docs
- optional Firebase data import tooling

## Acceptance Criteria

The migration is complete when:

- the app starts without Firebase config
- users can sign up and log in with email and password
- words and folders persist in SQLite
- AI settings persist per user
- profile images upload to local disk and display correctly
- the built React app is served by FastAPI
- the production process no longer depends on Firebase services
