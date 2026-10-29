"""Persistensi: data harus tetap ada setelah koneksi database ditutup & dibuka lagi,
meniru backend yang dimulai ulang. (Uji restart proses uvicorn sungguhan ada di README / langkah manual.)"""
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from app.database import engine
from app.models import Match, User


def test_data_survives_engine_restart(client, make_member, record):
    a, _ = make_member(name="Andi")
    b, _ = make_member(name="Budi")
    assert record(a["id"], b["id"], "white_win").status_code == 201

    url = str(engine.url)
    engine.dispose()  # tutup semua koneksi
    fresh = create_engine(url)  # engine baru = "proses baru"
    with sessionmaker(bind=fresh)() as db:
        assert db.scalar(select(func.count()).select_from(Match)) == 1
        names = set(db.scalars(select(User.name)))
        assert {"Andi", "Budi"} <= names
    fresh.dispose()

    # aplikasi tetap bisa melayani setelah dispose
    from conftest import ADMIN_EMAIL, ADMIN_PW

    r = client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert len(client.get("/matches", headers=h).json()) == 1
