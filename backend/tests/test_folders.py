def test_authenticated_user_can_list_create_update_delete_and_reorder_folders(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "folder-owner@example.com",
            "password": "Password123!",
            "display_name": "Folder Owner",
        },
    )
    assert signup_response.status_code == 201

    list_response = client.get("/api/folders")
    assert list_response.status_code == 200
    assert list_response.json() == []

    first_create_response = client.post(
        "/api/folders",
        json={"name": "Academic", "color": "#2563EB", "icon": "book-open"},
    )
    assert first_create_response.status_code == 201
    assert first_create_response.json()["name"] == "Academic"
    assert first_create_response.json()["color"] == "#2563EB"
    assert first_create_response.json()["icon"] == "book-open"
    first_folder_id = first_create_response.json()["id"]

    second_create_response = client.post(
        "/api/folders",
        json={"name": "Travel", "color": "#10B981"},
    )
    assert second_create_response.status_code == 201
    second_folder_id = second_create_response.json()["id"]

    update_response = client.patch(
        f"/api/folders/{first_folder_id}",
        json={"name": "Academic English", "icon": "graduation-cap"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Academic English"
    assert update_response.json()["icon"] == "graduation-cap"

    reorder_response = client.post(
        "/api/folders/reorder",
        json={"folder_ids": [second_folder_id, first_folder_id]},
    )
    assert reorder_response.status_code == 200

    reordered_list_response = client.get("/api/folders")
    assert reordered_list_response.status_code == 200
    assert [folder["id"] for folder in reordered_list_response.json()] == [
        second_folder_id,
        first_folder_id,
    ]
    assert [folder["order"] for folder in reordered_list_response.json()] == [0, 1]

    delete_response = client.delete(f"/api/folders/{first_folder_id}")
    assert delete_response.status_code == 204

    final_list_response = client.get("/api/folders")
    assert final_list_response.status_code == 200
    assert [folder["id"] for folder in final_list_response.json()] == [second_folder_id]


def test_delete_folder_can_keep_or_remove_words(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "folder-delete-choice@example.com",
            "password": "Password123!",
            "display_name": "Folder Delete Choice",
        },
    )
    assert signup_response.status_code == 201

    keep_folder_response = client.post("/api/folders", json={"name": "Keep Source"})
    fallback_folder_response = client.post("/api/folders", json={"name": "Fallback"})
    remove_folder_response = client.post("/api/folders", json={"name": "Remove Source"})
    assert keep_folder_response.status_code == 201
    assert fallback_folder_response.status_code == 201
    assert remove_folder_response.status_code == 201
    keep_folder_id = keep_folder_response.json()["id"]
    fallback_folder_id = fallback_folder_response.json()["id"]
    remove_folder_id = remove_folder_response.json()["id"]

    kept_word_response = client.post(
        "/api/words",
        json={"word": "abate", "folder_ids": [keep_folder_id, fallback_folder_id]},
    )
    removed_word_response = client.post(
        "/api/words",
        json={"word": "candid", "folder_ids": [remove_folder_id, fallback_folder_id]},
    )
    assert kept_word_response.status_code == 201
    assert removed_word_response.status_code == 201
    kept_word_id = kept_word_response.json()["id"]
    removed_word_id = removed_word_response.json()["id"]

    keep_delete_response = client.delete(f"/api/folders/{keep_folder_id}")
    assert keep_delete_response.status_code == 204
    words_after_keep = client.get("/api/words").json()
    kept_word = next(word for word in words_after_keep if word["id"] == kept_word_id)
    assert kept_word["folder_id"] == fallback_folder_id
    assert kept_word["folder_ids"] == [fallback_folder_id]
    assert any(word["id"] == removed_word_id for word in words_after_keep)

    remove_delete_response = client.delete(f"/api/folders/{remove_folder_id}?delete_words=true")
    assert remove_delete_response.status_code == 204
    words_after_remove = client.get("/api/words").json()
    assert any(word["id"] == kept_word_id for word in words_after_remove)
    assert all(word["id"] != removed_word_id for word in words_after_remove)


def test_folders_are_scoped_to_the_authenticated_user(client):
    first_signup = client.post(
        "/api/auth/signup",
        json={
            "email": "first-folder-owner@example.com",
            "password": "Password123!",
            "display_name": "First Owner",
        },
    )
    assert first_signup.status_code == 201

    own_folder_response = client.post("/api/folders", json={"name": "Own Folder"})
    assert own_folder_response.status_code == 201
    own_folder_id = own_folder_response.json()["id"]

    from app.db import SessionLocal
    from app.auth import hash_password
    from app.models import Folder, User

    with SessionLocal() as session:
        foreign_user = User(
            email="foreign-folder-owner@example.com",
            display_name="Foreign Owner",
            password_hash=hash_password("Password123!"),
        )
        session.add(foreign_user)
        session.flush()
        foreign_folder = Folder(user_id=foreign_user.id, name="Foreign Folder")
        session.add(foreign_folder)
        session.commit()
        session.refresh(foreign_folder)
        foreign_folder_id = foreign_folder.id

    client.cookies.clear()

    second_signup = client.post(
        "/api/auth/signup",
        json={
            "email": "second-folder-owner@example.com",
            "password": "Password123!",
            "display_name": "Second Owner",
        },
    )
    assert second_signup.status_code == 201

    second_list_response = client.get("/api/folders")
    assert second_list_response.status_code == 200
    assert all(folder["id"] != own_folder_id for folder in second_list_response.json())
    assert all(folder["id"] != foreign_folder_id for folder in second_list_response.json())

    forbidden_update = client.patch(
        f"/api/folders/{own_folder_id}",
        json={"name": "Should Not Work"},
    )
    assert forbidden_update.status_code == 404
    assert forbidden_update.json()["detail"] == "Folder not found"

    forbidden_delete = client.delete(f"/api/folders/{foreign_folder_id}")
    assert forbidden_delete.status_code == 404
    assert forbidden_delete.json()["detail"] == "Folder not found"

    forbidden_reorder = client.post(
        "/api/folders/reorder",
        json={"folder_ids": [foreign_folder_id, own_folder_id]},
    )
    assert forbidden_reorder.status_code == 404
    assert forbidden_reorder.json()["detail"] == "Folder not found"
