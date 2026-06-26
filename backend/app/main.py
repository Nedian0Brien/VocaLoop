from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import load_settings
from .db import bootstrap_db
from .routes import (
    account_router,
    ai_router,
    auth_router,
    folders_router,
    settings_router,
    toefl_router,
    uploads_router,
    vocabulary_imports_router,
    words_router,
)


settings = load_settings()
settings.uploads_root.mkdir(parents=True, exist_ok=True)
frontend_root = Path(__file__).resolve().parents[2] / "dist"
frontend_root_resolved = frontend_root.resolve()
frontend_index = frontend_root / "index.html"
FRONTEND_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable"
FRONTEND_HTML_CACHE_CONTROL = "no-cache"


@asynccontextmanager
async def lifespan(_: FastAPI):
    bootstrap_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.mount("/uploads", StaticFiles(directory=settings.uploads_root), name="uploads")
app.include_router(account_router)
app.include_router(ai_router)
app.include_router(auth_router)
app.include_router(folders_router)
app.include_router(settings_router)
app.include_router(toefl_router)
app.include_router(uploads_router)
app.include_router(vocabulary_imports_router)
app.include_router(words_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _is_reserved_path(path: str) -> bool:
    first_segment = path.split("/", 1)[0]
    return first_segment in {"api", "uploads"}


def _resolve_frontend_path(path: str) -> Path | None:
    candidate = (frontend_root / path).resolve()
    try:
        candidate.relative_to(frontend_root_resolved)
    except ValueError:
        return None
    return candidate


def _is_static_looking_path(path: str) -> bool:
    if not path:
        return False

    first_segment = path.split("/", 1)[0]
    return first_segment == "assets" or Path(path).suffix != ""


def _frontend_file_response(file_path: Path, *, cache_control: str) -> FileResponse:
    return FileResponse(file_path, headers={"Cache-Control": cache_control})


@app.api_route("/", methods=["GET", "HEAD"])
@app.api_route("/{path:path}", methods=["GET", "HEAD"])
def serve_frontend(path: str = ""):
    if _is_reserved_path(path):
        raise HTTPException(status_code=404, detail="Not Found")

    if path:
        file_path = _resolve_frontend_path(path)
        if file_path is None:
            raise HTTPException(status_code=404, detail="Not Found")

        if file_path.is_file():
            cache_control = (
                FRONTEND_ASSET_CACHE_CONTROL
                if path.split("/", 1)[0] == "assets"
                else FRONTEND_HTML_CACHE_CONTROL
            )
            return _frontend_file_response(file_path, cache_control=cache_control)

        if _is_static_looking_path(path):
            raise HTTPException(status_code=404, detail="Not Found")

    if frontend_index.is_file():
        resolved_index = frontend_index.resolve()
        try:
            resolved_index.relative_to(frontend_root_resolved)
        except ValueError:
            raise HTTPException(status_code=404, detail="Not Found")
        return _frontend_file_response(resolved_index, cache_control=FRONTEND_HTML_CACHE_CONTROL)

    raise HTTPException(status_code=404, detail="Not Found")
