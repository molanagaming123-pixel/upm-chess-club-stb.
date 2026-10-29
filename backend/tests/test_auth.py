from conftest import ADMIN_EMAIL, ADMIN_PW, MEMBER_PW


def test_register_success_and_role_is_member(client):
    r = client.post(
        "/auth/register",
        json={"name": "Budi Santoso", "email": "Budi@Example.com", "password": MEMBER_PW, "nim": "2201001"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["role"] == "member"
    assert body["user"]["email"] == "budi@example.com"  # dinormalisasi huruf kecil
    assert body["access_token"]


def test_register_cannot_escalate_to_admin(client):
    r = client.post(
        "/auth/register",
        json={"name": "Penyusup", "email": "x@example.com", "password": MEMBER_PW, "role": "admin"},
    )
    assert r.status_code == 201
    assert r.json()["user"]["role"] == "member"
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["role"] == "member"


def test_register_duplicate_email_and_nim(client):
    base = {"name": "Satu", "email": "a@example.com", "password": MEMBER_PW, "nim": "123456"}
    assert client.post("/auth/register", json=base).status_code == 201
    assert client.post("/auth/register", json={**base, "nim": "999999"}).status_code == 409
    assert client.post("/auth/register", json={**base, "email": "b@example.com"}).status_code == 409


def test_register_validation(client):
    ok = {"name": "Dua", "email": "d@example.com", "password": MEMBER_PW}
    assert client.post("/auth/register", json={**ok, "email": "bukan-email"}).status_code == 422
    assert client.post("/auth/register", json={**ok, "password": "pendek1"}).status_code == 422
    assert client.post("/auth/register", json={**ok, "password": "hanyahuruf"}).status_code == 422
    assert client.post("/auth/register", json={**ok, "name": " "}).status_code == 422
    assert client.post("/auth/register", json={**ok, "nim": "ab!"}).status_code == 422


def test_login_success_and_failure_messages_are_generic(client, make_member):
    make_member(name="Eka", email="eka@example.com")
    ok = client.post("/auth/login", json={"email": "EKA@example.com", "password": MEMBER_PW})
    assert ok.status_code == 200
    wrong_pw = client.post("/auth/login", json={"email": "eka@example.com", "password": "SalahTotal1"})
    no_user = client.post("/auth/login", json={"email": "tidakada@example.com", "password": MEMBER_PW})
    assert wrong_pw.status_code == no_user.status_code == 401
    assert wrong_pw.json()["detail"] == no_user.json()["detail"]  # tidak membocorkan email terdaftar/tidak


def test_inactive_user_cannot_login(client, make_member):
    make_member(name="Nonaktif", email="off@example.com", status="inactive")
    r = client.post("/auth/login", json={"email": "off@example.com", "password": MEMBER_PW})
    assert r.status_code == 403


def test_me_requires_valid_token(client, admin_h):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer sampah.token.palsu"}).status_code == 401
    r = client.get("/auth/me", headers=admin_h)
    assert r.status_code == 200 and r.json()["role"] == "admin"


def test_logout_endpoint(client, admin_h):
    assert client.post("/auth/logout", headers=admin_h).status_code == 200
    assert client.post("/auth/logout").status_code == 401


def test_password_is_hashed_not_plaintext():
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import User

    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
        assert admin.password_hash != ADMIN_PW
        assert admin.password_hash.startswith("$2")  # bcrypt


def test_deactivated_user_token_is_rejected(client, admin_h, make_member):
    member, headers = make_member(name="Akan Nonaktif")
    assert client.get("/auth/me", headers=headers).status_code == 200
    r = client.patch(f"/members/{member['id']}", json={"status": "inactive"}, headers=admin_h)
    assert r.status_code == 200
    assert client.get("/auth/me", headers=headers).status_code == 403


# ---------- Hak akses (RBAC) di backend ----------
def test_member_cannot_do_admin_operations(client, admin_h, make_member, make_tournament):
    m1, h1 = make_member(name="Anggota Satu")
    m2, _ = make_member(name="Anggota Dua")
    t = make_tournament()

    attempts = [
        client.post("/members", json={"name": "Baru", "email": "n@example.com", "password": MEMBER_PW}, headers=h1),
        client.patch(f"/members/{m2['id']}", json={"name": "Diubah"}, headers=h1),
        client.delete(f"/members/{m2['id']}", headers=h1),
        client.post("/tournaments", json={"name": "Ilegal", "start_date": "2026-01-01", "end_date": "2026-01-02"}, headers=h1),
        client.patch(f"/tournaments/{t['id']}", json={"name": "Diubah"}, headers=h1),
        client.delete(f"/tournaments/{t['id']}", headers=h1),
        client.post(f"/tournaments/{t['id']}/participants", json={"user_id": m2["id"]}, headers=h1),
        client.patch(f"/tournaments/{t['id']}/participants/{m1['id']}", json={"status": "approved"}, headers=h1),
        client.post("/matches", json={"white_id": m1["id"], "black_id": m2["id"], "match_date": "2026-01-01"}, headers=h1),
        client.patch("/matches/1", json={"result": "draw"}, headers=h1),
        client.delete("/matches/1", headers=h1),
    ]
    assert [a.status_code for a in attempts] == [403] * len(attempts)


def test_unauthenticated_requests_are_rejected(client):
    for path in ("/members", "/tournaments", "/matches", "/standings", "/dashboard"):
        assert client.get(path).status_code == 401, path
    assert client.post("/members", json={}).status_code == 401
