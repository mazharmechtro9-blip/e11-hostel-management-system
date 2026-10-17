"""Knowledge approval and import access boundaries through migrated HTTP APIs."""


def test_owner_approved_knowledge_only_is_publicly_retrievable(backend_api):
    owner = backend_api.login("owner")
    response = owner.post(
        "/api/v1/ai/knowledge",
        json={
            "title": "Bicycle storage policy",
            "content": "Bicycle storage is available in the designated secured basement rack.",
            "approved": False,
        },
    )
    assert response.status_code == 201, response.text
    document_id = response.json()["id"]
    query = {"message": "bicycle secured storage basement rack"}
    before = backend_api.client.post("/api/v1/ai/public-chat", json=query)
    assert before.status_code == 200
    assert "designated secured basement" not in before.json()["answer"]
    approved = owner.patch(f"/api/v1/ai/knowledge/{document_id}", json={"approved": True})
    assert approved.status_code == 200, approved.text
    after = backend_api.client.post("/api/v1/ai/public-chat", json=query)
    assert "designated secured basement" in after.json()["answer"]
    assert after.json()["sources"][0]["document_id"] == document_id
    assert after.json()["mode"] == "deterministic_fallback"
    for role in ("student", "warden", "assistant"):
        account = backend_api.login(role)
        assert account.get("/api/v1/ai/knowledge").status_code == 403
        assert (
            account.post("/api/v1/ai/admin-chat", json={"message": "show revenue"}).status_code
            == 403
        )


def test_import_preview_is_owner_only_and_confirm_requires_explicit_phrase(backend_api):
    csv_text = "full_name,email,phone\nImport Resident,import-resident@example.com,03001234567"
    assistant = backend_api.login("assistant")
    assert (
        assistant.post("/api/v1/imports/students/preview", json={"csv_text": csv_text}).status_code
        == 403
    )
    owner = backend_api.login("owner")
    result = owner.post("/api/v1/imports/students/preview", json={"csv_text": csv_text})
    assert result.status_code == 200, result.text
    preview = result.json()
    assert preview["total"] == 1
    assert preview["errors"] == []
    before = owner.get("/api/v1/students?search=import-resident@example.com").json()
    assert before["total"] == 0
    assert (
        owner.post(
            "/api/v1/imports/students/confirm",
            json={"preview_id": preview["preview_id"], "confirmation": "yes"},
        ).status_code
        == 422
    )
    response = owner.post(
        "/api/v1/imports/students/confirm",
        json={"preview_id": preview["preview_id"], "confirmation": "IMPORT STUDENTS"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["imported"] == 1
    assert (
        owner.post(
            "/api/v1/imports/students/confirm",
            json={"preview_id": preview["preview_id"], "confirmation": "IMPORT STUDENTS"},
        ).status_code
        == 409
    )
