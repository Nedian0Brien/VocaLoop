def _create_toefl_asset(client, payload):
    response = client.post("/api/toefl/assets", json=payload)
    assert response.status_code == 201
    return response.json()


def _create_toefl_attempt(client, asset_id, payload):
    response = client.post(f"/api/toefl/assets/{asset_id}/attempts", json=payload)
    assert response.status_code == 201
    return response.json()


def _list_review_items(client):
    response = client.get("/api/toefl/review-items?scope=all&limit=200")
    assert response.status_code == 200
    return response.json()


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

    all_response = client.get("/api/toefl/review-items?scope=all&limit=200")
    assert all_response.status_code == 200
    assert len(all_response.json()) == 1

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


def test_complete_word_attempt_creates_review_item(client):
    _signup(client, "complete-review@example.com")

    asset = _create_toefl_asset(client, {
        "mode": "toefl-complete",
        "taskType": "complete-word",
        "title": "Complete Words",
        "payload": {
            "questions": [
                {
                    "paragraph": "The campus event was post____.",
                    "blanks": [{"answer": "poned"}],
                }
            ],
        },
    })

    _create_toefl_attempt(client, asset["id"], {
        "answers": {"blanks": [[["p", "o", "s", "t"]]]},
        "results": {"questions": [{"questionIndex": 0, "correctCount": 0, "total": 1}]},
        "correctCount": 0,
        "totalCount": 1,
        "score": {"accuracy": 0},
    })

    items = _list_review_items(client)
    assert len(items) == 1
    assert items[0]["mode"] == "toefl-complete"
    assert items[0]["skillTag"] == "complete-words"
    assert items[0]["correctAnswer"] == "poned"


def test_build_sentence_attempt_creates_review_item(client):
    _signup(client, "build-review@example.com")

    asset = _create_toefl_asset(client, {
        "mode": "toefl-build",
        "taskType": "build-sentence",
        "title": "Build Sentence",
        "payload": {"questions": []},
    })

    _create_toefl_attempt(client, asset["id"], {
        "answers": {"attempts": ["because was it postponed"]},
        "results": {
            "questions": [
                {
                    "questionIndex": 0,
                    "correct": False,
                    "attempt": "because was it postponed",
                    "target": "because it was postponed",
                }
            ]
        },
        "correctCount": 0,
        "totalCount": 1,
        "score": {"accuracy": 0},
    })

    items = _list_review_items(client)
    assert len(items) == 1
    assert items[0]["mode"] == "toefl-build"
    assert items[0]["skillTag"] == "build-sentence"
    assert items[0]["userAnswer"] == "because was it postponed"


def test_writing_attempts_create_review_items(client):
    _signup(client, "writing-review@example.com")

    email_asset = _create_toefl_asset(client, {
        "mode": "toefl-writing-email",
        "taskType": "email",
        "title": "Email Writing",
        "payload": {
            "task": {
                "taskType": "email",
                "situation": "Ask a professor about an extension.",
                "requirements": ["explain reason", "request one extra day"],
            }
        },
    })
    _create_toefl_attempt(client, email_asset["id"], {
        "answers": {"response": "I need more time."},
        "results": {"feedback": {"score": 2, "feedbackKo": "요구사항을 더 구체적으로 답하세요."}},
        "correctCount": 0,
        "totalCount": 1,
        "score": {"practiceScore": 2},
    })

    mock_asset = _create_toefl_asset(client, {
        "mode": "toefl-writing-mock",
        "taskType": "writing-mock",
        "title": "Writing Mock",
        "payload": {
            "section": {
                "emailTask": {
                    "taskType": "email",
                    "situation": "Ask about a club meeting.",
                    "requirements": ["ask time"],
                },
                "discussionTask": {
                    "taskType": "discussion",
                    "course": "Business",
                    "professorQuestion": "Should companies sponsor campus events?",
                    "studentPosts": ["Yes, it helps.", "No, it distracts."],
                },
            }
        },
    })
    _create_toefl_attempt(client, mock_asset["id"], {
        "answers": {
            "emailResponse": "When meeting?",
            "discussionResponse": "I agree because useful.",
        },
        "results": {"feedback": {"feedbackKo": "근거와 전개가 부족합니다."}},
        "correctCount": 0,
        "totalCount": 2,
        "score": {"emailScore": 2, "discussionScore": 2},
    })

    items = _list_review_items(client)
    skill_tags = {item["skillTag"] for item in items}
    assert {"email", "discussion"}.issubset(skill_tags)
    assert any(item["mode"] == "toefl-writing-email" and item["skillTag"] == "email" for item in items)
    assert any(item["mode"] == "toefl-writing-mock" and item["skillTag"] == "discussion" for item in items)
