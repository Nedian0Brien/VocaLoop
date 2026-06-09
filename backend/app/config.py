from dataclasses import dataclass
import os
from secrets import token_urlsafe
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "VocaLoop"
    environment: str = "development"
    database_url: str = "sqlite:///./vocaloop.db"
    auth_secret_key: str = ""
    uploads_root: Path = Path("./uploads")
    max_profile_image_size: int = 5 * 1024 * 1024
    piper_bin: str = "piper"
    piper_voice_model: Path | None = None
    piper_voice_config: Path | None = None
    piper_timeout_seconds: int = 10


AUTH_SECRET_FILE_DEFAULT = Path(__file__).resolve().parents[2] / ".auth_secret"


def _load_auth_secret(auth_secret_file: Path) -> str:
    auth_secret = os.getenv("AUTH_SECRET_KEY", "").strip()
    if auth_secret:
        return auth_secret

    if auth_secret_file.exists():
        stored_secret = auth_secret_file.read_text(encoding="utf-8").strip()
        if stored_secret:
            return stored_secret

    auth_secret_file.parent.mkdir(parents=True, exist_ok=True)
    generated_secret = token_urlsafe(48)
    auth_secret_file.write_text(generated_secret, encoding="utf-8")
    return generated_secret


def load_settings() -> Settings:
    auth_secret_file = Path(os.getenv("AUTH_SECRET_FILE", str(AUTH_SECRET_FILE_DEFAULT))).expanduser()
    auth_secret_key = _load_auth_secret(auth_secret_file)
    piper_voice_model = os.getenv("PIPER_VOICE_MODEL", "").strip()
    piper_voice_config = os.getenv("PIPER_VOICE_CONFIG", "").strip()

    return Settings(
        app_name=os.getenv("APP_NAME", "VocaLoop"),
        environment=os.getenv("ENVIRONMENT", "development"),
        database_url=os.getenv("DATABASE_URL", "sqlite:///./vocaloop.db"),
        auth_secret_key=auth_secret_key,
        uploads_root=Path(os.getenv("UPLOADS_ROOT", "./uploads")).expanduser(),
        piper_bin=os.getenv("PIPER_BIN", "piper").strip() or "piper",
        piper_voice_model=Path(piper_voice_model).expanduser() if piper_voice_model else None,
        piper_voice_config=Path(piper_voice_config).expanduser() if piper_voice_config else None,
        piper_timeout_seconds=int(os.getenv("PIPER_TIMEOUT_SECONDS", "10")),
    )
