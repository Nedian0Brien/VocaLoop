from __future__ import annotations

import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from .ai_contract import get_default_model


CODEX_PROVIDER = "codex"
DEFAULT_CODEX_TIMEOUT_SECONDS = 180


@dataclass(frozen=True)
class CodexError(Exception):
    """Codex CLI 호출 실패. 라우트는 `status_code`/`detail`을 HTTPException으로 옮긴다."""

    status_code: int
    detail: str

    def __str__(self) -> str:
        return self.detail


def get_codex_timeout_seconds() -> int:
    raw_value = os.getenv("CODEX_CLI_TIMEOUT_SECONDS", str(DEFAULT_CODEX_TIMEOUT_SECONDS))
    try:
        value = int(raw_value)
    except ValueError:
        return DEFAULT_CODEX_TIMEOUT_SECONDS
    return max(10, value)


def format_cli_error(error: subprocess.CalledProcessError | subprocess.CompletedProcess) -> str:
    stderr = (getattr(error, "stderr", "") or "").strip()
    stdout = (getattr(error, "stdout", "") or "").strip()
    detail = stderr or stdout or "Codex CLI exited without an error message."
    return detail[:1200]


def run_codex_exec(
    prompt: str,
    *,
    model: str | None = None,
    image_path: Path | None = None,
    cwd: Path | None = None,
    timeout_seconds: int | None = None,
) -> str:
    """`codex exec`를 한 번 돌리고 마지막 메시지 본문을 돌려준다.

    작업 디렉터리를 주지 않으면 빈 임시 디렉터리를 만들어 read-only 샌드박스로 쓴다.
    `image_path`를 주면 `--image`로 붙인다 (경로는 `cwd` 안에 있어야 샌드박스가 읽는다).
    """
    codex_bin = os.getenv("CODEX_BIN", "codex")
    resolved_timeout = timeout_seconds or get_codex_timeout_seconds()

    with tempfile.TemporaryDirectory(prefix="vocaloop-codex-") as scratch_dir:
        work_dir = cwd or Path(scratch_dir)
        output_path = work_dir / "last-message.txt"
        command = [
            codex_bin,
            "exec",
            "--json",
            "--ephemeral",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "--cd",
            str(work_dir),
        ]
        if image_path is not None:
            command.extend(["--image", str(image_path)])
        command.extend(
            [
                "-m",
                model or get_default_model(CODEX_PROVIDER),
                "--output-last-message",
                str(output_path),
                "-",
            ]
        )

        try:
            result = subprocess.run(
                command,
                input=prompt,
                text=True,
                capture_output=True,
                timeout=resolved_timeout,
                check=False,
                cwd=str(work_dir),
                env=os.environ.copy(),
            )
        except FileNotFoundError as exc:
            raise CodexError(503, "Codex CLI is not installed or not available on PATH.") from exc
        except subprocess.TimeoutExpired as exc:
            raise CodexError(504, f"Codex CLI timed out after {resolved_timeout} seconds.") from exc

        if result.returncode != 0:
            raise CodexError(502, format_cli_error(result))

        text = output_path.read_text(encoding="utf-8").strip() if output_path.exists() else ""
        if not text:
            raise CodexError(502, "Codex CLI completed without a final message.")

        return text
