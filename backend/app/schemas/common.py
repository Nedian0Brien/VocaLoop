from __future__ import annotations

import re
from typing import Any

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def validate_email(value: str) -> str:
    normalized = value.strip().lower()
    if not normalized or not EMAIL_RE.match(normalized):
        raise ValueError("must be a valid email address")
    return normalized


def validate_password(value: str) -> str:
    if not value or len(value) < 8:
        raise ValueError("must be at least 8 characters")
    if not re.search(r"[a-z]", value):
        raise ValueError("must include a lowercase letter")
    if not re.search(r"\d", value):
        raise ValueError("must include a digit")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("must include a symbol")
    return value


def validate_word_text(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("must not be empty")
    return normalized


def normalize_optional_text(value: object) -> object:
    if value is None:
        return value
    if not isinstance(value, str):
        return value
    normalized = value.strip()
    return normalized or None


def validate_non_negative(value: int) -> int:
    if value < 0:
        raise ValueError("must be greater than or equal to 0")
    return value


def validate_text_list(values: list[str]) -> list[str]:
    cleaned_values = [value.strip() for value in values]
    if any(not value for value in cleaned_values):
        raise ValueError("must not contain empty values")
    return cleaned_values


def validate_folder_id_list(value: list[int]) -> list[int]:
    if len(value) != len(set(value)):
        raise ValueError("must not contain duplicate folder ids")
    return value


def validate_stats_payload(value: object) -> object:
    if value is None:
        raise ValueError("must include wrong_count and review_count")
    if not isinstance(value, dict):
        raise ValueError("must be an object with wrong_count and review_count")
    if set(value.keys()) != {"wrong_count", "review_count"}:
        raise ValueError("must include wrong_count and review_count")
    return value


def validate_non_empty_text(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("must not be empty")
    return normalized


def validate_json_object(value: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict) or not value:
        raise ValueError("must be a non-empty object")
    return value
