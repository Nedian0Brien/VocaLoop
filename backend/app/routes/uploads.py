from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..config import load_settings
from ..models import User


router = APIRouter(prefix="/api/uploads", tags=["uploads"])

settings = load_settings()
PROFILE_UPLOAD_DIR = settings.uploads_root / "profile"
PROFILE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_PROFILE_IMAGE_SIZE = settings.max_profile_image_size
CHUNK_SIZE = 1024 * 1024
PAYLOAD_TOO_LARGE_STATUS = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
SAFE_IMAGE_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"\xff\xd8\xff", ".jpg"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
    (b"BM", ".bmp"),
)


def _build_profile_photo_url(filename: str) -> str:
    return f"/uploads/profile/{filename}"


def _detect_safe_image_extension(header_bytes: bytes) -> str | None:
    for signature, extension in SAFE_IMAGE_SIGNATURES:
        if header_bytes.startswith(signature):
            return extension

    if len(header_bytes) >= 12 and header_bytes.startswith(b"RIFF") and header_bytes[8:12] == b"WEBP":
        return ".webp"

    return None


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
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="File must be an image",
        )

    first_chunk = await file.read(CHUNK_SIZE)
    extension = _detect_safe_image_extension(first_chunk)
    if extension is None:
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="File must be a supported raster image",
        )

    filename = f"{uuid.uuid4().hex}{extension}"
    destination = PROFILE_UPLOAD_DIR / filename
    total_size = 0
    previous_photo_url = current_user.photo_url
    new_photo_url = _build_profile_photo_url(filename)

    try:
        with destination.open("wb") as output_file:
            chunk = first_chunk
            while True:
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_PROFILE_IMAGE_SIZE:
                    raise HTTPException(
                        status_code=PAYLOAD_TOO_LARGE_STATUS,
                        detail="File must be 5 MB or smaller",
                    )
                output_file.write(chunk)
                chunk = await file.read(CHUNK_SIZE)

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
        db.rollback()
        current_user.photo_url = previous_photo_url
        raise
    finally:
        await file.close()

    if previous_photo_url != new_photo_url:
        _delete_file_if_present(previous_photo_url)

    return {"photo_url": new_photo_url}
