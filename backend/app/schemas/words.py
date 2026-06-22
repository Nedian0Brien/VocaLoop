from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .common import (
    normalize_optional_text,
    validate_folder_id_list,
    validate_non_negative,
    validate_stats_payload,
    validate_text_list,
    validate_word_text,
)


class WordExample(BaseModel):
    model_config = ConfigDict(extra="forbid")

    en: str
    ko: str

    @field_validator("en", "ko")
    @classmethod
    def validate_example_text(cls, value: str) -> str:
        return validate_word_text(value)


class WordStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    wrong_count: int = 0
    review_count: int = 0

    @field_validator("wrong_count", "review_count")
    @classmethod
    def validate_counts(cls, value: int) -> int:
        return validate_non_negative(value)


class AcceptedAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: str
    answer: str
    source: str = "ai-review"
    feedback: str | None = None

    @field_validator("mode", "answer", "source")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return validate_word_text(value)

    @field_validator("feedback", mode="before")
    @classmethod
    def normalize_feedback(cls, value: object) -> object:
        return normalize_optional_text(value)


class WordCreate(BaseModel):
    word: str
    meaning_ko: str | None = None
    pronunciation: str | None = None
    pronunciation_audio_url: str | None = None
    pos: str | None = None
    definitions: list[str] = Field(default_factory=list)
    definitions_ko: list[str] = Field(default_factory=list)
    examples: list[WordExample] = Field(default_factory=list)
    synonyms: list[str] = Field(default_factory=list)
    nuance: str | None = None
    accepted_answers: list[AcceptedAnswer] = Field(default_factory=list)
    is_flagged: bool = False
    folder_id: int | None = None
    folder_ids: list[int] = Field(default_factory=list)
    learning_rate: int = 0
    status: str = "new"
    stats: WordStats = Field(default_factory=WordStats)

    @field_validator("word")
    @classmethod
    def validate_word(cls, value: str) -> str:
        return validate_word_text(value)

    @field_validator("meaning_ko", "pronunciation", "pronunciation_audio_url", "pos", "nuance", mode="before")
    @classmethod
    def normalize_optional_text_fields(cls, value: object) -> object:
        return normalize_optional_text(value)

    @field_validator("learning_rate")
    @classmethod
    def validate_learning_rate(cls, value: int) -> int:
        return validate_non_negative(value)

    @field_validator("definitions", "definitions_ko", "synonyms")
    @classmethod
    def validate_text_lists(cls, value: list[str]) -> list[str]:
        return validate_text_list(value)

    @field_validator("folder_ids")
    @classmethod
    def validate_folder_ids(cls, value: list[int]) -> list[int]:
        return validate_folder_id_list(value)

    @field_validator("stats", mode="before")
    @classmethod
    def validate_stats(cls, value: object) -> object:
        return validate_stats_payload(value)


class WordUpdate(BaseModel):
    word: str | None = None
    meaning_ko: str | None = None
    pronunciation: str | None = None
    pronunciation_audio_url: str | None = None
    pos: str | None = None
    definitions: list[str] | None = None
    definitions_ko: list[str] | None = None
    examples: list[WordExample] | None = None
    synonyms: list[str] | None = None
    nuance: str | None = None
    accepted_answers: list[AcceptedAnswer] | None = None
    is_flagged: bool | None = None
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
        return validate_word_text(value)

    @field_validator("meaning_ko", "pronunciation", "pronunciation_audio_url", "pos", "nuance", mode="before")
    @classmethod
    def normalize_optional_text_fields(cls, value: object) -> object:
        return normalize_optional_text(value)

    @field_validator("learning_rate")
    @classmethod
    def validate_learning_rate(cls, value: int | None) -> int | None:
        if value is None:
            return value
        return validate_non_negative(value)

    @field_validator("definitions", "definitions_ko", "synonyms")
    @classmethod
    def validate_text_lists(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        return validate_text_list(value)

    @field_validator("folder_ids")
    @classmethod
    def validate_folder_ids(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return value
        return validate_folder_id_list(value)

    @field_validator("stats", mode="before")
    @classmethod
    def validate_stats(cls, value: object) -> object:
        return validate_stats_payload(value)


class WordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    word: str
    meaning_ko: str | None = None
    pronunciation: str | None = None
    pronunciation_audio_url: str | None = None
    pos: str | None = None
    definitions: list[str]
    definitions_ko: list[str]
    examples: list[WordExample]
    synonyms: list[str]
    nuance: str | None = None
    accepted_answers: list[AcceptedAnswer] = Field(default_factory=list)
    is_flagged: bool = False
    folder_id: int | None = None
    folder_ids: list[int] = Field(default_factory=list)
    learning_rate: int
    status: str
    stats: WordStats
    created_at: datetime
    updated_at: datetime
