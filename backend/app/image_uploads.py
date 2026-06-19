from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile, status


CHUNK_SIZE = 1024 * 1024
PAYLOAD_TOO_LARGE_STATUS = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
SAFE_IMAGE_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"\xff\xd8\xff", ".jpg"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
    (b"BM", ".bmp"),
)


def detect_safe_image_extension(header_bytes: bytes) -> str | None:
    for signature, extension in SAFE_IMAGE_SIGNATURES:
        if header_bytes.startswith(signature):
            return extension

    if len(header_bytes) >= 12 and header_bytes.startswith(b"RIFF") and header_bytes[8:12] == b"WEBP":
        return ".webp"

    return None


async def save_validated_image_upload(
    file: UploadFile,
    destination: Path,
    *,
    max_size: int,
    invalid_content_type_detail: str = "File must be an image",
    invalid_signature_detail: str = "File must be a supported raster image",
    too_large_detail: str = "File must be 5 MB or smaller",
) -> str:
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=invalid_content_type_detail,
        )

    first_chunk = await file.read(CHUNK_SIZE)
    extension = detect_safe_image_extension(first_chunk)
    if extension is None:
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=invalid_signature_detail,
        )

    total_size = 0
    try:
        with destination.open("wb") as output_file:
            chunk = first_chunk
            while True:
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_size:
                    raise HTTPException(
                        status_code=PAYLOAD_TOO_LARGE_STATUS,
                        detail=too_large_detail,
                    )
                output_file.write(chunk)
                chunk = await file.read(CHUNK_SIZE)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    return extension
