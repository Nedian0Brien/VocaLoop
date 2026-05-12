def _signup(client, email):
    return client.post(
        "/api/auth/signup",
        json={
            "email": email,
            "password": "Password123!",
            "display_name": "TOEFL User",
        },
    )


def test_toefl_assets_are_saved_listed_and_attempted_per_user(client):
    _signup(client, "asset-owner@example.com")

    payload = {
        "mode": "toefl-daily-life",
        "taskType": "daily-life",
        "title": "Campus Notice",
        "payload": {
            "taskType": "daily-life",
            "title": "Campus Notice",
            "stimulus": "The library will close early.",
            "questions": [
                {
                    "id": 1,
                    "prompt": "What will happen?",
                    "options": ["Close early", "Open late"],
                    "answerIndex": 0,
                }
            ],
        },
        "metadata": {"targetScore": 100, "questionCount": 1},
    }

    create_response = client.post("/api/toefl/assets", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["id"] > 0
    assert created["mode"] == "toefl-daily-life"
    assert created["taskType"] == "daily-life"
    assert created["payload"]["title"] == "Campus Notice"
    assert created["metadata"]["targetScore"] == 100

    list_response = client.get("/api/toefl/assets")
    assert list_response.status_code == 200
    assets = list_response.json()
    assert len(assets) == 1
    assert assets[0]["id"] == created["id"]

    read_response = client.get(f"/api/toefl/assets/{created['id']}")
    assert read_response.status_code == 200
    assert read_response.json()["id"] == created["id"]

    attempt_response = client.post(
        f"/api/toefl/assets/{created['id']}/attempts",
        json={
            "answers": {"1": 0},
            "results": {"items": [{"id": 1, "correct": True}]},
            "correctCount": 1,
            "totalCount": 1,
            "score": {"accuracy": 100},
        },
    )
    assert attempt_response.status_code == 201
    attempt = attempt_response.json()
    assert attempt["assetId"] == created["id"]
    assert attempt["correctCount"] == 1
    assert attempt["totalCount"] == 1
    assert attempt["score"]["accuracy"] == 100

    _signup(client, "asset-other@example.com")
    second_list_response = client.get("/api/toefl/assets")
    assert second_list_response.status_code == 200
    assert second_list_response.json() == []

    forbidden_read = client.get(f"/api/toefl/assets/{created['id']}")
    assert forbidden_read.status_code == 404

    forbidden_attempt = client.post(
        f"/api/toefl/assets/{created['id']}/attempts",
        json={"correctCount": 0, "totalCount": 1},
    )
    assert forbidden_attempt.status_code == 404


def test_toefl_assets_reject_invalid_payloads(client):
    _signup(client, "asset-invalid@example.com")

    response = client.post(
        "/api/toefl/assets",
        json={
            "mode": " ",
            "title": "",
            "payload": {},
        },
    )

    assert response.status_code == 422
