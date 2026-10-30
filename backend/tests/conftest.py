import os
import tempfile
from datetime import date, timedelta

# Environment HARUS diatur sebelum `app` di-import.
_TMP = tempfile.mkdtemp(prefix="upm_chess_test_")
# Default SQLite sementara; set TEST_DATABASE_URL untuk menguji terhadap PostgreSQL.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_TMP}/test.db"
os.environ["SECRET_KEY"] = "kunci-rahasia-khusus-pengujian-" + "x" * 32
os.environ["ADMIN_EMAIL"] = "admin@example.com"
os.environ["ADMIN_PASSWORD"] = "AdminPass123"
os.environ["ADMIN_NAME"] = "Admin Uji"
os.environ["BCRYPT_ROUNDS"] = "4"  # hanya untuk mempercepat tes; produksi default 12

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.bootstrap import ensure_admin  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

MEMBER_PW = "Passw0rdOK"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PW = "AdminPass123"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        ensure_admin(db)
    yield


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_h(client):
    r = client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return _auth(r.json()["access_token"])


@pytest.fixture
def make_member(client, admin_h):
    """Buat anggota lewat API admin. Mengembalikan (data_anggota, header_login)."""
    counter = {"n": 0}

    def _make(name="Pemain", email=None, nim=None, status="active"):
        counter["n"] += 1
        email = email or f"pemain{counter['n']}@example.com"
        body = {"name": name, "email": email, "password": MEMBER_PW, "status": status}
        if nim:
            body["nim"] = nim
        r = client.post("/members", json=body, headers=admin_h)
        assert r.status_code == 201, r.text
        member = r.json()
        headers = None
        if status == "active":
            lr = client.post("/auth/login", json={"email": email, "password": MEMBER_PW})
            assert lr.status_code == 200, lr.text
            headers = _auth(lr.json()["access_token"])
        return member, headers

    return _make


@pytest.fixture
def make_tournament(client, admin_h):
    def _make(name="Turnamen Uji", start=None, end=None, status="ongoing"):
        today = date.today()
        body = {
            "name": name,
            "start_date": str(start or today - timedelta(days=30)),
            "end_date": str(end or today + timedelta(days=30)),
            "location": "Aula Kampus",
            "status": status,
        }
        r = client.post("/tournaments", json=body, headers=admin_h)
        assert r.status_code == 201, r.text
        return r.json()

    return _make


@pytest.fixture
def enroll(client, admin_h):
    def _enroll(tournament_id, user_id):
        r = client.post(
            f"/tournaments/{tournament_id}/participants", json={"user_id": user_id}, headers=admin_h
        )
        assert r.status_code == 201, r.text
        return r.json()

    return _enroll


@pytest.fixture
def record(client, admin_h):
    """Catat pertandingan lewat API. Mengembalikan response mentah agar bisa diperiksa."""

    def _record(white, black, result=None, tournament=None, round_no=None, days_ago=1):
        body = {
            "white_id": white,
            "black_id": black,
            "match_date": str(date.today() - timedelta(days=days_ago)),
            "result": result,
        }
        if tournament is not None:
            body["tournament_id"] = tournament
            body["round"] = round_no
        return client.post("/matches", json=body, headers=admin_h)

    return _record
