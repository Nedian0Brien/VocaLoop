"""VocaLoop AI 탭의 대화와 메시지.

지금 어시스턴트가 하는 일은 하나다 — 첨부한 단어장 파일에서 단어를 뽑아 `file_import`
메시지로 돌려주는 것. 추출은 응답 뒤 백그라운드에서 돌고, 클라이언트는 `pending`인
동안 메시지 목록을 다시 읽는다. 저장은 클라이언트가 기존 bulk-add 경로로 하고, 그 결과만
`/import-result` 로 기록한다.
"""

from __future__ import annotations

import logging
import math
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..codex_cli import CodexError
from ..database import SessionLocal
from ..file_vocabulary import (
    DocumentError,
    extract_vocabulary_from_document,
    save_validated_document_upload,
)
from ..models import AiConversation, AiMessage, Folder, User
from ..schemas import (
    AiConversationCreate,
    AiConversationRead,
    AiConversationUpdate,
    AiImportBatchResult,
    AiMessageRead,
    AiMessageSendResponse,
)


router = APIRouter(prefix="/api/ai/conversations", tags=["ai-conversations"])
logger = logging.getLogger(__name__)

IMPORT_BATCH_SIZE = 200
MAX_TITLE_FROM_CONTENT = 40
MAX_MESSAGE_LENGTH = 4000

ROLE_USER = "user"
ROLE_ASSISTANT = "assistant"
KIND_TEXT = "text"
KIND_FILE_IMPORT = "file_import"
STATUS_PENDING = "pending"
STATUS_READY = "ready"
STATUS_FAILED = "failed"
STATUS_DONE = "done"

# 파일 없이 온 메시지에 주는 답. Codex를 부르지 않는다 — 지금 할 수 있는 일만 말한다.
CAPABILITY_REPLY = (
    "지금은 단어장 파일에서 단어를 가져오는 일만 할 수 있어요. "
    "PDF·CSV·XLSX 파일을 첨부하면 단어와 뜻을 뽑아 폴더로 만들어 드립니다. "
    "단어 검색, 학습 조언, 시험지 만들기는 준비 중입니다."
)
EMPTY_MESSAGE_DETAIL = "메시지를 입력하거나 파일을 첨부해 주세요."
STALE_PENDING_DETAIL = "서버가 다시 시작되어 중단되었습니다. 파일을 다시 첨부해 주세요."
CODEX_FAILURE_DETAIL = "AI가 단어를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요."
UNEXPECTED_FAILURE_DETAIL = "단어를 읽는 중 문제가 생겼습니다. 파일을 다시 첨부해 주세요."


