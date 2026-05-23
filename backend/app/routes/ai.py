from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from ..ai_contract import get_valid_models
from ..auth import get_current_user
from ..models import User
from ..schemas import AiGenerateResponse, CodexGenerateRequest


router = APIRouter(prefix="/api/ai", tags=["ai"])

CODEX_PROVIDER = "codex"
DEFAULT_CODEX_TIMEOUT_SECONDS = 180


def _get_codex_timeout_seconds() -> int:
    raw_value = os.getenv("CODEX_CLI_TIMEOUT_SECONDS", str(DEFAULT_CODEX_TIMEOUT_SECONDS))
    try:
        value = int(raw_value)
    except ValueError:
        return DEFAULT_CODEX_TIMEOUT_SECONDS
    return max(10, value)


def _build_codex_prompt(payload: CodexGenerateRequest) -> str:
    lines = [
        "You are the AI generation engine for VocaLoop, an English vocabulary and TOEFL study app.",
        "Answer the user's request directly.",
        "Do not inspect local files, run shell commands, browse the web, or mention implementation details.",
    ]
    if payload.json_output:
        lines.append("Return valid JSON only. Do not wrap the JSON in markdown fences or add prose.")

    return "\n".join(lines) + f"\n\nUSER REQUEST:\n{payload.prompt}"


def _format_cli_error(error: subprocess.CalledProcessError | subprocess.CompletedProcess) -> str:
    stderr = (getattr(error, "stderr", "") or "").strip()
    stdout = (getattr(error, "stdout", "") or "").strip()
    detail = stderr or stdout or "Codex CLI exited without an error message."
    return detail[:1200]


@router.post("/codex", response_model=AiGenerateResponse)
def generate_with_codex(
    payload: CodexGenerateRequest,
    current_user: User = Depends(get_current_user),
) -> AiGenerateResponse:
    del current_user

    if payload.model not in get_valid_models(CODEX_PROVIDER):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid Codex model",
        )

    codex_bin = os.getenv("CODEX_BIN", "codex")
    timeout_seconds = _get_codex_timeout_seconds()
    prompt = _build_codex_prompt(payload)

    with tempfile.TemporaryDirectory(prefix="vocaloop-codex-") as codex_cwd:
        output_path = Path(codex_cwd) / "last-message.txt"
        command = [
            codex_bin,
            "exec",
            "--json",
            "--ephemeral",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "--cd",
            codex_cwd,
            "-m",
            payload.model,
            "--output-last-message",
            str(output_path),
            "-",
        ]

        try:
            result = subprocess.run(
                command,
                input=prompt,
                text=True,
                capture_output=True,
                timeout=timeout_seconds,
                check=False,
                cwd=codex_cwd,
                env=os.environ.copy(),
            )
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Codex CLI is not installed or not available on PATH.",
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Codex CLI timed out after {timeout_seconds} seconds.",
            ) from exc

        if result.returncode != 0:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=_format_cli_error(result),
            )

        text = output_path.read_text(encoding="utf-8").strip() if output_path.exists() else ""
        if not text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Codex CLI completed without a final message.",
            )

        return AiGenerateResponse(text=text)
