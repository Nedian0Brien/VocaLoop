from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .common import to_camel


class CodexGenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

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


class ScreenshotVocabularyImportResponse(BaseModel):
    words: list[str]
    suggested_folder_name: str | None = None


# --- VocaLoop AI 대화 -----------------------------------------------------------
#
# 단어·폴더 API처럼 snake_case 를 그대로 쓴다 (스크린샷 추출 응답과 같다).

AI_IMPORT_BATCH_STATUSES = ("saved", "cancelled")
MAX_CONVERSATION_TITLE_LENGTH = 80


class AiConversationCreate(BaseModel):
    title: str | None = None

    @field_validator("title", mode="before")
    @classmethod
    def normalize_title(cls, value: object) -> object:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized[:MAX_CONVERSATION_TITLE_LENGTH] or None


class AiConversationUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_CONVERSATION_TITLE_LENGTH)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("must not be empty")
        return normalized


class AiConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    # 마지막 메시지의 kind(text | file_import). 목록에서 대화 종류 아이콘을 고르는 데 쓴다. 메시지가 없으면 None.
    last_kind: str | None = None
    created_at: datetime
    updated_at: datetime


class AiMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    role: str
    kind: str
    content: str
    payload: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime


class AiMessageSendResponse(BaseModel):
    conversation: AiConversationRead
    messages: list[AiMessageRead]


class AiImportSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    created: int = 0
    assigned: int = 0
    skipped: int = 0
    failed: int = 0
    failed_words: list[str] = Field(default_factory=list)

    @field_validator("created", "assigned", "skipped", "failed")
    @classmethod
    def validate_counts(cls, value: int) -> int:
        if value < 0:
            raise ValueError("must be greater than or equal to 0")
        return value


class AiImportBatchResult(BaseModel):
    """클라이언트가 배치 하나를 저장·취소한 뒤 보내는 기록."""

    model_config = ConfigDict(extra="forbid")

    batch_index: int = Field(ge=0)
    status: str
    folder_id: int | None = None
    folder_name: str | None = None
    summary: AiImportSummary | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in AI_IMPORT_BATCH_STATUSES:
            raise ValueError("must be one of: " + ", ".join(AI_IMPORT_BATCH_STATUSES))
        return value

    @field_validator("folder_name", mode="before")
    @classmethod
    def normalize_folder_name(cls, value: object) -> object:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None
