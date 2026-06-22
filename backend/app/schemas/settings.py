from pydantic import BaseModel, ConfigDict, field_validator

from .common import normalize_optional_text, to_camel


class SettingsBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    display_name: str | None = None
    toefl_target: int | None = None
    provider: str | None = None
    model: str | None = None
    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    claude_api_key: str | None = None

    @field_validator("display_name", "gemini_api_key", "openai_api_key", "claude_api_key", mode="before")
    @classmethod
    def normalize_optional_text_fields(cls, value: object) -> object:
        return normalize_optional_text(value)

    @field_validator("toefl_target", mode="before")
    @classmethod
    def normalize_optional_toefl_target(cls, value: object) -> object:
        if value is None:
            return value
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return None
        return value

    @field_validator("toefl_target")
    @classmethod
    def validate_toefl_target(cls, value: int | None) -> int | None:
        if value is None:
            return value
        if value < 0 or value > 120:
            raise ValueError("must be between 0 and 120")
        return value


class SettingsRead(SettingsBase):
    provider: str
    model: str


class SettingsUpdate(SettingsBase):
    pass
