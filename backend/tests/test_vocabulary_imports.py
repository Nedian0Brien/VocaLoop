import io
import subprocess
from pathlib import Path


def _png_bytes(payload: bytes = b"") -> bytes:
    return b"\x89PNG\r\n\x1a\n" + payload


def _signup(client, email: str = "screenshot-import@example.com"):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": email,
            "password": "Password123!",
            "display_name": "Screenshot Import",
        },
    )
    assert response.status_code == 201
    return response


def test_screenshot_extraction_requires_authentication(client):
    response = client.post(
        "/api/vocabulary-imports/screenshot/extract",
        files={"file": ("words.png", io.BytesIO(_png_bytes(b"words")), "image/png")},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_screenshot_extraction_rejects_non_image(client):
    _signup(client, "screenshot-non-image@example.com")

    response = client.post(
        "/api/vocabulary-imports/screenshot/extract",
        files={"file": ("words.txt", io.BytesIO(b"abate"), "text/plain")},
    )

    assert response.status_code == 422
    assert "image" in response.text.lower()


def test_screenshot_extraction_invokes_codex_with_image_and_normalizes_words(client, monkeypatch):
    _signup(client, "screenshot-happy@example.com")

    from app.routes import vocabulary_imports

    captured = {}

    def fake_run(args, input, text, capture_output, timeout, check, cwd, env):  # noqa: A002
        captured["args"] = args
        captured["input"] = input
        captured["timeout"] = timeout
        captured["cwd"] = cwd
        image_path = Path(args[args.index("--image") + 1])
        assert image_path.exists()
        output_path = Path(args[args.index("--output-last-message") + 1])
        output_path.write_text(
            '{"words":[" Abate ","abate","candid","123"],"suggested_folder_name":" TOEFL "}',
            encoding="utf-8",
        )
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(vocabulary_imports.subprocess, "run", fake_run)
    monkeypatch.setenv("CODEX_BIN", "/opt/codex/bin/codex")

    response = client.post(
        "/api/vocabulary-imports/screenshot/extract",
        files={"file": ("words.png", io.BytesIO(_png_bytes(b"words")), "image/png")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "words": ["Abate", "candid"],
        "suggested_folder_name": "TOEFL",
    }
    assert captured["args"][:2] == ["/opt/codex/bin/codex", "exec"]
    assert "--image" in captured["args"]
    assert captured["args"][captured["args"].index("-m") + 1] == "gpt-5.3-codex-spark"
    assert "Return JSON only" in captured["input"]
    assert "Do not guess unclear text" in captured["input"]


def test_screenshot_extraction_does_not_create_words_or_folders(client, monkeypatch):
    _signup(client, "screenshot-no-db-write@example.com")

    from app.db import SessionLocal
    from app.models import Folder, Word
    from app.routes import vocabulary_imports

    with SessionLocal() as session:
        before_word_count = session.query(Word).count()
        before_folder_count = session.query(Folder).count()

    def fake_run(args, input, text, capture_output, timeout, check, cwd, env):  # noqa: A002
        output_path = Path(args[args.index("--output-last-message") + 1])
        output_path.write_text('{"words":["abate"],"suggested_folder_name":"TOEFL"}', encoding="utf-8")
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(vocabulary_imports.subprocess, "run", fake_run)

    response = client.post(
        "/api/vocabulary-imports/screenshot/extract",
        files={"file": ("words.png", io.BytesIO(_png_bytes(b"words")), "image/png")},
    )

    assert response.status_code == 200
    with SessionLocal() as session:
        assert session.query(Word).count() == before_word_count
        assert session.query(Folder).count() == before_folder_count


def test_screenshot_extraction_rejects_empty_results(client, monkeypatch):
    _signup(client, "screenshot-empty@example.com")

    from app.routes import vocabulary_imports

    def fake_run(args, input, text, capture_output, timeout, check, cwd, env):  # noqa: A002
        output_path = Path(args[args.index("--output-last-message") + 1])
        output_path.write_text('{"words":["","123"],"suggested_folder_name":"   "}', encoding="utf-8")
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(vocabulary_imports.subprocess, "run", fake_run)

    response = client.post(
        "/api/vocabulary-imports/screenshot/extract",
        files={"file": ("words.png", io.BytesIO(_png_bytes(b"words")), "image/png")},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "No words found in the image"


def test_screenshot_extraction_rejects_invalid_codex_json(client, monkeypatch):
    _signup(client, "screenshot-invalid-json@example.com")

    from app.routes import vocabulary_imports

    def fake_run(args, input, text, capture_output, timeout, check, cwd, env):  # noqa: A002
        output_path = Path(args[args.index("--output-last-message") + 1])
        output_path.write_text("not json", encoding="utf-8")
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(vocabulary_imports.subprocess, "run", fake_run)

    response = client.post(
        "/api/vocabulary-imports/screenshot/extract",
        files={"file": ("words.png", io.BytesIO(_png_bytes(b"words")), "image/png")},
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "Codex returned invalid JSON."


def test_screenshot_extraction_reports_codex_timeout(client, monkeypatch):
    _signup(client, "screenshot-timeout@example.com")

    from app.routes import vocabulary_imports

    def fake_run(args, input, text, capture_output, timeout, check, cwd, env):  # noqa: A002
        raise subprocess.TimeoutExpired(cmd=args, timeout=timeout)

    monkeypatch.setattr(vocabulary_imports.subprocess, "run", fake_run)

    response = client.post(
        "/api/vocabulary-imports/screenshot/extract",
        files={"file": ("words.png", io.BytesIO(_png_bytes(b"words")), "image/png")},
    )

    assert response.status_code == 504
    assert "timed out" in response.json()["detail"]
