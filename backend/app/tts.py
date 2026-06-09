from __future__ import annotations

import hashlib
import re
import shutil
import subprocess
from pathlib import Path

from .config import load_settings


settings = load_settings()
TTS_WORDS_DIR = settings.uploads_root / "tts" / "words"


def _slugify_word(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.strip().lower())
    return slug.strip("-") or "word"


def _audio_url_for_path(path: Path) -> str:
    relative_path = path.relative_to(settings.uploads_root)
    return f"/uploads/{relative_path.as_posix()}"


def generate_word_audio(word_text: str) -> str | None:
    text = word_text.strip()
    if not text or settings.piper_voice_model is None:
        return None

    piper_bin = shutil.which(settings.piper_bin)
    if piper_bin is None or not settings.piper_voice_model.is_file():
        return None

    TTS_WORDS_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(text.lower().encode("utf-8")).hexdigest()[:16]
    output_path = TTS_WORDS_DIR / f"{_slugify_word(text)}-{digest}.wav"
    if output_path.is_file():
        return _audio_url_for_path(output_path)

    temp_path = output_path.with_suffix(".tmp.wav")
    command = [
        piper_bin,
        "--model",
        str(settings.piper_voice_model),
        "--output_file",
        str(temp_path),
    ]
    if settings.piper_voice_config is not None:
        command.extend(["--config", str(settings.piper_voice_config)])

    try:
        subprocess.run(
            command,
            input=f"{text}\n",
            text=True,
            check=True,
            capture_output=True,
            timeout=settings.piper_timeout_seconds,
        )
        temp_path.replace(output_path)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        temp_path.unlink(missing_ok=True)
        return None

    return _audio_url_for_path(output_path)