def _utcnow() -> datetime:
    # 모델의 server_default(CURRENT_TIMESTAMP)와 같은 UTC naive 값.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_owned_conversation(db: Session, current_user: User, conversation_id: int) -> AiConversation:
    conversation = db.scalar(
        select(AiConversation).where(
            AiConversation.user_id == current_user.id,
            AiConversation.id == conversation_id,
        )
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


def _get_owned_message(db: Session, conversation: AiConversation, message_id: int) -> AiMessage:
    message = db.scalar(
        select(AiMessage).where(
            AiMessage.conversation_id == conversation.id,
            AiMessage.id == message_id,
        )
    )
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message


def _list_messages(db: Session, conversation: AiConversation) -> list[AiMessage]:
    return db.scalars(
        select(AiMessage).where(AiMessage.conversation_id == conversation.id).order_by(AiMessage.id)
    ).all()


def _folder_names(db: Session, current_user: User) -> list[str]:
    return db.scalars(
        select(Folder.name).where(Folder.user_id == current_user.id).order_by(Folder.order, Folder.id)
    ).all()


def _find_folder_id_by_name(db: Session, user_id: int, name: str | None) -> int | None:
    if not name:
        return None
    wanted = name.strip().lower()
    folders = db.scalars(select(Folder).where(Folder.user_id == user_id).order_by(Folder.order, Folder.id)).all()
    for folder in folders:
        if folder.name.strip().lower() == wanted:
            return folder.id
    return None


def batch_count(payload: dict) -> int:
    entries = payload.get("entries") or []
    size = max(int(payload.get("batch_size") or IMPORT_BATCH_SIZE), 1)
    return math.ceil(len(entries) / size)


# ---------------------------------------------------------------------------
# 백그라운드 추출
# ---------------------------------------------------------------------------


def run_file_import(
    message_id: int,
    *,
    source_path: str,
    kind: str,
    file_name: str,
    user_message: str | None,
    folder_names: list[str],
    work_dir: str,
) -> None:
    """응답을 보낸 뒤 스레드풀에서 돈다. 자체 세션을 열고, 끝나면 임시 파일을 지운다."""
    payload_update: dict
    next_status: str
    try:
        result = extract_vocabulary_from_document(
            Path(source_path),
            kind,
            file_name=file_name,
            user_message=user_message,
            folder_names=folder_names,
        )
        payload_update = {
            "entries": [entry.as_dict() for entry in result.entries],
            "suggested_folder_name": result.suggested_folder_name,
            "target_folder_name": result.target_folder_name,
        }
        next_status = STATUS_READY
    except DocumentError as exc:
        payload_update = {"error": exc.detail}
        next_status = STATUS_FAILED
    except CodexError as exc:
        logger.warning("AI file import %s: Codex failed: %s", message_id, exc.detail)
        payload_update = {"error": CODEX_FAILURE_DETAIL}
        next_status = STATUS_FAILED
    except Exception:  # noqa: BLE001 - 백그라운드라 어떤 예외든 메시지에 남겨야 사용자가 안다
        logger.exception("AI file import %s failed unexpectedly", message_id)
        payload_update = {"error": UNEXPECTED_FAILURE_DETAIL}
        next_status = STATUS_FAILED
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)

    with SessionLocal() as session:
        message = session.get(AiMessage, message_id)
        if message is None or message.status != STATUS_PENDING:
            return
        if next_status == STATUS_READY:
            payload_update["target_folder_id"] = _find_folder_id_by_name(
                session, message.user_id, payload_update.get("target_folder_name")
            )
        message.payload.update(payload_update)
        message.status = next_status
        message.updated_at = _utcnow()
        conversation = session.get(AiConversation, message.conversation_id)
        if conversation is not None:
            conversation.updated_at = _utcnow()
        session.commit()


def fail_stale_pending_imports() -> int:
    """프로세스가 죽으면 BackgroundTasks도 사라진다. 시작할 때 남은 pending을 실패로 돌린다."""
    with SessionLocal() as session:
        stale = session.scalars(select(AiMessage).where(AiMessage.status == STATUS_PENDING)).all()
        for message in stale:
            message.payload.update({"error": STALE_PENDING_DETAIL})
            message.status = STATUS_FAILED
            message.updated_at = _utcnow()
        session.commit()
        return len(stale)


# ---------------------------------------------------------------------------
# 대화
# ---------------------------------------------------------------------------


@router.get("", response_model=list[AiConversationRead])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AiConversationRead]:
    conversations = db.scalars(
        select(AiConversation)
        .where(AiConversation.user_id == current_user.id)
        .order_by(AiConversation.updated_at.desc(), AiConversation.id.desc())
    ).all()
    return [AiConversationRead.model_validate(conversation) for conversation in conversations]


