from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import ToeflQuizAsset, ToeflQuizAttempt, ToeflReviewItem, User
from ..schemas import (
    ToeflAssetCreate,
    ToeflAssetRead,
    ToeflAttemptCreate,
    ToeflAttemptRead,
    ToeflReviewItemRead,
    ToeflReviewItemUpdate,
)
from ..toefl_review import apply_review_result, review_item_to_read, sync_review_items_for_attempt


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


def _get_owned_review_item(db: Session, current_user: User, item_id: int) -> ToeflReviewItem:
    item = db.scalar(
        select(ToeflReviewItem).where(
            ToeflReviewItem.user_id == current_user.id,
            ToeflReviewItem.id == item_id,
        )
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TOEFL review item not found")
    return item


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


@router.get("/review-items", response_model=list[ToeflReviewItemRead], response_model_by_alias=True)
def list_review_items(
    scope: str = Query(default="today", pattern="^(today|active|mastered|all)$"),
    limit: int = Query(default=30, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ToeflReviewItemRead]:
    now = datetime.utcnow()
    query = select(ToeflReviewItem).where(ToeflReviewItem.user_id == current_user.id)
    if scope == "today":
        query = query.where(ToeflReviewItem.status != "mastered", ToeflReviewItem.due_at <= now)
    elif scope == "active":
        query = query.where(ToeflReviewItem.status != "mastered")
    elif scope == "mastered":
        query = query.where(ToeflReviewItem.status == "mastered")
    items = db.scalars(
        query.order_by(ToeflReviewItem.due_at.asc(), ToeflReviewItem.updated_at.desc(), ToeflReviewItem.id.desc())
        .limit(limit)
    ).all()
    return [review_item_to_read(item) for item in items]


@router.get("/review-items/{item_id}", response_model=ToeflReviewItemRead, response_model_by_alias=True)
def read_review_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ToeflReviewItemRead:
    return review_item_to_read(_get_owned_review_item(db, current_user, item_id))


@router.patch("/review-items/{item_id}", response_model=ToeflReviewItemRead, response_model_by_alias=True)
def update_review_item(
    item_id: int,
    payload: ToeflReviewItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ToeflReviewItemRead:
    item = _get_owned_review_item(db, current_user, item_id)
    now = datetime.utcnow()
    if payload.result:
        apply_review_result(item, payload.result, now)
    if payload.status:
        item.status = payload.status
        if payload.status == "mastered":
            item.success_streak = max(item.success_streak, 3)
            item.last_result = item.last_result or "correct"
    if payload.due_at:
        item.due_at = payload.due_at
    db.commit()
    db.refresh(item)
    return review_item_to_read(item)


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
    asset = _get_owned_asset(db, current_user, asset_id)
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
    db.flush()
    sync_review_items_for_attempt(db, current_user, asset, attempt)
    db.commit()
    db.refresh(attempt)
    return _attempt_to_read(attempt)
