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


def test_toefl_attempts_create_review_items_and_track_mastery(client):
    _signup(client, "review-owner@example.com")

    asset_response = client.post(
        "/api/toefl/assets",
        json={
            "mode": "toefl-daily-life",
            "taskType": "daily-life",
            "title": "Campus Schedule",
            "payload": {
                "taskType": "daily-life",
                "title": "Campus Schedule",
                "stimulus": "The workshop moved from Monday to Wednesday.",
                "topicTags": ["campus"],
                "questions": [
                    {
                        "id": "q1",
                        "prompt": "When is the workshop?",
                        "options": ["Monday", "Wednesday", "Friday"],
                        "answerIndex": 1,
                        "skillTag": "detail",
                        "explanationKo": "문장 끝의 moved from Monday to Wednesday가 근거입니다.",
                    },
                    {
                        "id": "q2",
                        "prompt": "What changed?",
                        "options": ["Location", "Time", "Topic"],
                        "answerIndex": 1,
                        "skillTag": "inference",
                    },
                ],
            },
            "metadata": {"targetScore": 100, "questionCount": 2},
        },
    )
    assert asset_response.status_code == 201
    asset = asset_response.json()

    attempt_response = client.post(
        f"/api/toefl/assets/{asset['id']}/attempts",
        json={
            "answers": {"selectedOptions": [{"questionId": "q1", "selectedIndex": 0}]},
            "results": {
                "items": [
                    {"questionId": "q1", "selectedIndex": 0, "answerIndex": 1, "correct": False, "skillTag": "detail"},
                    {"questionId": "q2", "selectedIndex": 1, "answerIndex": 1, "correct": True, "skillTag": "inference"},
                ]
            },
            "correctCount": 1,
            "totalCount": 2,
            "score": {"accuracy": 50},
        },
    )
    assert attempt_response.status_code == 201

    today_response = client.get("/api/toefl/review-items?scope=today")
    assert today_response.status_code == 200
    items = today_response.json()
    assert len(items) == 1
    assert items[0]["title"] == "Campus Schedule"
    assert items[0]["prompt"] == "When is the workshop?"
    assert items[0]["userAnswer"] == "Monday"
    assert items[0]["correctAnswer"] == "Wednesday"
    assert items[0]["status"] == "new"
    assert items[0]["skillTag"] == "detail"

    item_id = items[0]["id"]
    first_review = client.patch(f"/api/toefl/review-items/{item_id}", json={"result": "correct"})
    assert first_review.status_code == 200
    assert first_review.json()["status"] == "reviewing"
    assert first_review.json()["successStreak"] == 1

    client.patch(f"/api/toefl/review-items/{item_id}", json={"result": "correct"})
    mastered_response = client.patch(f"/api/toefl/review-items/{item_id}", json={"result": "correct"})
    assert mastered_response.status_code == 200
    mastered = mastered_response.json()
    assert mastered["status"] == "mastered"
    assert mastered["successStreak"] == 3

    mastered_list_response = client.get("/api/toefl/review-items?scope=mastered")
    assert mastered_list_response.status_code == 200
    assert [item["id"] for item in mastered_list_response.json()] == [item_id]

    _signup(client, "review-other@example.com")
    isolated_response = client.get("/api/toefl/review-items?scope=all")
    assert isolated_response.status_code == 200
    assert isolated_response.json() == []
