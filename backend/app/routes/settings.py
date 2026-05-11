from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import User, UserSettings
from ..schemas import SettingsRead, SettingsUpdate


router = APIRouter(prefix="/api/settings", tags=["settings"])

_DEFAULT_PROVIDER = "gemini"
_DEFAULT_MODELS = {
    "gemini": "gemini-2.0-flash",
    "openai": "gpt-4.1",
    "claude": "claude-3-5-sonnet-latest",
}
_VALID_AI_MODELS = {
    "gemini": {
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-3-pro-preview",
        "gemini-2.0-flash",
    },
    "openai": {
        "gpt-4.1",
        "gpt-4o-mini",
        "gpt-4.1-mini",
    },
    "claude": {
        "claude-3-5-sonnet-latest",
        "claude-3-5-sonnet-20241022",
        "claude-3-opus-20240229",
        "claude-3-haiku-20240307",
    },
}


def _get_or_create_owned_settings(db: Session, current_user: User) -> tuple[UserSettings, bool]:
    settings = db.scalar(select(UserSettings).where(UserSettings.user_id == current_user.id))
    if settings is None:
        settings = UserSettings(
            user_id=current_user.id,
            ai_provider=_DEFAULT_PROVIDER,
            ai_model=_DEFAULT_MODELS[_DEFAULT_PROVIDER],
        )
        db.add(settings)
        return settings, True
    return settings, False


def _get_default_model(provider: str) -> str:
    default_model = _DEFAULT_MODELS.get(provider)
    if default_model is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid provider/model combination",
        )
    return default_model


def _validate_provider_model(provider: str, model: str) -> None:
    valid_models = _VALID_AI_MODELS.get(provider)
    if valid_models is None or model not in valid_models:
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
        next_model = _get_default_model(next_provider)
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
