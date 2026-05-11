from __future__ import annotations

import re
from datetime import datetime

from pydantic import Field
from pydantic import BaseModel, ConfigDict
from pydantic import field_validator


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(value: str) -> str:
    normalized = value.strip().lower()
    if not normalized or not EMAIL_RE.match(normalized):
        raise ValueError("must be a valid email address")
    return normalized


def _validate_password(value: str) -> str:
    if not value or len(value) < 8:
        raise ValueError("must be at least 8 characters")
    if not re.search(r"[a-z]", value):
        raise ValueError("must include a lowercase letter")
    if not re.search(r"\d", value):
        raise ValueError("must include a digit")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("must include a symbol")
    return value


def _validate_word_text(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("must not be empty")
    return normalized


def _normalize_optional_word_text(value: object) -> object:
    if value is None:
        return value
    if not isinstance(value, str):
        return value
    normalized = value.strip()
    return normalized or None


def _validate_non_negative(value: int) -> int:
    if value < 0:
        raise ValueError("must be greater than or equal to 0")
    return value


def _validate_folder_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("must not be empty")
    return normalized


def _to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def _normalize_optional_folder_text(value: object) -> object:
    if value is None:
        return value
    if not isinstance(value, str):
        return value
    normalized = value.strip()
    return normalized or None


def _validate_stats_payload(value: object) -> object:
    if value is None:
        raise ValueError("must include wrong_count and review_count")
    if not isinstance(value, dict):
        raise ValueError("must be an object with wrong_count and review_count")
    if set(value.keys()) != {"wrong_count", "review_count"}:
        raise ValueError("must include wrong_count and review_count")
    return value


def _validate_text_list(values: list[str]) -> list[str]:
    cleaned_values = [value.strip() for value in values]
    if any(not value for value in cleaned_values):
        raise ValueError("must not contain empty values")
    return cleaned_values


class SignupRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _validate_email(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _validate_email(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if value == "":
            raise ValueError("must not be empty")
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str | None = None
    photo_url: str | None = None


class AuthResponse(BaseModel):
    user: UserRead


class AccountDeleteRequest(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value:
            raise ValueError("must not be empty")
        return value


class SettingsBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    display_name: str | None = None
    toefl_target: int | None = None
    provider: str | None = None
    model: str | None = None
    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    claude_api_key: str | None = None

    @field_validator("display_name", "gemini_api_key", "openai_api_key", "claude_api_key", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_folder_text(value)

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


class FolderCreate(BaseModel):
    name: str
    color: str | None = None
    icon: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _validate_folder_name(value)

    @field_validator("color", "icon", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_folder_text(value)


class FolderUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _validate_folder_name(value)

    @field_validator("color", "icon", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_folder_text(value)


class FolderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str | None = None
    icon: str | None = None
    order: int
    created_at: datetime
    updated_at: datetime


class FolderReorderRequest(BaseModel):
    folder_ids: list[int] = Field(default_factory=list)

    @field_validator("folder_ids")
    @classmethod
    def validate_folder_ids(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("must not contain duplicate folder ids")
        return value


class WordExample(BaseModel):
    model_config = ConfigDict(extra="forbid")

    en: str
    ko: str

    @field_validator("en", "ko")
    @classmethod
    def validate_example_text(cls, value: str) -> str:
        return _validate_word_text(value)


class WordStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    wrong_count: int = 0
    review_count: int = 0

    @field_validator("wrong_count", "review_count")
    @classmethod
    def validate_counts(cls, value: int) -> int:
        return _validate_non_negative(value)


class WordCreate(BaseModel):
    word: str
    meaning_ko: str | None = None
    pronunciation: str | None = None
    pos: str | None = None
    definitions: list[str] = Field(default_factory=list)
    definitions_ko: list[str] = Field(default_factory=list)
    examples: list[WordExample] = Field(default_factory=list)
    synonyms: list[str] = Field(default_factory=list)
    nuance: str | None = None
    folder_id: int | None = None
    learning_rate: int = 0
    status: str = "new"
    stats: WordStats = Field(default_factory=WordStats)

    @field_validator("word")
    @classmethod
    def validate_word(cls, value: str) -> str:
        return _validate_word_text(value)

    @field_validator("meaning_ko", "pronunciation", "pos", "nuance", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_word_text(value)

    @field_validator("learning_rate")
    @classmethod
    def validate_learning_rate(cls, value: int) -> int:
        return _validate_non_negative(value)

    @field_validator("definitions", "definitions_ko", "synonyms")
    @classmethod
    def validate_text_lists(cls, value: list[str]) -> list[str]:
        return _validate_text_list(value)

    @field_validator("stats", mode="before")
    @classmethod
    def validate_stats(cls, value: object) -> object:
        return _validate_stats_payload(value)


class WordUpdate(BaseModel):
    word: str | None = None
    meaning_ko: str | None = None
    pronunciation: str | None = None
    pos: str | None = None
    definitions: list[str] | None = None
    definitions_ko: list[str] | None = None
    examples: list[WordExample] | None = None
    synonyms: list[str] | None = None
    nuance: str | None = None
    folder_id: int | None = None
    learning_rate: int | None = None
    status: str | None = None
    stats: WordStats | None = None

    @field_validator("word")
    @classmethod
    def validate_word(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _validate_word_text(value)

    @field_validator("meaning_ko", "pronunciation", "pos", "nuance", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_word_text(value)

    @field_validator("learning_rate")
    @classmethod
    def validate_learning_rate(cls, value: int | None) -> int | None:
        if value is None:
            return value
        return _validate_non_negative(value)

    @field_validator("definitions", "definitions_ko", "synonyms")
    @classmethod
    def validate_text_lists(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        return _validate_text_list(value)

    @field_validator("stats", mode="before")
    @classmethod
    def validate_stats(cls, value: object) -> object:
        return _validate_stats_payload(value)


class WordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    word: str
    meaning_ko: str | None = None
    pronunciation: str | None = None
    pos: str | None = None
    definitions: list[str]
    definitions_ko: list[str]
    examples: list[WordExample]
    synonyms: list[str]
    nuance: str | None = None
    folder_id: int | None = None
    learning_rate: int
    status: str
    stats: WordStats
    created_at: datetime
    updated_at: datetime
