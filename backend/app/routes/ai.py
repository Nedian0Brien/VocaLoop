from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..ai_contract import get_valid_models
from ..auth import get_current_user
from ..codex_cli import CODEX_PROVIDER, CodexError, run_codex_exec
from ..models import User
from ..schemas import AiGenerateResponse, CodexGenerateRequest


router = APIRouter(prefix="/api/ai", tags=["ai"])


def _build_codex_prompt(payload: CodexGenerateRequest) -> str:
    lines = [
        "You are the AI generation engine for VocaLoop, an English vocabulary and TOEFL study app.",
        "Answer the user's request directly.",
        "Do not inspect local files, run shell commands, browse the web, or mention implementation details.",
    ]
    if payload.json_output:
        lines.append("Return valid JSON only. Do not wrap the JSON in markdown fences or add prose.")

    return "\n".join(lines) + f"\n\nUSER REQUEST:\n{payload.prompt}"


@router.post("/codex", response_model=AiGenerateResponse)
def generate_with_codex(
    payload: CodexGenerateRequest,
    current_user: User = Depends(get_current_user),
) -> AiGenerateResponse:
    del current_user

    if payload.model not in get_valid_models(CODEX_PROVIDER):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid Codex model",
        )

    try:
        text = run_codex_exec(_build_codex_prompt(payload), model=payload.model)
    except CodexError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return AiGenerateResponse(text=text)
