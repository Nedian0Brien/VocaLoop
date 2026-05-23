import subprocess
from pathlib import Path


def test_codex_generation_requires_authentication(client):
    response = client.post(
        "/api/ai/codex",
        json={
            "model": "gpt-5.3-codex-spark",
            "prompt": "Return ok.",
            "jsonOutput": False,
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_codex_generation_invokes_cli_with_spark_model(client, monkeypatch):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "codex-ai@example.com",
            "password": "Password123!",
            "display_name": "Codex AI",
        },
    )
    assert signup_response.status_code == 201

    from app.routes import ai as ai_route

    captured = {}

    def fake_run(args, input, text, capture_output, timeout, check, cwd, env):  # noqa: A002
        captured["args"] = args
        captured["input"] = input
        captured["timeout"] = timeout
        captured["cwd"] = cwd
        output_path = Path(args[args.index("--output-last-message") + 1])
        output_path.write_text('{"word":"cat"}', encoding="utf-8")
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(ai_route.subprocess, "run", fake_run)

    response = client.post(
        "/api/ai/codex",
        json={
            "model": "gpt-5.3-codex-spark",
            "prompt": "Return JSON for cat.",
            "jsonOutput": True,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"text": '{"word":"cat"}'}
    assert captured["args"][:2] == ["codex", "exec"]
    assert captured["args"][captured["args"].index("-m") + 1] == "gpt-5.3-codex-spark"
    assert "--json" in captured["args"]
    assert "--ephemeral" in captured["args"]
    assert "--skip-git-repo-check" in captured["args"]
    assert captured["args"][captured["args"].index("--sandbox") + 1] == "read-only"
    assert "Return JSON for cat." in captured["input"]
    assert "valid JSON only" in captured["input"]


def test_codex_generation_rejects_unknown_model(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "codex-model@example.com",
            "password": "Password123!",
            "display_name": "Codex Model",
        },
    )
    assert signup_response.status_code == 201

    response = client.post(
        "/api/ai/codex",
        json={
            "model": "gemini-3-flash-preview",
            "prompt": "Return ok.",
            "jsonOutput": False,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid Codex model"
