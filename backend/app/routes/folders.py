from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import Folder, User, Word
from ..schemas import FolderCreate, FolderRead, FolderReorderRequest, FolderUpdate


router = APIRouter(prefix="/api/folders", tags=["folders"])


def _get_owned_folder(db: Session, current_user: User, folder_id: int) -> Folder:
    folder = db.scalar(select(Folder).where(Folder.user_id == current_user.id, Folder.id == folder_id))
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


def _list_owned_folders(db: Session, current_user: User) -> list[Folder]:
    return db.scalars(
        select(Folder).where(Folder.user_id == current_user.id).order_by(Folder.order, Folder.id)
    ).all()


@router.get("", response_model=list[FolderRead])
def list_folders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FolderRead]:
    folders = _list_owned_folders(db, current_user)
    return [FolderRead.model_validate(folder) for folder in folders]


@router.post("", response_model=FolderRead, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FolderRead:
    last_folder = db.scalar(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.order.desc(), Folder.id.desc())
    )
    folder = Folder(
        user_id=current_user.id,
        order=(last_folder.order + 1) if last_folder is not None else 0,
        **payload.model_dump(),
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderRead.model_validate(folder)


@router.patch("/{folder_id}", response_model=FolderRead)
def patch_folder(
    folder_id: int,
    payload: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FolderRead:
    folder = _get_owned_folder(db, current_user, folder_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(folder, field, value)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderRead.model_validate(folder)


@router.post("/reorder", response_model=list[FolderRead])
def reorder_folders(
    payload: FolderReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FolderRead]:
    current_folders = _list_owned_folders(db, current_user)
    ordered_folders: list[Folder] = []
    reordered_ids = set(payload.folder_ids)

    for index, folder_id in enumerate(payload.folder_ids):
        folder = _get_owned_folder(db, current_user, folder_id)
        ordered_folders.append(folder)

    ordered_folders.extend(folder for folder in current_folders if folder.id not in reordered_ids)

    for index, folder in enumerate(ordered_folders):
        folder.order = index

    if ordered_folders:
        db.add_all(ordered_folders)
        db.commit()

    folders = _list_owned_folders(db, current_user)
    return [FolderRead.model_validate(folder) for folder in folders]


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    folder = _get_owned_folder(db, current_user, folder_id)
    words = db.scalars(
        select(Word).where(Word.user_id == current_user.id, Word.folder_id == folder.id)
    ).all()
    for word in words:
        word.folder_id = None
    db.delete(folder)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
