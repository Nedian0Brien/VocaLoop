from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


_CONTRACT_PATH = Path(__file__).resolve().parents[2] / "shared" / "aiProviders.json"


@lru_cache(maxsize=1)
def load_ai_provider_contract() -> dict[str, Any]:
    with _CONTRACT_PATH.open("r", encoding="utf-8") as contract_file:
        return json.load(contract_file)


def get_ai_providers() -> dict[str, dict[str, Any]]:
    return load_ai_provider_contract()["providers"]


def get_default_provider() -> str:
    return load_ai_provider_contract()["defaultProvider"]


def get_default_model(provider: str | None = None) -> str:
    providers = get_ai_providers()
    provider_id = provider or get_default_provider()
    provider_config = providers.get(provider_id)
    if provider_config is None:
        raise KeyError(provider_id)
    return provider_config["defaultModel"]


def get_valid_models(provider: str) -> set[str]:
    provider_config = get_ai_providers().get(provider)
    if provider_config is None:
        return set()
    return set(provider_config.get("models", [])) | set(provider_config.get("legacyModels", []))


def get_public_ai_provider_contract() -> dict[str, Any]:
    contract = load_ai_provider_contract()
    return {
        "defaultProvider": contract["defaultProvider"],
        "providers": {
            provider_id: {
                key: value
                for key, value in provider_config.items()
                if key != "legacyModels"
            }
            for provider_id, provider_config in contract["providers"].items()
        },
    }
