from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .common import (
    normalize_optional_text,
    to_camel,
    validate_json_object,
    validate_non_empty_text,
    validate_non_negative,
)

TOEFL_REVIEW_STATUSES = {"new", "reviewing", "mastered"}
TOEFL_REVIEW_RESULTS = {"correct", "wrong"}


class ToeflAssetBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    mode: str
    task_type: str | None = None
    title: str
    payload: dict[str, Any]
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("mode", "title")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return validate_non_empty_text(value)

    @field_validator("task_type", mode="before")
    @classmethod
    def normalize_optional_text_field(cls, value: object) -> object:
        return normalize_optional_text(value)

    @field_validator("payload")
    @classmethod
    def validate_payload(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_json_object(value)


class ToeflAssetCreate(ToeflAssetBase):
    pass


class ToeflAssetRead(ToeflAssetBase):
    id: int
    created_at: datetime
    updated_at: datetime


class ToeflAttemptBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    answers: dict[str, Any] = Field(default_factory=dict)
    results: dict[str, Any] = Field(default_factory=dict)
    correct_count: int = 0
    total_count: int = 0
    score: dict[str, Any] = Field(default_factory=dict)

    @field_validator("correct_count", "total_count")
    @classmethod
    def validate_counts(cls, value: int) -> int:
        return validate_non_negative(value)


class ToeflAttemptCreate(ToeflAttemptBase):
    pass


class ToeflAttemptRead(ToeflAttemptBase):
    id: int
    asset_id: int
    created_at: datetime


class ToeflReviewItemBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

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
        return validate_non_empty_text(value)

    @field_validator("task_type", "user_answer", "correct_answer", "explanation", "skill_tag", "last_result", mode="before")
    @classmethod
    def normalize_optional_review_text(cls, value: object) -> object:
        return normalize_optional_text(value)

    @field_validator("status")
    @classmethod
    def validate_review_status(cls, value: str) -> str:
        normalized = validate_non_empty_text(value)
        if normalized not in TOEFL_REVIEW_STATUSES:
            raise ValueError("must be new, reviewing, or mastered")
        return normalized

    @field_validator("review_count", "success_streak")
    @classmethod
    def validate_review_counts(cls, value: int) -> int:
        return validate_non_negative(value)


class ToeflReviewItemRead(ToeflReviewItemBase):
    id: int
    asset_id: int
    attempt_id: int
    created_at: datetime
    updated_at: datetime


class ToeflReviewItemUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    result: str | None = None
    status: str | None = None
    due_at: datetime | None = None

    @field_validator("result", mode="before")
    @classmethod
    def normalize_result(cls, value: object) -> object:
        return normalize_optional_text(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: object) -> object:
        return normalize_optional_text(value)

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
