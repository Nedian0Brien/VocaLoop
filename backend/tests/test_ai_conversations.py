import io
import json
import subprocess
from pathlib import Path


def _signup(client, email: str):
    response = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "Password123!", "display_name": "AI User"},
    )
    assert response.status_code == 201
    return response


def _create_conversation(client, title=None):
    response = client.post("/api/ai/conversations", json={"title": title} if title else None)
    assert response.status_code == 201
    return response.json()


def _csv_file(rows: list[tuple[str, str]], name: str = "words.csv"):
    body = "\n".join(f"{word},{meaning}" for word, meaning in rows) + "\n"
    return {"file": (name, io.BytesIO(body.encode("utf-8")), "text/csv")}


def _fake_codex(monkeypatch, entries, *, suggested="TOEFL Day 1", target=None):
    """codex_cli.subprocess.run 을 가짜로 바꿔 마지막 메시지 파일에 JSON을 쓴다."""
    from app import codex_cli

    captured = {"prompts": []}

    def fake_run(args, input, text, capture_output, timeout, check, cwd, env):  # noqa: A002
        captured["prompts"].append(input)
        output_path = Path(args[args.index("--output-last-message") + 1])
        output_path.write_text(
            json.dumps({"entries": entries, "suggested_folder_name": suggested, "target_folder_name": target}),
            encoding="utf-8",
        )
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(codex_cli.subprocess, "run", fake_run)
    return captured


# --- 인증·소유 --------------------------------------------------------------------


def test_conversations_require_authentication(client):
    assert client.get("/api/ai/conversations").status_code == 401
    assert client.post("/api/ai/conversations").status_code == 401


def test_conversations_are_scoped_to_their_owner(client):
    _signup(client, "owner@example.com")
    conversation = _create_conversation(client, "mine")

    client.post("/api/auth/logout")
    _signup(client, "other@example.com")

    assert client.get("/api/ai/conversations").json() == []
    assert client.get(f"/api/ai/conversations/{conversation['id']}/messages").status_code == 404
    assert client.patch(f"/api/ai/conversations/{conversation['id']}", json={"title": "x"}).status_code == 404
    assert client.delete(f"/api/ai/conversations/{conversation['id']}").status_code == 404


# --- 대화 CRUD ---------------------------------------------------------------------


def test_conversation_crud(client):
    _signup(client, "crud@example.com")

    created = _create_conversation(client)
    assert created["title"] == ""

    renamed = client.patch(f"/api/ai/conversations/{created['id']}", json={"title": "  TOEFL 준비  "})
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "TOEFL 준비"

    assert client.patch(f"/api/ai/conversations/{created['id']}", json={"title": "   "}).status_code == 422

    second = _create_conversation(client, "second")
    listed = client.get("/api/ai/conversations").json()
    assert [item["id"] for item in listed] == [second["id"], created["id"]]
    assert [item["last_kind"] for item in listed] == [None, None]

    assert client.delete(f"/api/ai/conversations/{created['id']}").status_code == 204
    assert [item["id"] for item in client.get("/api/ai/conversations").json()] == [second["id"]]


def test_deleting_conversation_removes_its_messages(client):
    _signup(client, "cascade@example.com")
    conversation = _create_conversation(client)
    client.post(f"/api/ai/conversations/{conversation['id']}/messages", data={"content": "안녕"})

    from app.db import SessionLocal
    from app.models import AiMessage

    with SessionLocal() as session:
        assert session.query(AiMessage).count() == 2

    assert client.delete(f"/api/ai/conversations/{conversation['id']}").status_code == 204

    with SessionLocal() as session:
        assert session.query(AiMessage).count() == 0


# --- 텍스트 메시지 ----------------------------------------------------------------


