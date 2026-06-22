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
