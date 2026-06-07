import pytest


def test_words_api_lists_creates_updates_and_deletes_words(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "writer@example.com",
            "password": "Password123!",
            "display_name": "Writer",
        },
    )
    assert signup_response.status_code == 201

    list_response = client.get("/api/words")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 5

    create_payload = {
        "word": "ubiquitous",
        "meaning_ko": "어디에나 있는",
        "pronunciation": "/juːˈbɪk.wɪ.təs/",
        "pos": "Adjective",
        "definitions": ["present everywhere"],
        "definitions_ko": ["어디에나 존재하는"],
        "examples": [{"en": "Phones are ubiquitous.", "ko": "휴대폰은 어디에나 있다."}],
        "synonyms": ["omnipresent"],
        "nuance": "common everywhere",
    }

    create_response = client.post("/api/words", json=create_payload)
    assert create_response.status_code == 201
    assert create_response.json()["word"] == "ubiquitous"
    assert create_response.json()["definitions"] == ["present everywhere"]
    assert create_response.json()["definitions_ko"] == ["어디에나 존재하는"]
    assert create_response.json()["examples"] == [
        {"en": "Phones are ubiquitous.", "ko": "휴대폰은 어디에나 있다."}
    ]

    word_id = create_response.json()["id"]

    patch_response = client.patch(
        f"/api/words/{word_id}",
        json={
            "meaning_ko": "널리 퍼진",
            "definitions_ko": ["어디에나 존재하는", "흔한"],
            "stats": {"wrong_count": 2, "review_count": 5},
        },
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["meaning_ko"] == "널리 퍼진"
    assert patch_response.json()["definitions_ko"] == ["어디에나 존재하는", "흔한"]
    assert patch_response.json()["stats"] == {"wrong_count": 2, "review_count": 5}

    delete_response = client.delete(f"/api/words/{word_id}")
    assert delete_response.status_code == 204

    final_list_response = client.get("/api/words")
    assert final_list_response.status_code == 200
    assert all(word["id"] != word_id for word in final_list_response.json())


def test_words_are_scoped_to_the_authenticated_user(client):
    first_signup = client.post(
        "/api/auth/signup",
        json={
            "email": "first@example.com",
            "password": "Password123!",
            "display_name": "First",
        },
    )
    assert first_signup.status_code == 201
    first_cookie = first_signup.cookies.get("vocaloop_session")
    assert first_cookie

    first_word_response = client.post(
        "/api/words",
        json={"word": "alpha", "definitions": ["first user word"]},
    )
    assert first_word_response.status_code == 201
    first_word_id = first_word_response.json()["id"]

    client.cookies.clear()

    second_signup = client.post(
        "/api/auth/signup",
        json={
            "email": "second@example.com",
            "password": "Password123!",
            "display_name": "Second",
        },
    )
    assert second_signup.status_code == 201

    second_word_response = client.post(
        "/api/words",
        json={"word": "beta", "definitions": ["second user word"]},
    )
    assert second_word_response.status_code == 201
    second_word_id = second_word_response.json()["id"]

    second_list_response = client.get("/api/words")
    assert second_list_response.status_code == 200
    second_words = second_list_response.json()
    assert any(word["word"] == "beta" for word in second_words)
    assert all(word["word"] != "alpha" for word in second_words)

    client.cookies.clear()
    client.cookies.set("vocaloop_session", first_cookie)

    forbidden_patch = client.patch(f"/api/words/{second_word_id}", json={"meaning_ko": "should fail"})
    assert forbidden_patch.status_code == 404

    forbidden_delete = client.delete(f"/api/words/{second_word_id}")
    assert forbidden_delete.status_code == 404

    own_delete = client.delete(f"/api/words/{first_word_id}")
    assert own_delete.status_code == 204


@pytest.mark.parametrize(
    ("payload", "expected_field"),
    [
        ({"word": "   "}, "word"),
        ({"word": "alpha", "meaning_ko": 1}, "meaning_ko"),
        ({"word": "alpha", "definitions": ["meaning", "   "]}, "definitions"),
        ({"word": "alpha", "definitions_ko": ["의미", ""]}, "definitions_ko"),
        ({"word": "alpha", "synonyms": ["related", " "]}, "synonyms"),
        ({"word": "alpha", "learning_rate": -1}, "learning_rate"),
        ({"word": "alpha", "stats": {"wrong_count": 1}}, "stats"),
        ({"word": "alpha", "examples": [{"en": "Only english"}]}, "examples"),
        ({"word": "alpha", "examples": [{"en": "   ", "ko": "한국어"}]}, "examples"),
        ({"word": "alpha", "examples": [{"en": "English", "ko": "   "}]},"examples"),
    ],
)
def test_words_reject_invalid_payloads(client, payload, expected_field):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "validator@example.com",
            "password": "Password123!",
            "display_name": "Validator",
        },
    )
    assert signup_response.status_code == 201

    response = client.post("/api/words", json=payload)
    assert response.status_code == 422
    assert expected_field in response.text