def test_text_only_message_gets_capability_reply_without_codex(client, monkeypatch):
    from app import codex_cli
    from app.routes import ai_conversations

    def fail_run(*args, **kwargs):
        raise AssertionError("Codex must not be called for text-only messages")

    monkeypatch.setattr(codex_cli.subprocess, "run", fail_run)

    _signup(client, "text@example.com")
    conversation = _create_conversation(client)

    response = client.post(
        f"/api/ai/conversations/{conversation['id']}/messages",
        data={"content": "  TOEFL 단어장 만들어 줘  "},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["conversation"]["title"] == "TOEFL 단어장 만들어 줘"
    assert body["conversation"]["last_kind"] == "text"
    user_message, assistant_message = body["messages"]
    assert user_message["role"] == "user"
    assert user_message["content"] == "TOEFL 단어장 만들어 줘"
    assert assistant_message["role"] == "assistant"
    assert assistant_message["kind"] == "text"
    assert assistant_message["status"] == "ready"
    assert assistant_message["content"] == ai_conversations.CAPABILITY_REPLY

    listed = client.get(f"/api/ai/conversations/{conversation['id']}/messages").json()
    assert [item["id"] for item in listed] == [user_message["id"], assistant_message["id"]]


def test_empty_message_is_rejected(client):
    _signup(client, "empty@example.com")
    conversation = _create_conversation(client)

    response = client.post(f"/api/ai/conversations/{conversation['id']}/messages", data={"content": "   "})

    assert response.status_code == 422
    assert client.get(f"/api/ai/conversations/{conversation['id']}/messages").json() == []


# --- 파일 메시지 ------------------------------------------------------------------


def test_file_message_runs_extraction_in_background_and_becomes_ready(client, monkeypatch):
    _signup(client, "file@example.com")
    folder = client.post("/api/folders", json={"name": "TOEFL", "color": "blue", "icon": None}).json()
    conversation = _create_conversation(client)

    captured = _fake_codex(
        monkeypatch,
        [{"word": "abate", "meaning_ko": "줄이다"}, {"word": "candid", "meaning_ko": None}],
        target="toefl",
    )

    response = client.post(
        f"/api/ai/conversations/{conversation['id']}/messages",
        data={"content": "TOEFL 폴더에 넣어줘"},
        files=_csv_file([("abate", "줄이다"), ("candid", "솔직한")], name="toefl_day1.csv"),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["conversation"]["title"] == "toefl_day1.csv"
    assert body["conversation"]["last_kind"] == "file_import"
    assert client.get("/api/ai/conversations").json()[0]["last_kind"] == "file_import"
    user_message, assistant_message = body["messages"]
    assert user_message["payload"]["attachment"]["file_name"] == "toefl_day1.csv"
    assert user_message["payload"]["attachment"]["kind"] == "csv"
    assert assistant_message["kind"] == "file_import"
    # 응답 시점에는 pending 이다. TestClient 는 응답 뒤 백그라운드 태스크를 바로 돌린다.
    assert assistant_message["status"] == "pending"

    prompt = captured["prompts"][0]
    assert 'File name: "toefl_day1.csv"' in prompt
    assert '["TOEFL"]' in prompt
    assert "TOEFL 폴더에 넣어줘" in prompt
    assert "abate\t줄이다" in prompt

    ready = client.get(f"/api/ai/conversations/{conversation['id']}/messages").json()[1]
    assert ready["status"] == "ready"
    assert ready["payload"]["entries"] == [
        {"word": "abate", "meaning_ko": "줄이다"},
        {"word": "candid", "meaning_ko": None},
    ]
    assert ready["payload"]["suggested_folder_name"] == "TOEFL Day 1"
    assert ready["payload"]["target_folder_name"] == "TOEFL"
    assert ready["payload"]["target_folder_id"] == folder["id"]
    assert ready["payload"]["batch_size"] == 200
    assert ready["payload"]["results"] == []


def test_file_extraction_creates_no_words_or_folders(client, monkeypatch):
    _signup(client, "no-db-write@example.com")
    conversation = _create_conversation(client)
    _fake_codex(monkeypatch, [{"word": "abate", "meaning_ko": "줄이다"}])

    from app.db import SessionLocal
    from app.models import Folder, Word

    # 시드 데이터가 있을 수 있으니 전후 개수를 비교한다.
    with SessionLocal() as session:
        before_words = session.query(Word).count()
        before_folders = session.query(Folder).count()

    response = client.post(
        f"/api/ai/conversations/{conversation['id']}/messages",
        files=_csv_file([("abate", "줄이다")]),
    )
    assert response.status_code == 201

    with SessionLocal() as session:
        assert session.query(Word).count() == before_words
        assert session.query(Folder).count() == before_folders


def test_rejected_file_leaves_no_messages(client):
    _signup(client, "reject@example.com")
    conversation = _create_conversation(client)

    response = client.post(
        f"/api/ai/conversations/{conversation['id']}/messages",
        files={"file": ("notes.txt", io.BytesIO(b"abate"), "text/plain")},
    )

    assert response.status_code == 422
    assert "PDF, CSV, XLSX" in response.json()["detail"]
    assert client.get(f"/api/ai/conversations/{conversation['id']}/messages").json() == []


def test_oversized_file_is_rejected(client, monkeypatch):
    from app import file_vocabulary

    monkeypatch.setattr(file_vocabulary, "MAX_DOCUMENT_SIZE", 10)
    _signup(client, "big@example.com")
    conversation = _create_conversation(client)

    response = client.post(
        f"/api/ai/conversations/{conversation['id']}/messages",
        files=_csv_file([("abate", "줄이다"), ("candid", "솔직한")]),
    )

    assert response.status_code == 413
    assert client.get(f"/api/ai/conversations/{conversation['id']}/messages").json() == []


def test_scanned_pdf_ends_as_failed_message(client, monkeypatch):
    from app import codex_cli

    def fail_run(*args, **kwargs):
        raise AssertionError("Codex must not be called when the file has no text")

    monkeypatch.setattr(codex_cli.subprocess, "run", fail_run)
    _signup(client, "scan@example.com")
    conversation = _create_conversation(client)

    response = client.post(
        f"/api/ai/conversations/{conversation['id']}/messages",
        files={"file": ("scan.pdf", io.BytesIO(b"%PDF-1.4\n1 0 obj\nendobj\n"), "application/pdf")},
    )
    assert response.status_code == 201

    failed = client.get(f"/api/ai/conversations/{conversation['id']}/messages").json()[1]
    assert failed["status"] == "failed"
    assert failed["payload"]["error"]


def test_codex_failure_ends_as_failed_message(client, monkeypatch):
    from app import codex_cli
    from app.routes import ai_conversations

    def fake_run(args, input, text, capture_output, timeout, check, cwd, env):  # noqa: A002
        raise subprocess.TimeoutExpired(cmd=args, timeout=timeout)

    monkeypatch.setattr(codex_cli.subprocess, "run", fake_run)
    _signup(client, "timeout@example.com")
    conversation = _create_conversation(client)

    client.post(f"/api/ai/conversations/{conversation['id']}/messages", files=_csv_file([("abate", "줄이다")]))

    failed = client.get(f"/api/ai/conversations/{conversation['id']}/messages").json()[1]
    assert failed["status"] == "failed"
    assert failed["payload"]["error"] == ai_conversations.CODEX_FAILURE_DETAIL


def test_stale_pending_messages_fail_on_startup(client):
    _signup(client, "stale@example.com")
    conversation = _create_conversation(client)

    from app.db import SessionLocal
    from app.models import AiMessage
    from app.routes import ai_conversations

    with SessionLocal() as session:
        session.add(
            AiMessage(
                conversation_id=conversation["id"],
                user_id=1,
                role="assistant",
                kind="file_import",
                payload={"entries": [], "results": []},
                status="pending",
            )
        )
        session.commit()

    assert ai_conversations.fail_stale_pending_imports() == 1

    message = client.get(f"/api/ai/conversations/{conversation['id']}/messages").json()[0]
    assert message["status"] == "failed"
    assert message["payload"]["error"] == ai_conversations.STALE_PENDING_DETAIL


# --- 배치 결과 -------------------------------------------------------------------


def _ready_import(client, monkeypatch, word_count: int, batch_size: int):
    from app.routes import ai_conversations

    monkeypatch.setattr(ai_conversations, "IMPORT_BATCH_SIZE", batch_size)
    entries = [{"word": f"word{index}", "meaning_ko": None} for index in range(word_count)]
    _fake_codex(monkeypatch, entries)
    conversation = _create_conversation(client)
    client.post(
        f"/api/ai/conversations/{conversation['id']}/messages",
        files=_csv_file([(f"word{index}", "") for index in range(word_count)]),
    )
    message = client.get(f"/api/ai/conversations/{conversation['id']}/messages").json()[1]
    assert message["status"] == "ready"
    return conversation["id"], message["id"]


def test_batch_results_are_recorded_in_order_until_done(client, monkeypatch):
    _signup(client, "batches@example.com")
    conversation_id, message_id = _ready_import(client, monkeypatch, word_count=5, batch_size=2)
    url = f"/api/ai/conversations/{conversation_id}/messages/{message_id}/import-result"

    out_of_order = client.patch(url, json={"batch_index": 1, "status": "saved"})
    assert out_of_order.status_code == 409

    first = client.patch(
        url,
        json={
            "batch_index": 0,
            "status": "saved",
            "folder_id": 7,
            "folder_name": "TOEFL",
            "summary": {"created": 2, "assigned": 0, "skipped": 0, "failed": 0, "failed_words": []},
        },
    )
    assert first.status_code == 200
    assert first.json()["status"] == "ready"
    assert len(first.json()["payload"]["results"]) == 1

    second = client.patch(url, json={"batch_index": 1, "status": "saved", "folder_id": 7, "folder_name": "TOEFL"})
    assert second.json()["status"] == "ready"

    third = client.patch(url, json={"batch_index": 2, "status": "saved", "folder_id": 7, "folder_name": "TOEFL"})
    assert third.json()["status"] == "done"
    assert [item["batch_index"] for item in third.json()["payload"]["results"]] == [0, 1, 2]

    assert client.patch(url, json={"batch_index": 3, "status": "saved"}).status_code == 409


def test_cancelling_marks_every_remaining_batch(client, monkeypatch):
    _signup(client, "cancel@example.com")
    conversation_id, message_id = _ready_import(client, monkeypatch, word_count=5, batch_size=2)
    url = f"/api/ai/conversations/{conversation_id}/messages/{message_id}/import-result"

    client.patch(url, json={"batch_index": 0, "status": "saved", "folder_id": 1, "folder_name": "A"})
    cancelled = client.patch(url, json={"batch_index": 1, "status": "cancelled"})

    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "done"
    assert [item["status"] for item in cancelled.json()["payload"]["results"]] == ["saved", "cancelled", "cancelled"]


def test_batch_result_rejects_unknown_status_and_text_messages(client, monkeypatch):
    _signup(client, "invalid@example.com")
    conversation_id, message_id = _ready_import(client, monkeypatch, word_count=1, batch_size=2)
    url = f"/api/ai/conversations/{conversation_id}/messages/{message_id}/import-result"

    assert client.patch(url, json={"batch_index": 0, "status": "maybe"}).status_code == 422

    text_message = client.post(f"/api/ai/conversations/{conversation_id}/messages", data={"content": "hi"}).json()
    text_url = f"/api/ai/conversations/{conversation_id}/messages/{text_message['messages'][1]['id']}/import-result"
    assert client.patch(text_url, json={"batch_index": 0, "status": "saved"}).status_code == 409
