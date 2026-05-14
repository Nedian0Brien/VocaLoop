from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai_contract import (
    get_default_model,
    get_default_provider,
    get_public_ai_provider_contract,
    get_valid_models,
)
from ..auth import get_current_user, get_db
from ..models import User, UserSettings
from ..schemas import SettingsRead, SettingsUpdate


router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_or_create_owned_settings(db: Session, current_user: User) -> tuple[UserSettings, bool]:
    settings = db.scalar(select(UserSettings).where(UserSettings.user_id == current_user.id))
    if settings is None:
        settings = UserSettings(
            user_id=current_user.id,
            ai_provider=get_default_provider(),
            ai_model=get_default_model(),
        )
        db.add(settings)
        return settings, True
    return settings, False


def _safe_default_model(provider: str) -> str:
    try:
        return get_default_model(provider)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid provider/model combination",
        ) from exc


def _validate_provider_model(provider: str, model: str) -> None:
    if model not in get_valid_models(provider):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid provider/model combination",
        )


def _build_settings_response(current_user: User, settings: UserSettings) -> SettingsRead:
    return SettingsRead(
        display_name=current_user.display_name,
        toefl_target=settings.toefl_target,
        provider=settings.ai_provider,
        model=settings.ai_model,
        gemini_api_key=settings.gemini_api_key,
        openai_api_key=settings.openai_api_key,
        claude_api_key=settings.claude_api_key,
    )


@router.get("/providers")
def get_settings_providers() -> dict:
    return get_public_ai_provider_contract()


@router.get("", response_model=SettingsRead, response_model_by_alias=True)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SettingsRead:
    settings, created = _get_or_create_owned_settings(db, current_user)
    if created:
        db.commit()
        db.refresh(settings)
    return _build_settings_response(current_user, settings)


@router.put("", response_model=SettingsRead, response_model_by_alias=True)
def update_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SettingsRead:
    settings, _ = _get_or_create_owned_settings(db, current_user)
    updates = payload.model_dump(exclude_unset=True)

    next_display_name = updates.get("display_name", current_user.display_name)
    next_toefl_target = updates.get("toefl_target", settings.toefl_target)
    next_provider = updates.get("provider", settings.ai_provider)
    if "model" in updates:
        next_model = updates["model"]
    elif "provider" in updates and next_provider != settings.ai_provider:
        next_model = _safe_default_model(next_provider)
    else:
        next_model = settings.ai_model

    _validate_provider_model(next_provider, next_model)

    current_user.display_name = next_display_name
    settings.toefl_target = next_toefl_target
    settings.ai_provider = next_provider
    settings.ai_model = next_model

    if "gemini_api_key" in updates:
        settings.gemini_api_key = updates["gemini_api_key"]
    if "openai_api_key" in updates:
        settings.openai_api_key = updates["openai_api_key"]
    if "claude_api_key" in updates:
        settings.claude_api_key = updates["claude_api_key"]

    db.add(current_user)
    db.add(settings)
    db.commit()
    db.refresh(current_user)
    db.refresh(settings)
    return _build_settings_response(current_user, settings)