def test_words_reject_null_stats_patch(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "stats-null@example.com",
            "password": "Password123!",
            "display_name": "Stats Null",
        },
    )
    assert signup_response.status_code == 201

    create_response = client.post("/api/words", json={"word": "alpha"})
    assert create_response.status_code == 201
    word_id = create_response.json()["id"]

    patch_response = client.patch(f"/api/words/{word_id}", json={"stats": None})
    assert patch_response.status_code == 422
    assert "stats" in patch_response.text


def test_words_patch_normalizes_optional_text_fields(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "normalize@example.com",
            "password": "Password123!",
            "display_name": "Normalize",
        },
    )
    assert signup_response.status_code == 201

    create_response = client.post(
        "/api/words",
        json={"word": "alpha", "meaning_ko": "initial", "nuance": "start"},
    )
    assert create_response.status_code == 201
    word_id = create_response.json()["id"]

    patch_response = client.patch(
        f"/api/words/{word_id}",
        json={
            "meaning_ko": "   ",
            "pronunciation": "  /alpha/  ",
            "pos": "  Noun  ",
            "nuance": "\t",
        },
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["meaning_ko"] is None
    assert patch_response.json()["pronunciation"] == "/alpha/"
    assert patch_response.json()["pos"] == "Noun"
    assert patch_response.json()["nuance"] is None


def test_words_reject_foreign_folder_ids_and_missing_folders(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "owner@example.com",
            "password": "Password123!",
            "display_name": "Owner",
        },
    )
    assert signup_response.status_code == 201

    from app.auth import hash_password
    from app.db import SessionLocal
    from app.models import Folder, User

    with SessionLocal() as session:
        foreign_user = User(
            email="foreign-folder@example.com",
            display_name="Foreign",
            password_hash=hash_password("Password123!"),
        )
        session.add(foreign_user)
        session.flush()
        foreign_folder = Folder(user_id=foreign_user.id, name="Foreign Folder")
        session.add(foreign_folder)
        session.commit()
        session.refresh(foreign_folder)
        foreign_folder_id = foreign_folder.id

    missing_folder_response = client.post(
        "/api/words",
        json={"word": "alpha", "folder_id": foreign_folder_id + 9999},
    )
    assert missing_folder_response.status_code == 404
    assert missing_folder_response.json()["detail"] == "Folder not found"

    create_response = client.post(
        "/api/words",
        json={"word": "alpha", "folder_id": foreign_folder_id},
    )
    assert create_response.status_code == 404
    assert create_response.json()["detail"] == "Folder not found"

    own_word_response = client.post("/api/words", json={"word": "beta"})
    assert own_word_response.status_code == 201
    own_word_id = own_word_response.json()["id"]

    patch_response = client.patch(
        f"/api/words/{own_word_id}",
        json={"folder_id": foreign_folder_id},
    )
    assert patch_response.status_code == 404
    assert patch_response.json()["detail"] == "Folder not found"


def test_words_can_belong_to_multiple_folders(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "multi-folder@example.com",
            "password": "Password123!",
            "display_name": "Multi Folder",
        },
    )
    assert signup_response.status_code == 201

    first_folder_response = client.post("/api/folders", json={"name": "TOEFL"})
    second_folder_response = client.post("/api/folders", json={"name": "SAT"})
    assert first_folder_response.status_code == 201
    assert second_folder_response.status_code == 201
    first_folder_id = first_folder_response.json()["id"]
    second_folder_id = second_folder_response.json()["id"]

    create_response = client.post(
        "/api/words",
        json={"word": "abate", "folder_ids": [first_folder_id]},
    )
    assert create_response.status_code == 201
    created_word = create_response.json()
    assert created_word["folder_id"] == first_folder_id
    assert created_word["folder_ids"] == [first_folder_id]

    patch_response = client.patch(
        f"/api/words/{created_word['id']}",
        json={"folder_ids": [first_folder_id, second_folder_id]},
    )
    assert patch_response.status_code == 200
    updated_word = patch_response.json()
    assert updated_word["folder_id"] == first_folder_id
    assert updated_word["folder_ids"] == [first_folder_id, second_folder_id]

    list_response = client.get("/api/words")
    assert list_response.status_code == 200
    listed_word = next(word for word in list_response.json() if word["id"] == created_word["id"])
    assert listed_word["folder_ids"] == [first_folder_id, second_folder_id]


def test_words_return_404_for_missing_word_ids(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "missing@example.com",
            "password": "Password123!",
            "display_name": "Missing",
        },
    )
    assert signup_response.status_code == 201

    patch_response = client.patch("/api/words/999999", json={"meaning_ko": "nope"})
    assert patch_response.status_code == 404
    assert patch_response.json()["detail"] == "Word not found"

    delete_response = client.delete("/api/words/999999")
    assert delete_response.status_code == 404
    assert delete_response.json()["detail"] == "Word not found"
