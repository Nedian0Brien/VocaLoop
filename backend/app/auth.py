from __future__ import annotations

import hashlib
import hmac
from typing import Generator

import bcrypt
from fastapi import Cookie, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from .config import load_settings
from .db import SessionLocal
from .models import User


settings = load_settings()
SESSION_COOKIE_NAME = "vocaloop_session"
SESSION_SECRET = settings.auth_secret_key
COOKIE_SECURE = settings.environment.lower() == "production"

# 네이티브 앱(Capacitor)은 HttpOnly 쿠키를 신뢰할 수 없어 Bearer 토큰으로 인증한다.
# 이 헤더가 붙은 요청에만 로그인/회원가입 응답에 세션 토큰을 실어 보낸다.
CLIENT_HEADER_NAME = "X-VocaLoop-Client"
NATIVE_CLIENT_VALUES = frozenset({"ios", "android", "capacitor"})


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _sign_session(user_id: int, session_version: int) -> str:
    message = f"{user_id}:{session_version}".encode("utf-8")
    signature = hmac.new(SESSION_SECRET.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return f"{user_id}:{session_version}.{signature}"


def _verify_session(token: str) -> tuple[int, int]:
    try:
        payload, signature = token.split(".", 1)
        user_id_text, session_version_text = payload.split(":", 1)
        user_id = int(user_id_text)
        session_version = int(session_version_text)
    except (ValueError, TypeError):
        raise ValueError("Invalid session")

    expected_signature = hmac.new(
        SESSION_SECRET.encode("utf-8"),
        f"{user_id}:{session_version}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("Invalid session")

    return user_id, session_version


def create_session_token(user: User) -> str:
    """네이티브 클라이언트가 Bearer 토큰으로 사용할 서명 세션 문자열."""
    return _sign_session(user.id, user.session_version)


def is_native_client(
    client: str | None = Header(default=None, alias=CLIENT_HEADER_NAME),
) -> bool:
    return bool(client) and client.strip().lower() in NATIVE_CLIENT_VALUES


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.strip().lower() != "bearer":
        return None

    return token.strip() or None


def issue_session_cookie(response: Response, user: User) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=_sign_session(user.id, user.session_version),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = _extract_bearer_token(authorization) or session_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        user_id, session_version = _verify_session(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated") from exc

    user = db.get(User, user_id)
    if user is None or user.session_version != session_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return user
