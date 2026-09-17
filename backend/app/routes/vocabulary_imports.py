from __future__ import annotations

import json
import re
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from ..auth import get_current_user
from ..codex_cli import CodexError, run_codex_exec
from ..config import load_settings
from ..image_uploads import save_validated_image_upload
from ..models import User
from ..schemas import ScreenshotVocabularyImportResponse


router = APIRouter(prefix="/api/vocabulary-imports", tags=["vocabulary-imports"])

MAX_EXTRACTED_WORDS = 100
ASCII_LETTER_PATTERN = re.compile(r"[A-Za-z]")

settings = load_settings()


def _build_screenshot_extraction_prompt() -> str:
    return "\n".join(
        [
            "You are reading a vocabulary-list screenshot for VocaLoop.",
            "Extract only English vocabulary words or short English vocabulary phrases visible in the image.",
            "Ignore numbering, checkboxes, Korean meanings, section headers, dates, page chrome, and decorative text.",
            "Preserve the visible order.",
            "Remove duplicates case-insensitively.",
            "Do not guess unclear text.",
            "Return JSON only with this shape:",
            '{"words":["abate","candid"],"suggested_folder_name":"TOEFL Vocabulary"}',
        ]
    )


def _normalize_text(value: object) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _normalize_words(values: object) -> list[str]:
    if not isinstance(values, list):
        return []

    seen = set()
    normalized_words: list[str] = []
    for value in values:
        word = _normalize_text(value)
        if not word or not ASCII_LETTER_PATTERN.search(word):
            continue
        key = word.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized_words.append(word)
        if len(normalized_words) >= MAX_EXTRACTED_WORDS:
            break

    return normalized_words


def _parse_extraction_output(text: str) -> ScreenshotVocabularyImportResponse:
    try:
        parsed: Any = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Codex returned invalid JSON.",
        ) from exc

    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Codex returned invalid JSON.",
        )

    words = _normalize_words(parsed.get("words"))
    if not words:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No words found in the image",
        )

    return ScreenshotVocabularyImportResponse(
        words=words,
        suggested_folder_name=_normalize_text(parsed.get("suggested_folder_name")),
    )


@router.post("/screenshot/extract", response_model=ScreenshotVocabularyImportResponse)
async def extract_screenshot_vocabulary(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> ScreenshotVocabularyImportResponse:
    del current_user

    with tempfile.TemporaryDirectory(prefix="vocaloop-screenshot-import-") as codex_cwd:
        codex_cwd_path = Path(codex_cwd)
        image_path = codex_cwd_path / "source-image"
        extension = await save_validated_image_upload(
            file,
            image_path,
            max_size=settings.max_profile_image_size,
            invalid_content_type_detail="File must be an image",
            invalid_signature_detail="File must be a supported raster image",
            too_large_detail="File must be 5 MB or smaller",
        )
        final_image_path = image_path.with_suffix(extension)
        image_path.rename(final_image_path)

        try:
            # subprocess.run은 블로킹이라 스레드풀에서 돌린다. 이벤트 루프를 3분 막지 않는다.
            text = await run_in_threadpool(
                run_codex_exec,
                _build_screenshot_extraction_prompt(),
                image_path=final_image_path,
                cwd=codex_cwd_path,
            )
        except CodexError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

        return _parse_extraction_output(text)
