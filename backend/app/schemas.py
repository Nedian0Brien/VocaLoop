from __future__ import annotations

import re
from datetime import datetime
from typing import Any

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


def _validate_folder_id_list(value: list[int]) -> list[int]:
    if len(value) != len(set(value)):
        raise ValueError("must not contain duplicate folder ids")
    return value


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


class CodexGenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    model: str
    prompt: str = Field(min_length=1, max_length=50000)
    json_output: bool = False

    @field_validator("model", "prompt")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("must not be empty")
        return normalized


class AiGenerateResponse(BaseModel):
    text: str


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


class AcceptedAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: str
    answer: str
    source: str = "ai-review"
    feedback: str | None = None

    @field_validator("mode", "answer", "source")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return _validate_word_text(value)

    @field_validator("feedback", mode="before")
    @classmethod
    def normalize_feedback(cls, value: object) -> object:
        return _normalize_optional_word_text(value)


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
    accepted_answers: list[AcceptedAnswer] = Field(default_factory=list)
    folder_id: int | None = None
    folder_ids: list[int] = Field(default_factory=list)
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

    @field_validator("folder_ids")
    @classmethod
    def validate_folder_ids(cls, value: list[int]) -> list[int]:
        return _validate_folder_id_list(value)

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
    accepted_answers: list[AcceptedAnswer] | None = None
    folder_id: int | None = None
    folder_ids: list[int] | None = None
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

    @field_validator("folder_ids")
    @classmethod
    def validate_folder_ids(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return value
        return _validate_folder_id_list(value)

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
    accepted_answers: list[AcceptedAnswer] = Field(default_factory=list)
    folder_id: int | None = None
    folder_ids: list[int] = Field(default_factory=list)
    learning_rate: int
    status: str
    stats: WordStats
    created_at: datetime
    updated_at: datetime


def _validate_non_empty_text(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("must not be empty")
    return normalized


def _validate_json_object(value: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict) or not value:
        raise ValueError("must be a non-empty object")
    return value


class ToeflAssetBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    mode: str
    task_type: str | None = None
    title: str
    payload: dict[str, Any]
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("mode", "title")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return _validate_non_empty_text(value)

    @field_validator("task_type", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        return _normalize_optional_word_text(value)

    @field_validator("payload")
    @classmethod
    def validate_payload(cls, value: dict[str, Any]) -> dict[str, Any]:
        return _validate_json_object(value)


class ToeflAssetCreate(ToeflAssetBase):
    pass


class ToeflAssetRead(ToeflAssetBase):
    id: int
    created_at: datetime
    updated_at: datetime


class ToeflAttemptBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    answers: dict[str, Any] = Field(default_factory=dict)
    results: dict[str, Any] = Field(default_factory=dict)
    correct_count: int = 0
    total_count: int = 0
    score: dict[str, Any] = Field(default_factory=dict)

    @field_validator("correct_count", "total_count")
    @classmethod
    def validate_counts(cls, value: int) -> int:
        return _validate_non_negative(value)


class ToeflAttemptCreate(ToeflAttemptBase):
    pass


class ToeflAttemptRead(ToeflAttemptBase):
    id: int
    asset_id: int
    created_at: datetime


TOEFL_REVIEW_STATUSES = {"new", "reviewing", "mastered"}
TOEFL_REVIEW_RESULTS = {"correct", "wrong"}


class ToeflReviewItemBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    mode: str
    task_type: str | None = None
    item_key: str
    title: str
    prompt: str = ""
    user_answer: str | None = None
    correct_answer: str | None = None
    explanation: str | None = None
    source_snapshot: dict[str, Any] = Field(default_factory=dict)
    skill_tag: str | None = None
    topic_tags: list[str] = Field(default_factory=list)
    status: str = "new"
    due_at: datetime
    review_count: int = 0
    success_streak: int = 0
    last_result: str | None = None

    @field_validator("mode", "item_key", "title")
    @classmethod
    def validate_required_review_text(cls, value: str) -> str:
        return _validate_non_empty_text(value)

    @field_validator("task_type", "user_answer", "correct_answer", "explanation", "skill_tag", "last_result", mode="before")
    @classmethod
    def normalize_optional_review_text(cls, value: object) -> object:
        return _normalize_optional_word_text(value)

    @field_validator("status")
    @classmethod
    def validate_review_status(cls, value: str) -> str:
        normalized = _validate_non_empty_text(value)
        if normalized not in TOEFL_REVIEW_STATUSES:
            raise ValueError("must be new, reviewing, or mastered")
        return normalized

    @field_validator("review_count", "success_streak")
    @classmethod
    def validate_review_counts(cls, value: int) -> int:
        return _validate_non_negative(value)


class ToeflReviewItemRead(ToeflReviewItemBase):
    id: int
    asset_id: int
    attempt_id: int
    created_at: datetime
    updated_at: datetime


class ToeflReviewItemUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_to_camel)

    result: str | None = None
    status: str | None = None
    due_at: datetime | None = None

    @field_validator("result", mode="before")
    @classmethod
    def normalize_result(cls, value: object) -> object:
        return _normalize_optional_word_text(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: object) -> object:
        return _normalize_optional_word_text(value)

    @field_validator("result")
    @classmethod
    def validate_result(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in TOEFL_REVIEW_RESULTS:
            raise ValueError("must be correct or wrong")
        return value

    @field_validator("status")
    @classmethod
    def validate_optional_review_status(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in TOEFL_REVIEW_STATUSES:
            raise ValueError("must be new, reviewing, or mastered")
        return value
