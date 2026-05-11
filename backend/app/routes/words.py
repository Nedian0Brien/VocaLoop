from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

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


@router.get("", response_model=list[WordRead])
def list_words(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WordRead]:
    words = db.scalars(
        select(Word).where(Word.user_id == current_user.id).order_by(Word.id)
    ).all()
    return [WordRead.model_validate(word) for word in words]


@router.post("", response_model=WordRead, status_code=status.HTTP_201_CREATED)
def create_word(
    payload: WordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WordRead:
    if payload.folder_id is not None:
        _get_owned_folder(db, current_user, payload.folder_id)
    word = Word(user_id=current_user.id, **payload.model_dump())
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
    folder_id = updates.get("folder_id")
    if folder_id is not None:
        _get_owned_folder(db, current_user, folder_id)
    for field, value in updates.items():
        setattr(word, field, value)
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
