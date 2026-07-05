<div align="center">

# VocaLoop

**An AI-assisted vocabulary learning app with adaptive review loops**

![React 19](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)

[한국어](./README.md)

</div>

---

## Overview

VocaLoop is a personal vocabulary app that lets users add English words, enrich them with AI-generated meaning data, and review them through a learning loop and quizzes.

The repository contains both the React/Vite frontend and the FastAPI backend. The backend owns account, word, folder, TOEFL, upload, and screenshot vocabulary import APIs, and also serves the built frontend assets in production.

## Highlights

| Area | Description |
|---|---|
| AI word enrichment | Generates Korean meanings, pronunciation, definitions, examples, and related vocabulary for saved words. |
| Adaptive learning loop | Keeps review state and wrong-answer history so study sessions can adapt over time. |
| Quiz modes | Supports multiple-choice, short-answer, cloze, and TOEFL-oriented quiz flows. |
| Screenshot import | Extracts candidate words from vocabulary-list images, lets the user review them, then reuses the bulk-add save path. |
| Single deployable service | FastAPI serves both API routes and the built Vite frontend. |

## Repository Structure

| Path | Role |
|---|---|
| src/ | React frontend source, hooks, components, services, quiz flows |
| backend/app/ | FastAPI app, routers, database bootstrap, settings, upload and AI routes |
| docs/ | Design notes, feature specs, troubleshooting reports, implementation plans |
| shared/ | Shared provider metadata and cross-runtime configuration |
| public/ | Static assets and dictionary data |

## Quick Start

### Install dependencies

```bash
npm install
```

### Install backend dependencies

```bash
python3 -m venv backend/.venv && source backend/.venv/bin/activate && pip install -r backend/requirements.txt
```

### Run frontend dev server

```bash
npm run dev
```

### Run backend/API server

```bash
npm run start
```

### Build frontend assets

```bash
npm run build
```

## Verification

| Check | Command |
|---|---|
| Frontend/unit tests | `npm test` |
| Frontend build | `npm run build` |
| Backend tests | `pytest backend/tests -q` |
| Health check | `curl http://localhost:3050/api/health` |

## Operational Notes

- The production PM2 process name is `voca-loop`.
- The service listens on port `3050`; `ecosystem.config.cjs` defines `CODEX_BIN`, `PIPER_*`, and timeout environment variables.
- Screenshot extraction is designed to require user review before creating database records.

## Documentation Sources

This README was written from the following files and documents in this repository.

- `package.json`
- `backend/requirements.txt`
- `backend/app/main.py`
- `docs/plan/Specification.md`
- `docs/superpowers/specs/2026-06-19-screenshot-vocabulary-import-design.md`
- `ecosystem.config.cjs`
