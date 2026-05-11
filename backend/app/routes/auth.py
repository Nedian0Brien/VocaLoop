from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import (
    clear_session_cookie,
    get_current_user,
    get_db,
    hash_password,
    issue_session_cookie,
    normalize_email,
    verify_password,
)
from ..models import User
from ..seed import seed_database
from ..schemas import AuthResponse, LoginRequest, SignupRequest


router = APIRouter(prefix="/api/auth", tags=["auth"])


def _build_user_response(user: User) -> AuthResponse:
    return AuthResponse(user=user)


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    email = normalize_email(payload.email)
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    user = User(
        email=email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.flush()
        seed_database(db, user)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use") from exc
    db.refresh(user)

    issue_session_cookie(response, user)
    return _build_user_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    email = normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    issue_session_cookie(response, user)
    return _build_user_response(user)


@router.post("/logout")
def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    current_user.session_version += 1
    db.add(current_user)
    db.commit()
    clear_session_cookie(response)
    return {"detail": "Logged out"}


@router.get("/me", response_model=AuthResponse)
def me(current_user: User = Depends(get_current_user)) -> AuthResponse:
    return _build_user_response(current_user)
