from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..auth import clear_session_cookie, get_current_user, get_db, verify_password
from ..config import load_settings
from ..models import Folder, User, Word
from ..schemas import AccountDeleteRequest


router = APIRouter(prefix="/api/account", tags=["account"])

settings = load_settings()


def _delete_profile_photo_if_present(photo_url: str | None) -> None:
    if not photo_url or not photo_url.startswith("/uploads/profile/"):
        return

    file_path = settings.uploads_root / photo_url.removeprefix("/uploads/")
    if file_path.exists():
        file_path.unlink()


@router.post("/reset-data")
def reset_owned_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    deleted_words = (
        db.query(Word)
        .filter(Word.user_id == current_user.id)
        .delete(synchronize_session=False)
    )
    deleted_folders = (
        db.query(Folder)
        .filter(Folder.user_id == current_user.id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"deleted_words": deleted_words, "deleted_folders": deleted_folders}


@router.post("/delete")
def delete_owned_account(
    payload: AccountDeleteRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    photo_url = current_user.photo_url
    db.delete(current_user)
    db.commit()

    clear_session_cookie(response)
    _delete_profile_photo_if_present(photo_url)

    return {"detail": "Account deleted"}
