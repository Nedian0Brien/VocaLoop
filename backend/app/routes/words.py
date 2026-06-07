from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user, get_db
from ..models import Folder, User, Word
from ..schemas import WordCreate, WordRead, WordUpdate


router = APIRouter(prefix="/api/words", tags=["words"])


def _get_owned_word(db: Session, current_user: User, word_id: int) -> Word:
    word = db.scalar(select(Word).where(Word.user_id == current_user.id, Word.id == word_id))
    if word is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Word not found")
    return word


def _get_owned_folder(db: Session, current_user: User, folder_id: int) -> Folder:
    folder = db.scalar(
        select(Folder).where(Folder.user_id == current_user.id, Folder.id == folder_id)
    )
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


def _get_owned_folders(db: Session, current_user: User, folder_ids: list[int]) -> list[Folder]:
    if not folder_ids:
        return []
    folders_by_id = {
        folder.id: folder
        for folder in db.scalars(
            select(Folder).where(Folder.user_id == current_user.id, Folder.id.in_(folder_ids))
        ).all()
    }
    if len(folders_by_id) != len(folder_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return [folders_by_id[folder_id] for folder_id in folder_ids]


def _merge_folder_ids(folder_id: int | None, folder_ids: list[int]) -> list[int]:
    merged_ids = []
    for current_id in [folder_id, *folder_ids]:
        if current_id is None or current_id in merged_ids:
            continue
        merged_ids.append(current_id)
    return merged_ids


@router.get("", response_model=list[WordRead])
def list_words(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WordRead]:
    words = db.scalars(
        select(Word)
        .options(selectinload(Word.folders))
        .where(Word.user_id == current_user.id)
        .order_by(Word.id)
    ).all()
    return [WordRead.model_validate(word) for word in words]


@router.post("", response_model=WordRead, status_code=status.HTTP_201_CREATED)
def create_word(
    payload: WordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WordRead:
    data = payload.model_dump()
    folder_ids = _merge_folder_ids(data.pop("folder_id"), data.pop("folder_ids"))
    folders = _get_owned_folders(db, current_user, folder_ids)
    word = Word(
        user_id=current_user.id,
        folder_id=folder_ids[0] if folder_ids else None,
        **data,
    )
    word.folders = folders
    db.add(word)
    db.commit()
    db.refresh(word)
    return WordRead.model_validate(word)


@router.patch("/{word_id}", response_model=WordRead)
def patch_word(
    word_id: int,
    payload: WordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WordRead:
    word = _get_owned_word(db, current_user, word_id)
    updates = payload.model_dump(exclude_unset=True)
    has_folder_id = "folder_id" in updates
    has_folder_ids = "folder_ids" in updates
    folder_id = updates.pop("folder_id", None)
    folder_ids = updates.pop("folder_ids", None)

    for field, value in updates.items():
        setattr(word, field, value)

    if has_folder_ids:
        requested_folder_ids = folder_ids or []
        folders = _get_owned_folders(db, current_user, requested_folder_ids)
        word.folders = folders
        if has_folder_id:
            if folder_id is not None:
                _get_owned_folder(db, current_user, folder_id)
            word.folder_id = folder_id
        elif word.folder_id not in requested_folder_ids:
            word.folder_id = requested_folder_ids[0] if requested_folder_ids else None
    elif has_folder_id:
        folder = _get_owned_folder(db, current_user, folder_id) if folder_id is not None else None
        word.folder_id = folder_id
        word.folders = [folder] if folder is not None else []

    db.add(word)
    db.commit()
    db.refresh(word)
    return WordRead.model_validate(word)


@router.delete("/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    word = _get_owned_word(db, current_user, word_id)
    db.delete(word)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
