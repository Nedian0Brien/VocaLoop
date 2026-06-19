from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..config import load_settings
from ..image_uploads import save_validated_image_upload
from ..models import User


router = APIRouter(prefix="/api/uploads", tags=["uploads"])

settings = load_settings()
PROFILE_UPLOAD_DIR = settings.uploads_root / "profile"
PROFILE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_PROFILE_IMAGE_SIZE = settings.max_profile_image_size


def _build_profile_photo_url(filename: str) -> str:
    return f"/uploads/profile/{filename}"


def _delete_file_if_present(photo_url: str | None) -> None:
    if not photo_url or not photo_url.startswith("/uploads/profile/"):
        return

    file_path = settings.uploads_root / photo_url.removeprefix("/uploads/")
    if file_path.exists():
        file_path.unlink()


@router.delete("/profile-image")
def delete_profile_image(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
    previous_photo_url = current_user.photo_url
    current_user.photo_url = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    _delete_file_if_present(previous_photo_url)

    return {"photo_url": None}


@router.post("/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    filename = f"{uuid.uuid4().hex}"
    destination = PROFILE_UPLOAD_DIR / filename
    previous_photo_url = current_user.photo_url
    new_photo_url = ""

    try:
        extension = await save_validated_image_upload(
            file,
            destination,
            max_size=MAX_PROFILE_IMAGE_SIZE,
        )
        final_destination = destination.with_suffix(extension)
        destination.rename(final_destination)
        filename = final_destination.name
        new_photo_url = _build_profile_photo_url(filename)

        current_user.photo_url = new_photo_url
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
    except HTTPException:
        destination.unlink(missing_ok=True)
        db.rollback()
        current_user.photo_url = previous_photo_url
        raise
    except Exception:
        destination.unlink(missing_ok=True)
        if new_photo_url:
            (settings.uploads_root / new_photo_url.removeprefix("/uploads/")).unlink(missing_ok=True)
        db.rollback()
        current_user.photo_url = previous_photo_url
        raise

    if previous_photo_url != new_photo_url:
        _delete_file_if_present(previous_photo_url)

    return {"photo_url": new_photo_url}
