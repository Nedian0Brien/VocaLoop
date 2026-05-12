from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import ToeflQuizAsset, ToeflQuizAttempt, User
from ..schemas import ToeflAssetCreate, ToeflAssetRead, ToeflAttemptCreate, ToeflAttemptRead


router = APIRouter(prefix="/api/toefl", tags=["toefl"])


def _get_owned_asset(db: Session, current_user: User, asset_id: int) -> ToeflQuizAsset:
    asset = db.scalar(
        select(ToeflQuizAsset).where(
            ToeflQuizAsset.user_id == current_user.id,
            ToeflQuizAsset.id == asset_id,
        )
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TOEFL quiz asset not found")
    return asset


def _asset_to_read(asset: ToeflQuizAsset) -> ToeflAssetRead:
    return ToeflAssetRead(
        id=asset.id,
        mode=asset.mode,
        task_type=asset.task_type,
        title=asset.title,
        payload=asset.payload,
        metadata=asset.metadata_json,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


def _attempt_to_read(attempt: ToeflQuizAttempt) -> ToeflAttemptRead:
    return ToeflAttemptRead(
        id=attempt.id,
        asset_id=attempt.asset_id,
        answers=attempt.answers,
        results=attempt.results,
        correct_count=attempt.correct_count,
        total_count=attempt.total_count,
        score=attempt.score,
        created_at=attempt.created_at,
    )


@router.get("/assets", response_model=list[ToeflAssetRead], response_model_by_alias=True)
def list_assets(
    mode: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ToeflAssetRead]:
    query = select(ToeflQuizAsset).where(ToeflQuizAsset.user_id == current_user.id)
    if mode:
        query = query.where(ToeflQuizAsset.mode == mode)
    assets = db.scalars(query.order_by(ToeflQuizAsset.created_at.desc(), ToeflQuizAsset.id.desc()).limit(limit)).all()
    return [_asset_to_read(asset) for asset in assets]


@router.post("/assets", response_model=ToeflAssetRead, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: ToeflAssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ToeflAssetRead:
    asset = ToeflQuizAsset(
        user_id=current_user.id,
        mode=payload.mode,
        task_type=payload.task_type,
        title=payload.title,
        payload=payload.payload,
        metadata_json=payload.metadata,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _asset_to_read(asset)


@router.get("/assets/{asset_id}", response_model=ToeflAssetRead, response_model_by_alias=True)
def read_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ToeflAssetRead:
    return _asset_to_read(_get_owned_asset(db, current_user, asset_id))


@router.post(
    "/assets/{asset_id}/attempts",
    response_model=ToeflAttemptRead,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
def create_attempt(
    asset_id: int,
    payload: ToeflAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ToeflAttemptRead:
    _get_owned_asset(db, current_user, asset_id)
    attempt = ToeflQuizAttempt(
        user_id=current_user.id,
        asset_id=asset_id,
        answers=payload.answers,
        results=payload.results,
        correct_count=payload.correct_count,
        total_count=payload.total_count,
        score=payload.score,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return _attempt_to_read(attempt)
