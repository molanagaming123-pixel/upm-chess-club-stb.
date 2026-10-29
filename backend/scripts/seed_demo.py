"""Mengisi database dengan DATA UJI untuk keperluan demo/presentasi.

PENTING: ini BUKAN data klub yang sebenarnya. Semua nama diawali "[UJI]" dan nama turnamen
diawali "[DATA UJI]" supaya tidak tertukar dengan data nyata. Skrip hanya jalan jika
dipanggil manual dan menolak berjalan bila sudah ada anggota di database.

Jalankan dari folder backend:   python -m scripts.seed_demo
Hapus data uji:                 hapus file upm_chess.db lalu jalankan backend lagi.
Semua akun uji memakai password: DemoUji123
"""
import sys
from datetime import date, timedelta

from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine
from app.models import (
    REG_APPROVED,
    ROLE_MEMBER,
    USER_ACTIVE,
    Match,
    Tournament,
    TournamentParticipant,
    User,
)
from app.security import hash_password

DEMO_PASSWORD = "DemoUji123"
NAMES = ["Andi Pratama", "Budi Santoso", "Citra Lestari", "Dewi Anggraini", "Eko Wijaya", "Fajar Nugroho"]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        existing = db.scalar(select(func.count()).select_from(User).where(User.role == ROLE_MEMBER))
        if existing:
            print(f"Dibatalkan: sudah ada {existing} anggota. Seed hanya untuk database kosong.")
            sys.exit(1)

        today = date.today()
        users = []
        for i, name in enumerate(NAMES, start=1):
            u = User(
                name=f"[UJI] {name}",
                email=f"uji{i}@example.com",
                nim=f"UJI{i:04d}",
                password_hash=hash_password(DEMO_PASSWORD),
                role=ROLE_MEMBER,
                status=USER_ACTIVE,
                joined_at=today - timedelta(days=90),
            )
            db.add(u)
            users.append(u)
        db.flush()

        t = Tournament(
            name="[DATA UJI] Turnamen Contoh Semester Ini",
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=10),
            location="Ruang Serbaguna (data uji)",
            description="Data uji untuk demo aplikasi. Bukan turnamen sebenarnya.",
            status="ongoing",
        )
        upcoming = Tournament(
            name="[DATA UJI] Turnamen Mendatang",
            start_date=today + timedelta(days=20),
            end_date=today + timedelta(days=21),
            location="Aula (data uji)",
            description="Data uji: dipakai untuk mencoba pendaftaran anggota.",
            status="upcoming",
        )
        db.add_all([t, upcoming])
        db.flush()
        for u in users:
            db.add(TournamentParticipant(tournament_id=t.id, user_id=u.id, status=REG_APPROVED))

        # Ronde 1 & 2 (round-robin sebagian): (putih, hitam, hasil, hari_lalu)
        plan = [
            (0, 1, "white_win", 8, 1), (2, 3, "draw", 8, 1), (4, 5, "black_win", 8, 1),
            (0, 2, "draw", 5, 2), (1, 4, "white_win", 5, 2), (3, 5, "white_win", 5, 2),
        ]
        for w, b, res, days_ago, rnd in plan:
            db.add(Match(tournament_id=t.id, round=rnd, white_id=users[w].id, black_id=users[b].id,
                         result=res, match_date=today - timedelta(days=days_ago)))
        # satu pertandingan persahabatan
        db.add(Match(white_id=users[1].id, black_id=users[2].id, result="draw", match_date=today - timedelta(days=3)))
        # satu pertandingan terjadwal (belum ada hasil)
        db.add(Match(tournament_id=t.id, round=3, white_id=users[0].id, black_id=users[3].id, result=None,
                     match_date=today + timedelta(days=2)))
        db.commit()
        print("Data uji dibuat: 6 anggota [UJI], 2 turnamen [DATA UJI], 8 pertandingan.")
        print(f"Login anggota uji: uji1@example.com ... uji6@example.com / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