@router.post("", response_model=AiConversationRead, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: AiConversationCreate | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiConversationRead:
    conversation = AiConversation(user_id=current_user.id, title=(payload.title if payload else None) or "")
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return AiConversationRead.model_validate(conversation)


@router.patch("/{conversation_id}", response_model=AiConversationRead)
def rename_conversation(
    conversation_id: int,
    payload: AiConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiConversationRead:
    conversation = _get_owned_conversation(db, current_user, conversation_id)
    conversation.title = payload.title
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return AiConversationRead.model_validate(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    conversation = _get_owned_conversation(db, current_user, conversation_id)
    db.delete(conversation)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# 메시지
# ---------------------------------------------------------------------------


@router.get("/{conversation_id}/messages", response_model=list[AiMessageRead])
def list_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AiMessageRead]:
    conversation = _get_owned_conversation(db, current_user, conversation_id)
    return [AiMessageRead.model_validate(message) for message in _list_messages(db, conversation)]


@router.post(
    "/{conversation_id}/messages",
    response_model=AiMessageSendResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: int,
    background_tasks: BackgroundTasks,
    content: str | None = Form(default=None, max_length=MAX_MESSAGE_LENGTH),
    file: UploadFile | None = File(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiMessageSendResponse:
    conversation = _get_owned_conversation(db, current_user, conversation_id)
    text = (content or "").strip()
    upload = file if file is not None and file.filename else None
    if not text and upload is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=EMPTY_MESSAGE_DETAIL)

    # 파일은 메시지를 만들기 전에 검증한다. 거절된 파일은 대화에 흔적을 남기지 않는다.
    work_dir: str | None = None
    kind: str | None = None
    source_path: Path | None = None
    file_size = 0
    if upload is not None:
        work_dir = tempfile.mkdtemp(prefix="vocaloop-ai-import-")
        source_path = Path(work_dir) / "source"
        try:
            kind = await save_validated_document_upload(upload, source_path)
        except DocumentError as exc:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
        file_size = source_path.stat().st_size

    file_name = Path(upload.filename).name if upload is not None else None
    user_payload = (
        {"attachment": {"file_name": file_name, "kind": kind, "size": file_size}}
        if upload is not None
        else {}
    )
    user_message = AiMessage(
        conversation_id=conversation.id,
        user_id=current_user.id,
        role=ROLE_USER,
        kind=KIND_TEXT,
        content=text,
        payload=user_payload,
        status=STATUS_READY,
    )

    if upload is not None:
        assistant_message = AiMessage(
            conversation_id=conversation.id,
            user_id=current_user.id,
            role=ROLE_ASSISTANT,
            kind=KIND_FILE_IMPORT,
            content="",
            payload={
                "file_name": file_name,
                "kind": kind,
                "batch_size": IMPORT_BATCH_SIZE,
                "entries": [],
                "results": [],
            },
            status=STATUS_PENDING,
        )
    else:
        assistant_message = AiMessage(
            conversation_id=conversation.id,
            user_id=current_user.id,
            role=ROLE_ASSISTANT,
            kind=KIND_TEXT,
            content=CAPABILITY_REPLY,
            payload={},
            status=STATUS_READY,
        )

    if not conversation.title:
        conversation.title = (file_name or text)[:MAX_TITLE_FROM_CONTENT]
    conversation.updated_at = _utcnow()

    db.add_all([conversation, user_message, assistant_message])
    db.commit()
    db.refresh(conversation)
    db.refresh(user_message)
    db.refresh(assistant_message)

    if upload is not None:
        assert work_dir is not None and source_path is not None and kind is not None
        background_tasks.add_task(
            run_file_import,
            assistant_message.id,
            source_path=str(source_path),
            kind=kind,
            file_name=file_name or "file",
            user_message=text or None,
            folder_names=_folder_names(db, current_user),
            work_dir=work_dir,
        )

    return AiMessageSendResponse(
        conversation=AiConversationRead.model_validate(conversation),
        messages=[AiMessageRead.model_validate(user_message), AiMessageRead.model_validate(assistant_message)],
    )


@router.patch("/{conversation_id}/messages/{message_id}/import-result", response_model=AiMessageRead)
def record_import_result(
    conversation_id: int,
    message_id: int,
    payload: AiImportBatchResult,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AiMessageRead:
    conversation = _get_owned_conversation(db, current_user, conversation_id)
    message = _get_owned_message(db, conversation, message_id)

    if message.kind != KIND_FILE_IMPORT or message.status != STATUS_READY:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This message is not waiting for an import result",
        )

    results = list(message.payload.get("results") or [])
    total = batch_count(message.payload)
    if payload.batch_index != len(results) or payload.batch_index >= total:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Expected batch_index {len(results)}",
        )

    results.append(payload.model_dump())
    if payload.status == "cancelled":
        # 취소는 남은 배치 전부에 적용된다. 카드가 다시 나오지 않도록 기록을 채운다.
        for index in range(len(results), total):
            results.append({"batch_index": index, "status": "cancelled", "folder_id": None, "folder_name": None, "summary": None})

    message.payload["results"] = results
    if len(results) >= total:
        message.status = STATUS_DONE
    message.updated_at = _utcnow()
    conversation.updated_at = _utcnow()
    db.add_all([message, conversation])
    db.commit()
    db.refresh(message)
    return AiMessageRead.model_validate(message)
