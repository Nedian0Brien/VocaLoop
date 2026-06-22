from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .common import normalize_optional_text, validate_word_text


class FolderCreate(BaseModel):
    name: str
    color: str | None = None
    icon: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return validate_word_text(value)

    @field_validator("color", "icon", mode="before")
    @classmethod
    def normalize_optional_text_fields(cls, value: object) -> object:
        return normalize_optional_text(value)


class FolderUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_word_text(value)

    @field_validator("color", "icon", mode="before")
    @classmethod
    def normalize_optional_text_fields(cls, value: object) -> object:
        return normalize_optional_text(value)


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
